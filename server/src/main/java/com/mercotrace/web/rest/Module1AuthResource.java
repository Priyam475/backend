package com.mercotrace.web.rest;

import com.mercotrace.domain.Authority;
import com.mercotrace.domain.User;
import com.mercotrace.repository.TraderRepository;
import com.mercotrace.repository.UserRepository;
import com.mercotrace.repository.UserTraderRepository;
import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.service.MailService;
import com.mercotrace.service.OtpService;
import com.mercotrace.service.TraderOwnerAuthorityService;
import com.mercotrace.service.TraderService;
import com.mercotrace.service.UserService;
import com.mercotrace.service.dto.AdminUserDTO;
import com.mercotrace.service.dto.Module1AuthDTO;
import com.mercotrace.service.dto.TraderDTO;
import com.mercotrace.web.rest.vm.LoginVM;
import com.mercotrace.web.rest.vm.ManagedUserVM;
import com.mercotrace.web.rest.vm.Module1OtpRequestVM;
import com.mercotrace.web.rest.vm.Module1OtpVerifyVM;
import com.mercotrace.web.rest.vm.Module1RegisterVM;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Module 1 spec — auth paths: /api/auth/register, /api/auth/login, /api/auth/profile.
 * Delegates to existing JHipster auth/account.
 */
@RestController
@RequestMapping("/api/auth")
public class Module1AuthResource {

    private static final Logger log = LoggerFactory.getLogger(Module1AuthResource.class);

    private final UserService userService;
    private final MailService mailService;
    private final UserRepository userRepository;
    private final com.mercotrace.web.rest.AccountResource accountResource;
    private final com.mercotrace.web.rest.AuthenticateController authenticateController;
    private final TraderService traderService;
    private final TraderRepository traderRepository;
    private final UserTraderRepository userTraderRepository;
    private final OtpService otpService;
    private final TraderOwnerAuthorityService traderOwnerAuthorityService;

    public Module1AuthResource(
        UserService userService,
        MailService mailService,
        UserRepository userRepository,
        com.mercotrace.web.rest.AccountResource accountResource,
        com.mercotrace.web.rest.AuthenticateController authenticateController,
        TraderService traderService,
        TraderRepository traderRepository,
        UserTraderRepository userTraderRepository,
        OtpService otpService,
        TraderOwnerAuthorityService traderOwnerAuthorityService
    ) {
        this.userService = userService;
        this.mailService = mailService;
        this.userRepository = userRepository;
        this.accountResource = accountResource;
        this.authenticateController = authenticateController;
        this.traderService = traderService;
        this.traderRepository = traderRepository;
        this.userTraderRepository = userTraderRepository;
        this.otpService = otpService;
        this.traderOwnerAuthorityService = traderOwnerAuthorityService;
    }

    /** Module 1 spec: POST /auth/register — Register Trader (Directory Listing only) + auto-login for module 1 UI. */
    @PostMapping("/register")
    public ResponseEntity<Module1AuthDTO> register(@Valid @RequestBody Module1RegisterVM vm) {
        // Enforce same password policy as frontend (min 6 chars)
        if (vm.getPassword() == null || vm.getPassword().length() < 6) {
            throw new com.mercotrace.service.InvalidPasswordException();
        }

        // Normalize and validate PIN code only when provided (optional field)
        String normalizedPinCode = null;
        if (vm.getPinCode() != null) {
            String trimmed = vm.getPinCode().trim();
            if (!trimmed.isEmpty()) {
                if (!trimmed.matches("^[0-9]{6}$")) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PIN code must be a 6-digit number");
                }
                normalizedPinCode = trimmed;
            }
        }

        // 1) Create Trader (directory listing, pending approval)
        TraderDTO traderDTO = new TraderDTO();
        traderDTO.setBusinessName(vm.getBusinessName());
        traderDTO.setOwnerName(vm.getOwnerName());
        traderDTO.setAddress(vm.getAddress());
        traderDTO.setMobile(vm.getMobile());
        traderDTO.setEmail(vm.getEmail());
        traderDTO.setCity(vm.getCity());
        traderDTO.setState(vm.getState());
        traderDTO.setPinCode(normalizedPinCode);
        traderDTO.setCategory(vm.getCategory());
        traderDTO.setApprovalStatus(com.mercotrace.domain.enumeration.ApprovalStatus.PENDING);
        traderDTO.setBillPrefix("");

        traderDTO.setGstNumber(vm.getGstNumber());
        traderDTO.setRmcApmcCode(vm.getRmcApmcCode());
        if (vm.getShopPhotos() != null && vm.getShopPhotos().length > 0) {
            if (vm.getShopPhotos().length > 4) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Too many shop photos. Maximum is 4.");
            }
            for (String photo : vm.getShopPhotos()) {
                if (photo != null && photo.length() > 512) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shop photo URL is too long");
                }
            }
            traderDTO.setShopPhotos(String.join(",", vm.getShopPhotos()));
        }

        traderDTO = traderService.save(traderDTO);

        // 2) Create User linked logically to this trader (login by email)
        AdminUserDTO userDTO = new AdminUserDTO();
        userDTO.setLogin(vm.getEmail());
        userDTO.setEmail(vm.getEmail());
        userDTO.setFirstName(vm.getOwnerName());
        Set<String> auths = new HashSet<>();
        auths.add(AuthoritiesConstants.USER);
        userDTO.setAuthorities(auths);

        var user = userService.registerUser(userDTO, vm.getPassword());
        // Auto-activate user for module 1 (no email activation flow in UI)
        user.setActivated(true);
        user.setActivationKey(null);
        userRepository.save(user);

        // Ensure trader owners receive full trader-module authorities (no global admin).
        traderOwnerAuthorityService.ensureTraderOwnerAuthorities(user);

        // Link this user and trader as primary mapping for module 1
        com.mercotrace.domain.UserTrader mapping = new com.mercotrace.domain.UserTrader();
        mapping.setUser(user);
        com.mercotrace.domain.Trader traderRef = new com.mercotrace.domain.Trader();
        traderRef.setId(traderDTO.getId());
        mapping.setTrader(traderRef);
        mapping.setRoleInTrader("OWNER");
        mapping.setPrimaryMapping(true);
        userTraderRepository.save(mapping);

        AdminUserDTO account = new AdminUserDTO(user);

        // 3) Authenticate to generate JWT token
        LoginVM loginVM = new LoginVM();
        loginVM.setUsername(vm.getEmail());
        loginVM.setPassword(vm.getPassword());
        loginVM.setRememberMe(false);

        ResponseEntity<com.mercotrace.web.rest.AuthenticateController.JWTToken> jwtResponse;
        try {
            jwtResponse = authenticateController.authorize(loginVM);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        if (jwtResponse.getBody() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication failed");
        }

        // 4) Build Module1AuthDTO aligned with frontend AuthState
        Module1AuthDTO dto = new Module1AuthDTO();

        Module1AuthDTO.UserPayload userPayload = new Module1AuthDTO.UserPayload();
        if (account.getId() != null) {
            userPayload.setUserId(account.getId().toString());
        }
        if (traderDTO.getId() != null) {
            userPayload.setTraderId(traderDTO.getId().toString());
        }
        userPayload.setUsername(account.getLogin());
        userPayload.setActive(account.isActivated());
        userPayload.setCreatedAt(account.getCreatedDate() != null ? account.getCreatedDate().toString() : null);
        StringBuilder nameBuilder = new StringBuilder();
        if (account.getFirstName() != null) {
            nameBuilder.append(account.getFirstName());
        }
        if (account.getLastName() != null) {
            if (!nameBuilder.isEmpty()) {
                nameBuilder.append(" ");
            }
            nameBuilder.append(account.getLastName());
        }
        userPayload.setName(nameBuilder.toString());
        userPayload.setRole(computeDisplayRole(account, traderDTO));
        userPayload.setAuthorities(account.getAuthorities());
        dto.setUser(userPayload);

        Module1AuthDTO.TraderPayload traderPayload = new Module1AuthDTO.TraderPayload();
        if (traderDTO.getId() != null) {
            traderPayload.setTraderId(traderDTO.getId().toString());
        }
        traderPayload.setBusinessName(traderDTO.getBusinessName());
        traderPayload.setOwnerName(traderDTO.getOwnerName());
        traderPayload.setAddress(traderDTO.getAddress());
        traderPayload.setMobile(traderDTO.getMobile());
        traderPayload.setEmail(traderDTO.getEmail());
        traderPayload.setCity(traderDTO.getCity());
        traderPayload.setState(traderDTO.getState());
        traderPayload.setPinCode(traderDTO.getPinCode());
        traderPayload.setCategory(traderDTO.getCategory());
        traderPayload.setApprovalStatus(traderDTO.getApprovalStatus() != null ? traderDTO.getApprovalStatus().name() : "PENDING");
        traderPayload.setBillPrefix(traderDTO.getBillPrefix());
        traderPayload.setCreatedAt(traderDTO.getCreatedAt() != null ? traderDTO.getCreatedAt().toString() : null);
        traderPayload.setUpdatedAt(traderDTO.getUpdatedAt() != null ? traderDTO.getUpdatedAt().toString() : null);
        traderPayload.setGstNumber(traderDTO.getGstNumber());
        traderPayload.setRmcApmcCode(traderDTO.getRmcApmcCode());
        traderPayload.setShopPhotos(splitShopPhotos(traderDTO.getShopPhotos()));
        dto.setTrader(traderPayload);

        // Forward authentication headers (including Set-Cookie) so the browser
        // receives the httpOnly JWT cookie even on registration.
        return ResponseEntity.status(HttpStatus.CREATED).headers(jwtResponse.getHeaders()).body(dto);
    }

    /** Module 1 spec: POST /auth/login — Login User. Returns normalized user/trader payloads.
     *  JWT is issued via secure httpOnly cookie, not used directly by the frontend.
     */
    @PostMapping("/login")
    public ResponseEntity<Module1AuthDTO> login(@Valid @RequestBody LoginVM loginVM) {
        // Frontend sends an email and requires 6+ char password. Enforce that here.
        if (loginVM.getPassword() == null || loginVM.getPassword().length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");
        }
        // Allow email-based login by resolving email -> internal login username
        String username = loginVM.getUsername();
        if (username != null && username.contains("@")) {
            userRepository
                .findOneByEmailIgnoreCase(username.toLowerCase())
                .ifPresent(user -> loginVM.setUsername(user.getLogin()));
        }

        // Delegate authentication to existing JWT controller
        ResponseEntity<com.mercotrace.web.rest.AuthenticateController.JWTToken> jwtResponse;
        try {
            jwtResponse = authenticateController.authorize(loginVM);
        } catch (Exception ex) {
            // Normalize authentication failures into a clean 401 with clear message
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        if (jwtResponse.getBody() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication failed");
        }

        // Fetch current authenticated user
        AdminUserDTO account = accountResource.getAccount();
        account = upgradeTraderOwnerAuthoritiesIfNeeded(account);

        java.util.Optional<TraderDTO> traderOpt = resolveTraderForUser(account);
        TraderDTO trader = traderOpt.orElse(null);
        if (trader == null && !isAdminAccount(account)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Trader not configured");
        }
        Module1AuthDTO dto = buildAuthDto(account, trader);

        return ResponseEntity.status(jwtResponse.getStatusCode()).headers(jwtResponse.getHeaders()).body(dto);
    }

    /** Module 1 spec: GET /auth/me — Return current user + trader payload based on JWT cookie. */
    @GetMapping("/me")
    public Module1AuthDTO me() {
        AdminUserDTO account = accountResource.getAccount();
        account = upgradeTraderOwnerAuthoritiesIfNeeded(account);

        java.util.Optional<TraderDTO> traderOpt = resolveTraderForUser(account);
        TraderDTO trader = traderOpt.orElse(null);
        if (trader == null && !isAdminAccount(account)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Trader not configured");
        }
        return buildAuthDto(account, trader);
    }

    /** Module 1 spec: PUT /auth/profile — Update user profile. */
    @PutMapping("/profile")
    public void updateProfile(@RequestBody com.mercotrace.service.dto.AdminUserDTO userDTO) {
        // Delegate to AccountResource without triggering bean validation on AdminUserDTO here.
        // AccountResource will use the current authenticated user and only the updated fields.
        accountResource.saveAccount(userDTO);
    }

    /** Module 1 spec: POST /auth/otp/request — Request OTP for phone-based login. */
    @PostMapping("/otp/request")
    public ResponseEntity<Map<String, String>> requestOtp(
        @Valid @RequestBody Module1OtpRequestVM vm,
        HttpServletRequest request
    ) {
        String mobile = vm.getMobile();

        // OTP login is only allowed for existing traders with this mobile
        traderRepository
            .findOneByMobile(mobile)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No trader registered with this mobile"));

        try {
            String clientIp = request.getRemoteAddr();
            otpService.generateOtpForMobile(mobile, clientIp);
        } catch (OtpService.OtpRateLimitExceededException ex) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many OTP requests. Please try again later.");
        }

        return ResponseEntity.ok(Map.of("status", "OK"));
    }

    /** Module 1 spec: POST /auth/otp/verify — Verify OTP and perform login. */
    @PostMapping("/otp/verify")
    public ResponseEntity<Module1AuthDTO> verifyOtp(@Valid @RequestBody Module1OtpVerifyVM vm) {
        String mobile = vm.getMobile();
        String otp = vm.getOtp();

        OtpService.OtpValidationStatus status = otpService.validateOtp(mobile, otp);
        if (status == OtpService.OtpValidationStatus.EXPIRED || status == OtpService.OtpValidationStatus.NOT_FOUND) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP expired");
        }
        if (status == OtpService.OtpValidationStatus.TOO_MANY_ATTEMPTS) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Please request a new OTP.");
        }
        if (status == OtpService.OtpValidationStatus.INVALID) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP");
        }

        // At this point, OTP is valid. Resolve trader by mobile.
        com.mercotrace.domain.Trader traderEntity = traderRepository
            .findOneByMobile(mobile)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No trader registered with this mobile"));

        // Resolve or create user associated with this trader
        com.mercotrace.domain.User user = resolveOrCreateUserForTrader(traderEntity, mobile);

        String phonePassword = "phone-otp-login";

        // Authenticate using the existing JWT controller so that httpOnly cookie is set.
        LoginVM loginVM = new LoginVM();
        loginVM.setUsername(user.getLogin());
        loginVM.setPassword(phonePassword);
        loginVM.setRememberMe(false);

        ResponseEntity<com.mercotrace.web.rest.AuthenticateController.JWTToken> jwtResponse;
        try {
            jwtResponse = authenticateController.authorize(loginVM);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication failed");
        }
        if (jwtResponse.getBody() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication failed");
        }

        AdminUserDTO account = accountResource.getAccount();

        TraderDTO trader = traderService
            .findOne(traderEntity.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Trader not configured"));

        Module1AuthDTO dto = buildAuthDto(account, trader);

        return ResponseEntity.status(jwtResponse.getStatusCode()).headers(jwtResponse.getHeaders()).body(dto);
    }

    private AdminUserDTO upgradeTraderOwnerAuthoritiesIfNeeded(AdminUserDTO account) {
        if (account == null || account.getId() == null) {
            return account;
        }

        return userTraderRepository
            .findFirstByUserIdAndPrimaryMappingTrue(account.getId())
            .filter(mapping -> {
                String roleInTrader = mapping.getRoleInTrader();
                return roleInTrader != null && "OWNER".equalsIgnoreCase(roleInTrader.trim());
            })
            .map(mapping -> {
                Optional<User> userOpt = userRepository.findById(account.getId());
                if (userOpt.isEmpty()) {
                    return account;
                }
                User user = userOpt.get();
                // Idempotent upgrade – safe to call repeatedly.
                traderOwnerAuthorityService.ensureTraderOwnerAuthorities(user);

                // After upgrade, re-read a managed User with initialized authorities.
                Optional<User> managedUserOpt = userRepository.findOneWithAuthoritiesById(account.getId());
                if (managedUserOpt.isEmpty()) {
                    return account;
                }
                User managedUser = managedUserOpt.get();

                Set<String> updatedAuthorities =
                    managedUser
                        .getAuthorities()
                        .stream()
                        .map(Authority::getName)
                        .collect(Collectors.toSet());
                account.setAuthorities(updatedAuthorities);
                return account;
            })
            .orElse(account);
    }

    private Module1AuthDTO buildAuthDto(AdminUserDTO account, TraderDTO trader) {
        // Ensure OWNER authorities are always up-to-date when we serialize the auth payload.
        account = upgradeTraderOwnerAuthoritiesIfNeeded(account);

        Module1AuthDTO dto = new Module1AuthDTO();

        // Map user
        Module1AuthDTO.UserPayload userPayload = new Module1AuthDTO.UserPayload();
        if (account.getId() != null) {
            userPayload.setUserId(account.getId().toString());
        }
        if (trader != null && trader.getId() != null) {
            userPayload.setTraderId(trader.getId().toString());
        }
        userPayload.setUsername(account.getLogin());
        userPayload.setActive(account.isActivated());
        userPayload.setCreatedAt(account.getCreatedDate() != null ? account.getCreatedDate().toString() : null);

        StringBuilder nameBuilder = new StringBuilder();
        if (account.getFirstName() != null) {
            nameBuilder.append(account.getFirstName());
        }
        if (account.getLastName() != null) {
            if (!nameBuilder.isEmpty()) {
                nameBuilder.append(" ");
            }
            nameBuilder.append(account.getLastName());
        }
        userPayload.setName(nameBuilder.toString());
        userPayload.setRole(computeDisplayRole(account, trader));
        userPayload.setAuthorities(account.getAuthorities());

        dto.setUser(userPayload);

        // Map trader when available (trader users). Admin/superadmin without a trader mapping receive trader = null.
        if (trader != null) {
            Module1AuthDTO.TraderPayload traderPayload = new Module1AuthDTO.TraderPayload();
            if (trader.getId() != null) {
                traderPayload.setTraderId(trader.getId().toString());
            }
            traderPayload.setBusinessName(trader.getBusinessName());
            traderPayload.setOwnerName(trader.getOwnerName());
            traderPayload.setAddress(trader.getAddress());
            traderPayload.setMobile(trader.getMobile());
            traderPayload.setEmail(trader.getEmail());
            traderPayload.setCity(trader.getCity());
            traderPayload.setState(trader.getState());
            traderPayload.setPinCode(trader.getPinCode());
            traderPayload.setCategory(trader.getCategory());
            traderPayload.setApprovalStatus(trader.getApprovalStatus() != null ? trader.getApprovalStatus().name() : "PENDING");
            traderPayload.setBillPrefix(trader.getBillPrefix());
            traderPayload.setCreatedAt(trader.getCreatedAt() != null ? trader.getCreatedAt().toString() : null);
            traderPayload.setUpdatedAt(trader.getUpdatedAt() != null ? trader.getUpdatedAt().toString() : null);
            traderPayload.setGstNumber(trader.getGstNumber());
            traderPayload.setRmcApmcCode(trader.getRmcApmcCode());
            traderPayload.setShopPhotos(splitShopPhotos(trader.getShopPhotos()));

            dto.setTrader(traderPayload);
        }

        return dto;
    }

    private String[] splitShopPhotos(String shopPhotos) {
        if (shopPhotos == null || shopPhotos.isBlank()) {
            return new String[0];
        }
        return shopPhotos.split("\\s*,\\s*");
    }

    private java.util.Optional<TraderDTO> resolveTraderForUser(AdminUserDTO account) {
        if (account.getId() == null) {
            return java.util.Optional.empty();
        }
        return userTraderRepository
            .findFirstByUserIdAndPrimaryMappingTrue(account.getId())
            .flatMap(mapping -> traderService.findOne(mapping.getTrader().getId()));
    }

    private boolean isAdminAccount(AdminUserDTO account) {
        if (account == null || account.getAuthorities() == null) {
            return false;
        }
        java.util.Set<String> authorities = account.getAuthorities();
        return authorities.contains(AuthoritiesConstants.ADMIN)
            || authorities.contains("SUPER_ADMIN")
            || authorities.contains("ROLE_SUPER_ADMIN");
    }

    private String computeDisplayRole(AdminUserDTO account, TraderDTO trader) {
        if (account == null) {
            return "USER";
        }

        if (account.getId() != null) {
            return userTraderRepository
                .findFirstByUserIdAndPrimaryMappingTrue(account.getId())
                .map(mapping -> {
                    String roleInTrader = mapping.getRoleInTrader();
                    if (roleInTrader == null || roleInTrader.isBlank()) {
                        return "TRADER_USER";
                    }
                    String normalized = roleInTrader.trim().toUpperCase();
                    if ("OWNER".equals(normalized)) {
                        return "TRADER_OWNER";
                    }
                    return normalized;
                })
                .orElseGet(() -> {
                    if (isAdminAccount(account)) {
                        java.util.Set<String> authorities = account.getAuthorities() != null ? account.getAuthorities() : java.util.Set.of();
                        if (authorities.contains("ROLE_SUPER_ADMIN") || authorities.contains("SUPER_ADMIN")) {
                            return "SUPER_ADMIN";
                        }
                        if (authorities.contains(AuthoritiesConstants.ADMIN)) {
                            return "ADMIN";
                        }
                    }
                    return "USER";
                });
        }

        if (isAdminAccount(account)) {
            java.util.Set<String> authorities = account.getAuthorities() != null ? account.getAuthorities() : java.util.Set.of();
            if (authorities.contains("ROLE_SUPER_ADMIN") || authorities.contains("SUPER_ADMIN")) {
                return "SUPER_ADMIN";
            }
            if (authorities.contains(AuthoritiesConstants.ADMIN)) {
                return "ADMIN";
            }
        }

        return "USER";
    }

    private com.mercotrace.domain.User resolveOrCreateUserForTrader(com.mercotrace.domain.Trader trader, String mobile) {
        // First, see if we already have a mapping for this trader.
        return userTraderRepository
            .findFirstByTraderIdAndPrimaryMappingTrue(trader.getId())
            .map(mapping -> {
                com.mercotrace.domain.User ownerUser = mapping.getUser();
                traderOwnerAuthorityService.ensureTraderOwnerAuthorities(ownerUser);
                return ownerUser;
            })
            .orElseGet(() -> createUserForTrader(trader, mobile));
    }

    private com.mercotrace.domain.User createUserForTrader(com.mercotrace.domain.Trader trader, String mobile) {
        String login = mobile + "@phone.mercotrace.com";
        String email = login;

        Optional<com.mercotrace.domain.User> existingByLogin = userRepository.findOneByLogin(login);
        com.mercotrace.domain.User user;
        if (existingByLogin.isPresent()) {
            user = existingByLogin.get();
        } else {
            AdminUserDTO userDTO = new AdminUserDTO();
            userDTO.setLogin(login);
            userDTO.setEmail(email);
            userDTO.setFirstName(trader.getOwnerName());
            Set<String> auths = new HashSet<>();
            auths.add(AuthoritiesConstants.USER);
            userDTO.setAuthorities(auths);

            String password = "phone-otp-login";
            user = userService.registerUser(userDTO, password);
            user.setActivated(true);
            user.setActivationKey(null);
            user = userRepository.save(user);
        }

        // Ensure mapping exists between this user and trader
        final com.mercotrace.domain.User currentUser = user;
        final com.mercotrace.domain.Trader currentTrader = trader;
        userTraderRepository
            .findFirstByTraderIdAndPrimaryMappingTrue(currentTrader.getId())
            .orElseGet(() -> {
                com.mercotrace.domain.UserTrader mapping = new com.mercotrace.domain.UserTrader();
                mapping.setUser(currentUser);
                mapping.setTrader(currentTrader);
                mapping.setRoleInTrader("OWNER");
                mapping.setPrimaryMapping(true);
                return userTraderRepository.save(mapping);
            });

        // Ensure this OWNER user has full trader-module authorities.
        traderOwnerAuthorityService.ensureTraderOwnerAuthorities(user);

        return user;
    }
}
