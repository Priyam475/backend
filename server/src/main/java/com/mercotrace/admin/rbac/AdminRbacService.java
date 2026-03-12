package com.mercotrace.admin.rbac;

import com.mercotrace.admin.identity.AdminAuthority;
import com.mercotrace.admin.identity.AdminAuthorityRepository;
import com.mercotrace.admin.identity.AdminUser;
import com.mercotrace.admin.identity.AdminUserRepository;
import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.service.dto.AdminRoleDTO;
import com.mercotrace.service.dto.AdminUserRbacDTO;
import java.util.*;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Admin-side RBAC service.
 *
 * This service keeps {@link AdminRole} assignments in sync with {@link AdminAuthority}
 * rows and exposes coarse-grained role/assignment DTOs for the admin UI.
 *
 * Trader RBAC lives in {@link com.mercotrace.service.RbacAuthorityService} and
 * related trader entities and must remain completely separate from this service.
 */
@Service
@Transactional
public class AdminRbacService {

    private static final Logger LOG = LoggerFactory.getLogger(AdminRbacService.class);

    // Well-known admin role identifiers. These are just conventions; additional
    // roles can be created freely and will simply not map to any special authorities.
    private static final String ROLE_SUPER_ADMIN_NAME = "SUPER_ADMIN";
    private static final String ROLE_ADMIN_MANAGER_NAME = "ADMIN_MANAGER";
    private static final String ROLE_AUDITOR_NAME = "AUDITOR";

    // Admin-module authority conventions. Seven dedicated modules (1:1 with sidebar).
    // Separate from trader-module authorities.
    private static final String ADMIN_DASHBOARD = "ROLE_ADMIN_DASHBOARD";
    private static final String ADMIN_TRADERS_VIEW = "ROLE_ADMIN_TRADERS_VIEW";
    private static final String ADMIN_TRADERS_APPROVE = "ROLE_ADMIN_TRADERS_APPROVE";
    private static final String ADMIN_CATEGORIES_VIEW = "ROLE_ADMIN_CATEGORIES_VIEW";
    private static final String ADMIN_CATEGORIES_CREATE = "ROLE_ADMIN_CATEGORIES_CREATE";
    private static final String ADMIN_CATEGORIES_EDIT = "ROLE_ADMIN_CATEGORIES_EDIT";
    private static final String ADMIN_CATEGORIES_DELETE = "ROLE_ADMIN_CATEGORIES_DELETE";
    private static final String ADMIN_COMMODITIES_VIEW = "ROLE_ADMIN_COMMODITIES_VIEW";
    private static final String ADMIN_CONTACTS_VIEW = "ROLE_ADMIN_CONTACTS_VIEW";
    private static final String ADMIN_REPORTS_VIEW = "ROLE_ADMIN_REPORTS_VIEW";
    private static final String ADMIN_SETTINGS_VIEW = "ROLE_ADMIN_SETTINGS_VIEW";
    private static final String ADMIN_SETTINGS_RBAC_EDIT = "ROLE_ADMIN_SETTINGS_RBAC_EDIT";

    // Whitelist of module/feature authorities (7 modules) controllable via the UI.
    private static final Set<String> ADMIN_MODULE_AUTHORITIES = Set.of(
        ADMIN_DASHBOARD,
        ADMIN_TRADERS_VIEW,
        ADMIN_TRADERS_APPROVE,
        ADMIN_CATEGORIES_VIEW,
        ADMIN_CATEGORIES_CREATE,
        ADMIN_CATEGORIES_EDIT,
        ADMIN_CATEGORIES_DELETE,
        ADMIN_COMMODITIES_VIEW,
        ADMIN_CONTACTS_VIEW,
        ADMIN_REPORTS_VIEW,
        ADMIN_SETTINGS_VIEW,
        ADMIN_SETTINGS_RBAC_EDIT
    );

    private final AdminRoleRepository adminRoleRepository;
    private final AdminUserRepository adminUserRepository;
    private final AdminAuthorityRepository adminAuthorityRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final com.mercotrace.repository.UserRepository userRepository;
    private final com.mercotrace.repository.TraderRepository traderRepository;
    private final com.mercotrace.repository.ContactRepository contactRepository;

    public AdminRbacService(
        AdminRoleRepository adminRoleRepository,
        AdminUserRepository adminUserRepository,
        AdminAuthorityRepository adminAuthorityRepository,
        org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
        com.mercotrace.repository.UserRepository userRepository,
        com.mercotrace.repository.TraderRepository traderRepository,
        com.mercotrace.repository.ContactRepository contactRepository
    ) {
        this.adminRoleRepository = adminRoleRepository;
        this.adminUserRepository = adminUserRepository;
        this.adminAuthorityRepository = adminAuthorityRepository;
        this.passwordEncoder = passwordEncoder;
        this.userRepository = userRepository;
        this.traderRepository = traderRepository;
        this.contactRepository = contactRepository;
    }

    // -------------------------------------------------------------------------
    // Roles
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<AdminRoleDTO> getAllRoles() {
        return adminRoleRepository
            .findAll()
            .stream()
            .map(role -> new AdminRoleDTO(role, computeAuthoritiesForRole(role)))
            .collect(Collectors.toList());
    }

    public AdminRoleDTO createRole(AdminRoleDTO dto) {
        Objects.requireNonNull(dto, "AdminRoleDTO must not be null");
        if (dto.getId() != null) {
            throw new IllegalArgumentException("A new admin role cannot already have an ID");
        }

        AdminRole role = new AdminRole();
        role.setName(dto.getName());
        role.setDescription(dto.getDescription());
        role.setCreatedAt(java.time.Instant.now());

        // Persist module-level authorities from the DTO (if any).
        Set<String> requested = dto.getAuthorities() != null ? dto.getAuthorities() : Set.of();
        Set<String> sanitized = requested
            .stream()
            .filter(AdminRbacService::isKnownAdminModuleAuthority)
            .collect(Collectors.toSet());
        if (!sanitized.isEmpty()) {
            Set<AdminAuthority> authorityEntities = resolveAuthorities(sanitized);
            role.setAuthorities(authorityEntities);
        }

        role = adminRoleRepository.save(role);

        // No need to touch users here; roles only become effective once assigned.
        return new AdminRoleDTO(role, computeAuthoritiesForRole(role));
    }

    public AdminRoleDTO updateRole(Long id, AdminRoleDTO dto) {
        Objects.requireNonNull(id, "id must not be null");
        Objects.requireNonNull(dto, "AdminRoleDTO must not be null");

        AdminRole existing = adminRoleRepository.findById(id).orElseThrow(() -> new NoSuchElementException("AdminRole not found"));

        if (dto.getId() != null && !Objects.equals(id, dto.getId())) {
            throw new IllegalArgumentException("AdminRole ID mismatch");
        }

        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());

        // Replace persisted module authorities from the DTO (if provided).
        if (dto.getAuthorities() != null) {
            Set<String> sanitized = dto
                .getAuthorities()
                .stream()
                .filter(AdminRbacService::isKnownAdminModuleAuthority)
                .collect(Collectors.toSet());
            Set<AdminAuthority> authorityEntities = resolveAuthorities(sanitized);
            existing.setAuthorities(authorityEntities);
        }

        AdminRole saved = adminRoleRepository.save(existing);

        // After changing a role's module authorities, recompute authorities for all users that have this role.
        List<AdminUser> affectedUsers = adminUserRepository.findAllByRoles_Id(saved.getId());
        for (AdminUser user : affectedUsers) {
            applyAuthoritiesForUserRoles(user.getId());
        }

        return new AdminRoleDTO(saved, computeAuthoritiesForRole(saved));
    }

    public void deleteRole(Long id) {
        Objects.requireNonNull(id, "id must not be null");

        AdminRole role = adminRoleRepository.findById(id).orElseThrow(() -> new NoSuchElementException("AdminRole not found"));

        // Detach this role from all users and recompute their authorities.
        List<AdminUser> affectedUsers = adminUserRepository.findAllByRoles_Id(id);
        for (AdminUser user : affectedUsers) {
            user.getRoles().removeIf(r -> r.getId() != null && r.getId().equals(id));
            adminUserRepository.save(user);
            applyAuthoritiesForUserRoles(user.getId());
        }

        adminRoleRepository.delete(role);
    }

    // -------------------------------------------------------------------------
    // User-role assignments
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<AdminUserRbacDTO> getAllAdminUsersWithRoles() {
        return adminUserRepository
            .findAllWithRoles()
            .stream()
            .filter(user -> !isPlatformOwner(user))
            .map(AdminUserRbacDTO::new)
            .collect(Collectors.toList());
    }

    public AdminUserRbacDTO replaceRolesForUser(Long userId, Set<Long> roleIds) {
        Objects.requireNonNull(userId, "userId must not be null");
        Set<Long> sanitizedIds = roleIds != null ? new HashSet<>(roleIds) : Set.of();

        AdminUser user = adminUserRepository
            .findOneWithRolesAndAuthoritiesById(userId)
            .orElseThrow(() -> new NoSuchElementException("Admin user not found"));

        Set<AdminRole> newRoles = new HashSet<>();
        if (!sanitizedIds.isEmpty()) {
            List<AdminRole> roles = adminRoleRepository.findAllById(sanitizedIds);
            for (AdminRole role : roles) {
                if (role.getId() != null) {
                    newRoles.add(role);
                }
            }
        }

        user.setRoles(newRoles);
        adminUserRepository.save(user);

        applyAuthoritiesForUserRoles(user.getId());

        // Reload with updated roles to build DTO.
        AdminUser reloaded = adminUserRepository
            .findOneWithRolesAndAuthoritiesById(userId)
            .orElseThrow(() -> new NoSuchElementException("Admin user not found after update"));
        return new AdminUserRbacDTO(reloaded);
    }

    // -------------------------------------------------------------------------
    // Admin user lifecycle (create/update profile)
    // -------------------------------------------------------------------------

    public AdminUserRbacDTO createAdminUser(String login, String email, String firstName, String lastName, String mobile, String rawPassword, Boolean activated) {
        Objects.requireNonNull(email, "email must not be null");
        Objects.requireNonNull(rawPassword, "password must not be null");

        String normalizedEmail = email.toLowerCase(Locale.ROOT);
        String normalizedLogin = (login != null && !login.isBlank() ? login : normalizedEmail.split("@")[0]).toLowerCase(Locale.ROOT);
        String normalizedMobile = mobile != null && !mobile.isBlank() ? mobile.trim() : null;

        adminUserRepository
            .findOneByLogin(normalizedLogin)
            .ifPresent(existing -> {
                throw new IllegalArgumentException("Login is already in use");
            });

        adminUserRepository
            .findOneByEmailIgnoreCase(normalizedEmail)
            .ifPresent(existing -> {
                throw new IllegalArgumentException("Email is already in use");
            });

        if (normalizedMobile != null) {
            assertMobileAvailableForAdmin(normalizedMobile, null);
        }

        AdminUser user = new AdminUser();
        user.setLogin(normalizedLogin);
        user.setEmail(normalizedEmail);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setMobile(normalizedMobile);
        user.setActivated(activated != null ? activated : true);
        user.setPassword(passwordEncoder.encode(rawPassword));

        user = adminUserRepository.save(user);
        return new AdminUserRbacDTO(user);
    }

    public AdminUserRbacDTO updateAdminUser(Long id, String email, String firstName, String lastName, String mobile, Boolean activated) {
        Objects.requireNonNull(id, "id must not be null");

        AdminUser user = adminUserRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Admin user not found"));

        if (email != null && !email.isBlank()) {
            String normalizedEmail = email.toLowerCase(Locale.ROOT);
            adminUserRepository
                .findOneByEmailIgnoreCase(normalizedEmail)
                .ifPresent(existing -> {
                    if (!existing.getId().equals(id)) {
                        throw new IllegalArgumentException("Email is already in use");
                    }
                });
            user.setEmail(normalizedEmail);
        }

        if (firstName != null) {
            user.setFirstName(firstName);
        }
        if (lastName != null) {
            user.setLastName(lastName);
        }
        if (mobile != null) {
            String trimmed = mobile.trim();
            String normalizedMobile = trimmed.isBlank() ? null : trimmed;
            if (normalizedMobile != null) {
                assertMobileAvailableForAdmin(normalizedMobile, id);
            }
            user.setMobile(normalizedMobile);
        }
        if (activated != null) {
            user.setActivated(activated);
        }

        user = adminUserRepository.save(user);
        return new AdminUserRbacDTO(user);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * Compute authority names granted by a single {@link AdminRole}.
     *
     * This mapping combines:
     * - Persisted module/feature authorities for the role, controlled via the UI.
     * - Baseline ROLE_ADMIN for any effective admin role.
     * - Special semantics for well-known roles such as SUPER_ADMIN.
     */
    @Transactional(readOnly = true)
    public Set<String> computeAuthoritiesForRole(AdminRole role) {
        if (role == null || role.getName() == null) {
            return Set.of();
        }
        String key = normalize(role.getName());

        Set<String> result = new HashSet<>(getPersistedModuleAuthorities(role));

        boolean isWellKnown =
            ROLE_SUPER_ADMIN_NAME.equals(key) || ROLE_ADMIN_MANAGER_NAME.equals(key) || ROLE_AUDITOR_NAME.equals(key);

        // All admin roles that are meant to access /api/admin/** must carry the
        // baseline ROLE_ADMIN authority, since the admin SecurityFilterChain
        // requires it.
        if (isWellKnown || !result.isEmpty()) {
            result.add(AuthoritiesConstants.ADMIN);
        }

        if (ROLE_SUPER_ADMIN_NAME.equals(key)) {
            // Marker authority for superadmin, in addition to module-level authorities.
            result.add("ROLE_SUPER_ADMIN");
            // Full access to all 7 admin modules.
            result.addAll(
                List.of(
                    ADMIN_DASHBOARD,
                    ADMIN_TRADERS_VIEW,
                    ADMIN_TRADERS_APPROVE,
                    ADMIN_CATEGORIES_VIEW,
                    ADMIN_CATEGORIES_CREATE,
                    ADMIN_CATEGORIES_EDIT,
                    ADMIN_CATEGORIES_DELETE,
                    ADMIN_COMMODITIES_VIEW,
                    ADMIN_CONTACTS_VIEW,
                    ADMIN_REPORTS_VIEW,
                    ADMIN_SETTINGS_VIEW,
                    ADMIN_SETTINGS_RBAC_EDIT
                )
            );
        } else if (ROLE_ADMIN_MANAGER_NAME.equals(key)) {
            // Operational admin with broad powers (all 7 modules, no audit-only restriction).
            result.addAll(
                List.of(
                    ADMIN_DASHBOARD,
                    ADMIN_TRADERS_VIEW,
                    ADMIN_TRADERS_APPROVE,
                    ADMIN_CATEGORIES_VIEW,
                    ADMIN_CATEGORIES_CREATE,
                    ADMIN_CATEGORIES_EDIT,
                    ADMIN_CATEGORIES_DELETE,
                    ADMIN_COMMODITIES_VIEW,
                    ADMIN_CONTACTS_VIEW,
                    ADMIN_REPORTS_VIEW,
                    ADMIN_SETTINGS_VIEW,
                    ADMIN_SETTINGS_RBAC_EDIT
                )
            );
        } else if (ROLE_AUDITOR_NAME.equals(key)) {
            // Read-only admin: Dashboard + view-only for other modules.
            result.addAll(
                List.of(
                    ADMIN_DASHBOARD,
                    ADMIN_TRADERS_VIEW,
                    ADMIN_CATEGORIES_VIEW,
                    ADMIN_COMMODITIES_VIEW,
                    ADMIN_CONTACTS_VIEW,
                    ADMIN_REPORTS_VIEW,
                    ADMIN_SETTINGS_VIEW
                )
            );
        }

        return Collections.unmodifiableSet(result);
    }

    /**
     * Recompute and persist {@link AdminAuthority} rows for the given user based
     * solely on their assigned {@link AdminRole}s.
     */
    public void applyAuthoritiesForUserRoles(Long userId) {
        if (userId == null) {
            return;
        }

        AdminUser user = adminUserRepository
            .findOneWithRolesAndAuthoritiesById(userId)
            .orElseThrow(() -> new NoSuchElementException("Admin user not found"));

        Set<String> authorityNames = new HashSet<>();
        for (AdminRole role : user.getRoles()) {
            authorityNames.addAll(computeAuthoritiesForRole(role));
        }

        if (authorityNames.isEmpty()) {
            LOG.debug("Admin user {} has no RBAC-derived admin authorities; preserving existing authorities.", user.getLogin());
            return;
        }

        Set<AdminAuthority> authorities = resolveAuthorities(authorityNames);
        user.setAuthorities(authorities);
        adminUserRepository.save(user);

        LOG.debug(
            "Updated admin authorities for user {} (id={}): {}",
            user.getLogin(),
            user.getId(),
            authorities.stream().map(AdminAuthority::getName).collect(Collectors.toSet())
        );
    }

    private void assertMobileAvailableForAdmin(String mobile, Long currentAdminUserId) {
        if (mobile == null || mobile.isBlank()) {
            return;
        }

        adminUserRepository
            .findOneByMobile(mobile)
            .ifPresent(existing -> {
                if (currentAdminUserId == null || !existing.getId().equals(currentAdminUserId)) {
                    throw new IllegalArgumentException("This mobile number is already in use.");
                }
            });

        // Prevent conflicts with trader users, traders, and contacts.
        userRepository
            .findOneByMobile(mobile)
            .ifPresent(existing -> {
                throw new IllegalArgumentException("This mobile number is already in use.");
            });
        traderRepository
            .findOneByMobile(mobile)
            .ifPresent(existing -> {
                throw new IllegalArgumentException("This mobile number is already in use.");
            });
        contactRepository
            .findOneByPhone(mobile)
            .ifPresent(existing -> {
                throw new IllegalArgumentException("This mobile number is already in use.");
            });
    }

    private Set<AdminAuthority> resolveAuthorities(Set<String> names) {
        if (names == null || names.isEmpty()) {
            return Set.of();
        }

        List<AdminAuthority> existing = adminAuthorityRepository.findAllById(names);
        Map<String, AdminAuthority> byName = existing.stream().collect(Collectors.toMap(AdminAuthority::getName, a -> a));

        Set<AdminAuthority> result = new HashSet<>(existing);
        for (String name : names) {
            if (!byName.containsKey(name)) {
                AdminAuthority authority = new AdminAuthority();
                authority.setName(name);
                authority = adminAuthorityRepository.save(authority);
                result.add(authority);
                byName.put(name, authority);
            }
        }

        return result;
    }

    private static boolean isKnownAdminModuleAuthority(String name) {
        return name != null && ADMIN_MODULE_AUTHORITIES.contains(name);
    }

    private Set<String> getPersistedModuleAuthorities(AdminRole role) {
        if (role == null || role.getAuthorities() == null) {
            return Set.of();
        }
        return role
            .getAuthorities()
            .stream()
            .map(AdminAuthority::getName)
            .filter(AdminRbacService::isKnownAdminModuleAuthority)
            .collect(Collectors.toSet());
    }

    /**
     * Identify the platform owner/superadmin account that should not be
     * exposed or managed via admin RBAC assignment surfaces.
     */
    private static boolean isPlatformOwner(AdminUser user) {
        if (user == null) {
            return false;
        }
        String login = user.getLogin();
        return login != null && "superadmin".equalsIgnoreCase(login);
    }

    private static String normalize(String raw) {
        return raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
    }
}

