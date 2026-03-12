package com.mercotrace.web.rest;

import com.mercotrace.domain.Role;
import com.mercotrace.domain.Trader;
import com.mercotrace.domain.User;
import com.mercotrace.domain.UserRole;
import com.mercotrace.domain.UserTrader;
import com.mercotrace.repository.RoleRepository;
import com.mercotrace.repository.UserRepository;
import com.mercotrace.repository.UserRoleRepository;
import com.mercotrace.repository.UserTraderRepository;
import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.service.RbacAuthorityService;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.UserService;
import com.mercotrace.service.dto.AdminUserDTO;
import com.mercotrace.service.dto.RoleDTO;
import com.mercotrace.service.dto.RoleDTO.ModulePermissionEntry;
import com.mercotrace.service.mapper.ModulePermissionsJsonMapper;
import com.mercotrace.service.mapper.RoleMapper;
import com.mercotrace.web.rest.errors.BadRequestAlertException;
import com.mercotrace.web.rest.vm.TraderRbacUserCreateVM;
import com.mercotrace.web.rest.vm.TraderRbacUserUpdateVM;
import com.mercotrace.web.rest.vm.TraderRbacUserVM;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * Trader-facing RBAC API.
 *
 * All endpoints here are scoped to the current trader (resolved via {@link TraderContextService})
 * and operate only on trader-owned roles and staff users.
 */
@RestController
@RequestMapping("/api/trader/rbac")
public class TraderRbacResource {

    private static final Logger LOG = LoggerFactory.getLogger(TraderRbacResource.class);

    private static final String ENTITY_ROLE = "traderRbacRole";
    private static final String ENTITY_USER = "traderRbacUser";

    private final TraderContextService traderContextService;
    private final RoleRepository roleRepository;
    private final RoleMapper roleMapper;
    private final UserService userService;
    private final UserRepository userRepository;
    private final UserTraderRepository userTraderRepository;
    private final UserRoleRepository userRoleRepository;
    private final RbacAuthorityService rbacAuthorityService;
    private final com.mercotrace.repository.TraderRepository traderRepository;
    private final com.mercotrace.repository.ContactRepository contactRepository;
    private final com.mercotrace.admin.identity.AdminUserRepository adminUserRepository;

    public TraderRbacResource(
        TraderContextService traderContextService,
        RoleRepository roleRepository,
        RoleMapper roleMapper,
        UserService userService,
        UserRepository userRepository,
        UserTraderRepository userTraderRepository,
        UserRoleRepository userRoleRepository,
        RbacAuthorityService rbacAuthorityService,
        com.mercotrace.repository.TraderRepository traderRepository,
        com.mercotrace.repository.ContactRepository contactRepository,
        com.mercotrace.admin.identity.AdminUserRepository adminUserRepository
    ) {
        this.traderContextService = traderContextService;
        this.roleRepository = roleRepository;
        this.roleMapper = roleMapper;
        this.userService = userService;
        this.userRepository = userRepository;
        this.userTraderRepository = userTraderRepository;
        this.userRoleRepository = userRoleRepository;
        this.rbacAuthorityService = rbacAuthorityService;
        this.traderRepository = traderRepository;
        this.contactRepository = contactRepository;
        this.adminUserRepository = adminUserRepository;
    }

    // -------------------------------------------------------------------------
    // Trader-scoped Roles
    // -------------------------------------------------------------------------

    /**
     * {@code GET /api/trader/rbac/roles} : list roles for the current trader.
     */
    @GetMapping("/roles")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.RBAC_SETTINGS_VIEW + "\")")
    public List<RoleDTO> getTraderRoles() {
        Long traderId = traderContextService.getCurrentTraderId();
        LOG.debug("REST request to get trader-scoped roles for trader {}", traderId);
        // Fetch bag relationships eagerly to avoid LazyInitializationException when mapping permissions.
        List<Role> roles = roleRepository.fetchBagRelationships(roleRepository.findByTraderId(traderId));
        return roles.stream().map(roleMapper::toDto).collect(Collectors.toList());
    }

    /**
     * {@code POST /api/trader/rbac/roles} : create a new trader-specific role.
     */
    @PostMapping("/roles")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.RBAC_SETTINGS_EDIT + "\")")
    public ResponseEntity<RoleDTO> createTraderRole(@Valid @RequestBody RoleDTO roleDTO) throws URISyntaxException {
        Long traderId = traderContextService.getCurrentTraderId();
        LOG.debug("REST request to create trader role for trader {} : {}", traderId, roleDTO);
        if (roleDTO.getId() != null) {
            throw new BadRequestAlertException("A new trader role cannot already have an ID", ENTITY_ROLE, "idexists");
        }

        Role role = roleMapper.toEntity(roleDTO);
        role.setTraderId(traderId);
        if (role.getCreatedAt() == null) {
            role.setCreatedAt(Instant.now());
        }
        role = roleRepository.save(role);

        RoleDTO result = roleMapper.toDto(role);
        return ResponseEntity
            .created(new URI("/api/trader/rbac/roles/" + result.getId()))
            .body(result);
    }

    /**
     * {@code PUT /api/trader/rbac/roles/:id} : update an existing trader role.
     */
    @PutMapping("/roles/{id}")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.RBAC_SETTINGS_EDIT + "\")")
    public ResponseEntity<RoleDTO> updateTraderRole(
        @PathVariable("id") Long id,
        @Valid @RequestBody RoleDTO roleDTO
    ) {
        Long traderId = traderContextService.getCurrentTraderId();
        LOG.debug("REST request to update trader role {} for trader {} : {}", id, traderId, roleDTO);

        if (roleDTO.getId() == null || !Objects.equals(id, roleDTO.getId())) {
            throw new BadRequestAlertException("Invalid id", ENTITY_ROLE, "idinvalid");
        }

        Role existing = roleRepository
            .findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));

        if (!Objects.equals(traderId, existing.getTraderId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Role does not belong to current trader");
        }

        existing.setRoleName(roleDTO.getRoleName());
        existing.setDescription(roleDTO.getDescription());

        Map<String, ModulePermissionEntry> modulePermissions = roleDTO.getModulePermissions();
        existing.setModulePermissions(ModulePermissionsJsonMapper.toJson(modulePermissions));

        Role saved = roleRepository.save(existing);
        Role savedWithRelationships = roleRepository.fetchBagRelationships(java.util.Optional.of(saved)).orElse(saved);
        RoleDTO result = roleMapper.toDto(savedWithRelationships);

        // After changing a role's modulePermissions, recompute authorities for all users that have this role.
        List<UserRole> mappings = userRoleRepository.findByRoleId(saved.getId());
        Set<Long> userIds = mappings
            .stream()
            .map(ur -> ur.getUser() != null ? ur.getUser().getId() : null)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        for (Long userId : userIds) {
            rbacAuthorityService.applyTraderAuthoritiesToUser(userId, traderId);
        }

        return ResponseEntity.ok(result);
    }

    /**
     * {@code DELETE /api/trader/rbac/roles/:id} : delete a trader role.
     */
    @DeleteMapping("/roles/{id}")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.RBAC_SETTINGS_EDIT + "\")")
    public ResponseEntity<Void> deleteTraderRole(@PathVariable("id") Long id) {
        Long traderId = traderContextService.getCurrentTraderId();
        LOG.debug("REST request to delete trader role {} for trader {}", id, traderId);

        Role existing = roleRepository
            .findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));

        if (!Objects.equals(traderId, existing.getTraderId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Role does not belong to current trader");
        }

        List<UserRole> mappings = userRoleRepository.findByRoleId(id);
        Set<Long> userIds = mappings
            .stream()
            .map(ur -> ur.getUser() != null ? ur.getUser().getId() : null)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());

        if (!mappings.isEmpty()) {
            userRoleRepository.deleteAll(mappings);
        }

        roleRepository.delete(existing);

        // Recompute authorities for affected users.
        for (Long userId : userIds) {
            rbacAuthorityService.applyTraderAuthoritiesToUser(userId, traderId);
        }

        return ResponseEntity.noContent().build();
    }

    // -------------------------------------------------------------------------
    // Trader-scoped Users (staff)
    // -------------------------------------------------------------------------

    /**
     * {@code GET /api/trader/rbac/users} : list staff users for the current trader.
     */
    @GetMapping("/users")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.RBAC_SETTINGS_VIEW + "\")")
    public List<TraderRbacUserVM> getTraderUsers() {
        Long traderId = traderContextService.getCurrentTraderId();
        LOG.debug("REST request to get trader staff users for trader {}", traderId);

        // Fetch mappings with associated User entities eagerly to avoid LazyInitializationException
        List<UserTrader> mappings = userTraderRepository.findAllWithUserByTraderIdAndPrimaryMappingTrue(traderId);
        if (mappings.isEmpty()) {
            return List.of();
        }

        // Collect user IDs for batch loading of trader-scoped roles
        List<Long> userIds = mappings
            .stream()
            .map(UserTrader::getUser)
            .filter(Objects::nonNull)
            .map(User::getId)
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        Map<Long, Set<Long>> userIdToRoleIds = Map.of();
        if (!userIds.isEmpty()) {
            // Load all user-role mappings for these users in a single query, eagerly fetching roles
            List<UserRole> userRoles = userRoleRepository.findByUserIdInAndTraderId(userIds, traderId);
            userIdToRoleIds =
                userRoles
                    .stream()
                    .filter(ur -> ur.getUser() != null && ur.getUser().getId() != null)
                    .filter(ur -> ur.getRole() != null && ur.getRole().getId() != null)
                    .collect(
                        Collectors.groupingBy(
                            ur -> ur.getUser().getId(),
                            Collectors.mapping(ur -> ur.getRole().getId(), Collectors.toSet())
                        )
                    );
        }

        List<TraderRbacUserVM> result = new ArrayList<>();
        for (UserTrader mapping : mappings) {
            if (mapping.getRoleInTrader() != null && "OWNER".equalsIgnoreCase(mapping.getRoleInTrader())) {
                // Never expose the trader owner in staff listings to prevent accidental edits/deletes.
                continue;
            }
            User user = mapping.getUser();
            if (user == null) {
                continue;
            }
            Set<Long> roleIds = userIdToRoleIds.getOrDefault(user.getId(), Collections.emptySet());

            TraderRbacUserVM vm = new TraderRbacUserVM();
            vm.setId(user.getId());
            vm.setLogin(user.getLogin());
            vm.setEmail(user.getEmail());
            vm.setMobile(user.getMobile());
            vm.setActivated(user.isActivated());
            vm.setFullName(buildFullName(user.getFirstName(), user.getLastName()));
            vm.setRoleInTrader(mapping.getRoleInTrader());
            vm.setRoleIds(roleIds);
            result.add(vm);
        }

        return result;
    }

    /**
     * {@code POST /api/trader/rbac/users} : create a new staff user for the current trader.
     */
    @PostMapping("/users")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.RBAC_SETTINGS_EDIT + "\")")
    public ResponseEntity<TraderRbacUserVM> createTraderUser(
        @Valid @RequestBody TraderRbacUserCreateVM vm
    ) throws URISyntaxException {
        Long traderId = traderContextService.getCurrentTraderId();
        LOG.debug("REST request to create trader staff user for trader {} : {}", traderId, vm);

        if (vm.getRoleInTrader() != null && "OWNER".equalsIgnoreCase(vm.getRoleInTrader())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Trader owners cannot be created via staff RBAC APIs");
        }

        String email = vm.getEmail();
        if (email == null || email.isBlank()) {
            throw new BadRequestAlertException("Email is required for staff user", ENTITY_USER, "emailrequired");
        }

        if (vm.getPassword() == null || vm.getPassword().length() < 6) {
            throw new BadRequestAlertException("Password must be at least 6 characters", ENTITY_USER, "passwordtooshort");
        }

        String login = vm.getLogin();
        if (login == null || login.isBlank()) {
            login = email;
        }

        String mobile = vm.getMobile() != null ? vm.getMobile().trim() : null;
        if (mobile != null && !mobile.isEmpty()) {
            assertMobileAvailableForTraderStaff(mobile, null);
        }

        // Delegate uniqueness checks and password handling to UserService.registerUser.
        AdminUserDTO userDTO = new AdminUserDTO();
        userDTO.setLogin(login);
        userDTO.setEmail(email);

        String fullName = vm.getFullName();
        String[] parts = fullName != null ? fullName.trim().split("\\s+", 2) : new String[] { "", "" };
        userDTO.setFirstName(parts[0] != null ? parts[0] : "");
        if (parts.length > 1) {
            userDTO.setLastName(parts[1]);
        }

        User user = userService.registerUser(userDTO, vm.getPassword());
        // Staff users created via trader RBAC are activated immediately by default.
        boolean activated = vm.getActivated() != null ? vm.getActivated() : true;
        user.setActivated(activated);
        user.setActivationKey(null);
        if (mobile != null && !mobile.isEmpty()) {
            user.setMobile(mobile);
        }
        user = userRepository.save(user);

        // Create UserTrader mapping for this trader.
        UserTrader mapping = new UserTrader();
        mapping.setUser(user);
        Trader traderRef = new Trader();
        traderRef.setId(traderId);
        mapping.setTrader(traderRef);
        // Default human-readable label when not provided.
        mapping.setRoleInTrader(vm.getRoleInTrader() != null ? vm.getRoleInTrader() : "STAFF");
        mapping.setPrimaryMapping(true);
        userTraderRepository.save(mapping);

        // Assign trader-scoped roles if provided.
        Set<Long> roleIds = vm.getRoleIds() != null ? vm.getRoleIds() : Set.of();
        if (!roleIds.isEmpty()) {
            List<Role> roles = roleRepository.findAllById(roleIds);
            for (Role role : roles) {
                if (role.getId() == null || !Objects.equals(traderId, role.getTraderId())) {
                    throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Cannot assign role that does not belong to current trader"
                    );
                }
            }
            for (Role role : roles) {
                UserRole userRole = new UserRole().user(user).role(role);
                userRoleRepository.save(userRole);
            }
        }

        // Compute and persist authorities for this staff user.
        rbacAuthorityService.applyTraderAuthoritiesToUser(user.getId(), traderId);

        TraderRbacUserVM result = new TraderRbacUserVM();
        result.setId(user.getId());
        result.setLogin(user.getLogin());
        result.setEmail(user.getEmail());
        result.setMobile(user.getMobile());
        result.setActivated(user.isActivated());
        result.setFullName(buildFullName(user.getFirstName(), user.getLastName()));
        result.setRoleInTrader(mapping.getRoleInTrader());
        result.setRoleIds(roleIds);

        return ResponseEntity
            .created(new URI("/api/trader/rbac/users/" + result.getId()))
            .body(result);
    }

    /**
     * {@code PUT /api/trader/rbac/users/:id} : update staff user details and roles.
     */
    @PutMapping("/users/{id}")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.RBAC_SETTINGS_EDIT + "\")")
    public ResponseEntity<TraderRbacUserVM> updateTraderUser(
        @PathVariable("id") Long userId,
        @Valid @RequestBody TraderRbacUserUpdateVM vm
    ) {
        Long traderId = traderContextService.getCurrentTraderId();
        LOG.debug("REST request to update trader staff user {} for trader {} : {}", userId, traderId, vm);

        User user = userRepository
            .findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        UserTrader mapping = userTraderRepository
            .findFirstByUserIdAndTraderIdAndPrimaryMappingTrue(userId, traderId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "User is not mapped to current trader"));

        if (mapping.getRoleInTrader() != null && "OWNER".equalsIgnoreCase(mapping.getRoleInTrader())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Trader owners cannot be managed via staff RBAC APIs");
        }

        // Update basic profile fields
        if (vm.getEmail() != null && !vm.getEmail().isBlank() && !vm.getEmail().equalsIgnoreCase(user.getEmail())) {
            Optional<User> existingByEmail = userRepository.findOneByEmailIgnoreCase(vm.getEmail());
            if (existingByEmail.isPresent() && !existingByEmail.get().getId().equals(userId)) {
                throw new BadRequestAlertException("Email is already in use", ENTITY_USER, "emailinuse");
            }
            user.setEmail(vm.getEmail().toLowerCase());
        }

        if (vm.getFullName() != null && !vm.getFullName().isBlank()) {
            String[] parts = vm.getFullName().trim().split("\\s+", 2);
            user.setFirstName(parts[0]);
            if (parts.length > 1) {
                user.setLastName(parts[1]);
            } else {
                user.setLastName(null);
            }
        }

        if (vm.getActivated() != null) {
            user.setActivated(vm.getActivated());
        }

        if (vm.getMobile() != null) {
            String trimmed = vm.getMobile().trim();
            String normalizedMobile = trimmed.isBlank() ? null : trimmed;
            if (normalizedMobile != null) {
                assertMobileAvailableForTraderStaff(normalizedMobile, userId);
            }
            user.setMobile(normalizedMobile);
        }

        userRepository.save(user);

        if (vm.getRoleInTrader() != null && !vm.getRoleInTrader().isBlank()) {
            if ("OWNER".equalsIgnoreCase(vm.getRoleInTrader())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Trader owners cannot be managed via staff RBAC APIs");
            }
            mapping.setRoleInTrader(vm.getRoleInTrader());
            userTraderRepository.save(mapping);
        }

        // Replace trader-scoped RBAC roles for this user with the provided set (if any).
        if (vm.getRoleIds() != null) {
            Set<Long> desiredRoleIds = vm.getRoleIds();

            List<UserRole> existingUserRoles = userRoleRepository.findByUserId(userId);
            List<UserRole> traderScopedMappings = existingUserRoles
                .stream()
                .filter(ur -> ur.getRole() != null && Objects.equals(traderId, ur.getRole().getTraderId()))
                .collect(Collectors.toList());

            if (!traderScopedMappings.isEmpty()) {
                userRoleRepository.deleteAll(traderScopedMappings);
            }

            if (!desiredRoleIds.isEmpty()) {
                List<Role> roles = roleRepository.findAllById(desiredRoleIds);
                for (Role role : roles) {
                    if (role.getId() == null || !Objects.equals(traderId, role.getTraderId())) {
                        throw new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "Cannot assign role that does not belong to current trader"
                        );
                    }
                }
                for (Role role : roles) {
                    UserRole userRole = new UserRole().user(user).role(role);
                    userRoleRepository.save(userRole);
                }
            }
        }

        // Recompute trader-module authorities for this user.
        rbacAuthorityService.applyTraderAuthoritiesToUser(userId, traderId);

        // Build response
        Set<Long> roleIds = userRoleRepository
            .findByUserId(userId)
            .stream()
            .map(UserRole::getRole)
            .filter(Objects::nonNull)
            .filter(role -> Objects.equals(traderId, role.getTraderId()))
            .map(Role::getId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());

        TraderRbacUserVM result = new TraderRbacUserVM();
        result.setId(user.getId());
        result.setLogin(user.getLogin());
        result.setEmail(user.getEmail());
        result.setActivated(user.isActivated());
        result.setFullName(buildFullName(user.getFirstName(), user.getLastName()));
        result.setRoleInTrader(mapping.getRoleInTrader());
        result.setRoleIds(roleIds);

        return ResponseEntity.ok(result);
    }

    /**
     * {@code DELETE /api/trader/rbac/users/:id} : remove staff user mapping and trader RBAC roles.
     */
    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.RBAC_SETTINGS_EDIT + "\")")
    public ResponseEntity<Void> deleteTraderUser(@PathVariable("id") Long userId) {
        Long traderId = traderContextService.getCurrentTraderId();
        LOG.debug("REST request to delete trader staff user {} for trader {}", userId, traderId);

        User user = userRepository
            .findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        UserTrader mapping = userTraderRepository
            .findFirstByUserIdAndTraderIdAndPrimaryMappingTrue(userId, traderId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "User is not mapped to current trader"));

        if (mapping.getRoleInTrader() != null && "OWNER".equalsIgnoreCase(mapping.getRoleInTrader())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Trader owners cannot be deleted via staff RBAC APIs");
        }

        // Remove trader-scoped roles for this user only (do not touch global/admin roles).
        List<UserRole> existingUserRoles = userRoleRepository.findByUserId(userId);
        List<UserRole> traderScopedMappings = existingUserRoles
            .stream()
            .filter(ur -> ur.getRole() != null && Objects.equals(traderId, ur.getRole().getTraderId()))
            .collect(Collectors.toList());
        if (!traderScopedMappings.isEmpty()) {
            userRoleRepository.deleteAll(traderScopedMappings);
        }

        userTraderRepository.delete(mapping);

        // Recompute authorities to drop trader-module authorities for this trader.
        rbacAuthorityService.applyTraderAuthoritiesToUser(userId, traderId);

        return ResponseEntity.noContent().build();
    }

    private void assertMobileAvailableForTraderStaff(String mobile, Long currentTraderUserId) {
        if (mobile == null || mobile.isBlank()) {
            return;
        }

        userRepository
            .findOneByMobile(mobile)
            .ifPresent(existing -> {
                if (currentTraderUserId == null || !existing.getId().equals(currentTraderUserId)) {
                    throw new BadRequestAlertException("This mobile number is already in use.", ENTITY_USER, "mobileinuse");
                }
            });

        traderRepository
            .findOneByMobile(mobile)
            .ifPresent(existing -> {
                throw new BadRequestAlertException("This mobile number is already in use.", ENTITY_USER, "mobileinuse");
            });

        contactRepository
            .findOneByPhone(mobile)
            .ifPresent(existing -> {
                throw new BadRequestAlertException("This mobile number is already in use.", ENTITY_USER, "mobileinuse");
            });

        adminUserRepository
            .findOneByMobile(mobile)
            .ifPresent(existing -> {
                throw new BadRequestAlertException("This mobile number is already in use.", ENTITY_USER, "mobileinuse");
            });
    }

    private String buildFullName(String firstName, String lastName) {
        StringBuilder sb = new StringBuilder();
        if (firstName != null && !firstName.isBlank()) {
            sb.append(firstName.trim());
        }
        if (lastName != null && !lastName.isBlank()) {
            if (!sb.isEmpty()) {
                sb.append(" ");
            }
            sb.append(lastName.trim());
        }
        return sb.toString();
    }
}

