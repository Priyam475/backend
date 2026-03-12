package com.mercotrace.web.rest;

import static com.mercotrace.security.SecurityUtils.AUTHORITIES_CLAIM;
import static com.mercotrace.security.SecurityUtils.CONTACT_ID_CLAIM;
import static com.mercotrace.security.SecurityUtils.JWT_ALGORITHM;
import static com.mercotrace.security.SecurityUtils.TOKEN_TYPE_CLAIM;
import static com.mercotrace.security.SecurityUtils.TOKEN_TYPE_CONTACT;

import com.mercotrace.domain.Contact;
import com.mercotrace.repository.ContactRepository;
import com.mercotrace.service.ContactOtpService;
import com.mercotrace.service.ContactIdentityService;
import com.mercotrace.service.dto.ContactDTO;
import com.mercotrace.service.mapper.ContactMapper;
import com.mercotrace.web.rest.errors.BadRequestAlertException;
import com.mercotrace.web.rest.errors.ServiceUnavailableAlertException;
import com.mercotrace.web.rest.errors.UnauthorizedAlertException;
import com.mercotrace.web.rest.vm.ContactRegisterVM;
import com.mercotrace.web.rest.vm.ContactOtpRequestVM;
import com.mercotrace.web.rest.vm.ContactOtpVerifyVM;
import com.mercotrace.web.rest.vm.ContactOtpVerifyResponseVM;
import com.mercotrace.web.rest.vm.ContactPortalSessionVM;
import jakarta.validation.Valid;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Authentication API for the Contact Portal.
 *
 * Base paths:
 * - POST /api/auth/register-contact  — self-onboarding for contacts (seller/buyer/broker)
 * - POST /api/portal/auth/login     — contact login (phone/email + password)
 * - GET  /api/portal/me             — bootstrap current contact session
 *
 * JWTs issued here are scoped with token_type=CONTACT and carry contactId claim.
 * They are consumed only by the /api/portal/** security chain.
 */
@RestController
@RequestMapping("/api")
public class ContactAuthResource {

    private static final Logger LOG = LoggerFactory.getLogger(ContactAuthResource.class);

    private static final Set<String> ALLOWED_CONTACT_TYPES = Set.of("BUYER", "BROKER", "AGENT", "SELLER");

    private final ContactRepository contactRepository;

    private final ContactMapper contactMapper;

    private final PasswordEncoder passwordEncoder;

    private final JwtEncoder jwtEncoder;

    private final ContactOtpService contactOtpService;

    private final ContactIdentityService contactIdentityService;

    @Value("${jhipster.security.authentication.jwt.token-validity-in-seconds:0}")
    private long tokenValidityInSeconds;

    @Value("${jhipster.security.authentication.jwt.token-validity-in-seconds-for-remember-me:0}")
    private long tokenValidityInSecondsForRememberMe;

    @Value("${application.security.cookie.secure:true}")
    private boolean cookieSecure;

    @Value("${otp.fast2sms.api-key:}")
    private String otpApiKey;

    public ContactAuthResource(
        ContactRepository contactRepository,
        ContactMapper contactMapper,
        PasswordEncoder passwordEncoder,
        JwtEncoder jwtEncoder,
        ContactOtpService contactOtpService,
        ContactIdentityService contactIdentityService
    ) {
        this.contactRepository = contactRepository;
        this.contactMapper = contactMapper;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.contactOtpService = contactOtpService;
        this.contactIdentityService = contactIdentityService;
    }

    /**
     * POST /auth/register-contact — self-onboard a new contact identity.
     *
     * Minimal required fields:
     * - phone (10-digit mobile)
     * - password (>= 6 chars)
     * Optional:
     * - email
     * - name
     * - type (required in UI; one of BUYER, BROKER, AGENT, SELLER)
     *
     * On success, returns ContactDTO and issues a CONTACT JWT via httpOnly cookie.
     */
    @PostMapping("/auth/register-contact")
    public ResponseEntity<ContactDTO> registerContact(@Valid @RequestBody ContactRegisterVM vm) {
        String phone = contactIdentityService.normalizePhoneOrThrow(vm.getPhone());
        String email = contactIdentityService.normalizeEmail(vm.getEmail());

        if (vm.getPassword() == null || vm.getPassword().length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");
        }

        String rawType = vm.getType();
        if (rawType == null || rawType.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Contact type is required");
        }
        String normalizedType = rawType.trim().toUpperCase();
        if (!ALLOWED_CONTACT_TYPES.contains(normalizedType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid contact type");
        }

        // Enforce uniqueness among login-capable contacts.
        contactIdentityService.assertNoLoginConflictForRegistration(phone, email);

        Optional<Contact> existingByPhone = contactRepository.findOneByPhone(phone);
        Contact contact = existingByPhone.orElseGet(Contact::new);
        contact.setPhone(phone);
        if (vm.getName() != null && !vm.getName().isBlank()) {
            contact.setName(vm.getName().trim());
        } else if (contact.getName() == null) {
            contact.setName(phone);
        }
        if (email != null && !email.isBlank()) {
            contact.setEmail(email);
        }
        contact.setPasswordHash(passwordEncoder.encode(vm.getPassword()));
        contact.setCanLogin(true);
        contact.setType(normalizedType);
        if (contact.getCreatedAt() == null) {
            contact.setCreatedAt(Instant.now());
        }
        if (contact.getOpeningBalance() == null) {
            contact.setOpeningBalance(java.math.BigDecimal.ZERO);
        }
        if (contact.getCurrentBalance() == null) {
            contact.setCurrentBalance(java.math.BigDecimal.ZERO);
        }

        Contact saved = contactRepository.save(contact);
        ContactDTO dto = contactMapper.toDto(saved);

        String jwt = createContactToken(saved, false, Set.of(new SimpleGrantedAuthority("ROLE_CONTACT")));
        HttpHeaders headers = buildAuthHeaders(jwt);

        return ResponseEntity.status(HttpStatus.CREATED).headers(headers).body(dto);
    }

    /**
     * POST /portal/auth/login — login existing contact by phone/email + password.
     */
    @PostMapping("/portal/auth/login")
    public ResponseEntity<ContactDTO> login(@Valid @RequestBody ContactRegisterVM vm) {
        String identifier = vm.getPhone();
        String password = vm.getPassword();

        if (password == null || password.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");
        }
        if (identifier == null || identifier.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone or email is required");
        }

        Optional<Contact> contactOpt;
        if (identifier.contains("@")) {
            String email = normalizeEmail(identifier);
            contactOpt = contactRepository.findOneByEmailIgnoreCase(email);
        } else {
            String phone = normalizePhone(identifier);
            contactOpt = contactRepository.findOneByPhone(phone);
        }

        Contact contact = contactOpt.orElseThrow(() ->
            new UnauthorizedAlertException(
                "The email or password you entered is incorrect. Please try again.",
                "contactPortal",
                "contactPortal.login.invalidCredentials"
            )
        );

        if (!Boolean.TRUE.equals(contact.getCanLogin())) {
            throw new UnauthorizedAlertException(
                "Your contact account is disabled. Please contact support.",
                "contactPortal",
                "contactPortal.login.disabled"
            );
        }

        if (contact.getPasswordHash() == null || !passwordEncoder.matches(password, contact.getPasswordHash())) {
            throw new UnauthorizedAlertException(
                "The email or password you entered is incorrect. Please try again.",
                "contactPortal",
                "contactPortal.login.invalidCredentials"
            );
        }

        String jwt = createContactToken(contact, false, Set.of(new SimpleGrantedAuthority("ROLE_CONTACT")));
        HttpHeaders headers = buildAuthHeaders(jwt);

        ContactDTO dto = contactMapper.toDto(contact);
        return ResponseEntity.ok().headers(headers).body(dto);
    }

    /**
     * POST /portal/auth/otp/request — request OTP for contact or guest login.
     *
     * Accepts a phone number as identifier. OTP is generated for any valid
     * 10-digit mobile number when the provider is configured. Actual contact
     * lookup and login/guest decision happens during OTP verification.
     */
    @PostMapping("/portal/auth/otp/request")
    public ResponseEntity<Map<String, String>> requestOtp(
        @Valid @RequestBody ContactOtpRequestVM vm,
        HttpServletRequest request
    ) {
        String identifier = vm.getIdentifier();
        if (identifier == null || identifier.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number is required");
        }

        if (otpApiKey == null || otpApiKey.isBlank()) {
            throw new ServiceUnavailableAlertException(
                "We are unable to send OTPs right now. Please try again later or contact support.",
                "contactPortal",
                "otp.provider.not_configured"
            );
        }

        String phone = normalizePhone(identifier);

        try {
            String clientIp = request.getRemoteAddr();
            contactOtpService.generateOtpForMobile(phone, clientIp);
        } catch (ContactOtpService.ContactOtpRateLimitExceededException ex) {
            throw new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Too many OTP requests. Please try again later."
            );
        }

        return ResponseEntity.ok(Map.of("status", "OK"));
    }

    /**
     * POST /portal/auth/otp/verify — verify OTP and issue CONTACT or guest CONTACT JWT.
     *
     * Uses phone as identifier. If a login-enabled contact exists for the
     * verified mobile, a CONTACT token is issued and the full ContactDTO is
     * returned. If no such contact exists, a short-lived CONTACT token with
     * guest authority is issued and the response is marked as guest=true
     * without creating or persisting any contact record.
     */
    @PostMapping("/portal/auth/otp/verify")
    public ResponseEntity<ContactOtpVerifyResponseVM> verifyOtp(@Valid @RequestBody ContactOtpVerifyVM vm) {
        String identifier = vm.getIdentifier();
        String otp = vm.getOtp();

        if (identifier == null || identifier.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone or email is required");
        }

        String phone = normalizePhone(identifier);

        ContactOtpService.OtpValidationStatus status = contactOtpService.validateOtp(phone, otp);
        if (
            status == ContactOtpService.OtpValidationStatus.EXPIRED ||
            status == ContactOtpService.OtpValidationStatus.NOT_FOUND ||
            status == ContactOtpService.OtpValidationStatus.INVALID
        ) {
            throw new BadRequestAlertException(
                "The OTP you entered is invalid or has expired. Please request a new one.",
                "contactPortal",
                "otp.invalid_or_expired"
            );
        }
        if (status == ContactOtpService.OtpValidationStatus.TOO_MANY_ATTEMPTS) {
            throw new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Too many attempts. Please request a new OTP."
            );
        }

        Optional<Contact> contactOpt = contactRepository
            .findOneByPhone(phone)
            .filter(c -> Boolean.TRUE.equals(c.getCanLogin()));

        if (contactOpt.isPresent()) {
            Contact contact = contactOpt.get();
            String jwt = createContactToken(contact, false, Set.of(new SimpleGrantedAuthority("ROLE_CONTACT")));
            HttpHeaders headers = buildAuthHeaders(jwt);
            ContactDTO dto = contactMapper.toDto(contact);
            ContactOtpVerifyResponseVM body = new ContactOtpVerifyResponseVM(false, phone, dto);
            return ResponseEntity.ok().headers(headers).body(body);
        } else {
            String jwt = createGuestContactToken(phone);
            HttpHeaders headers = buildAuthHeaders(jwt);
            ContactOtpVerifyResponseVM body = new ContactOtpVerifyResponseVM(true, phone, null);
            return ResponseEntity.ok().headers(headers).body(body);
        }
    }

    /**
     * GET /portal/me — bootstrap current contact based on CONTACT JWT.
     *
     * This relies on the /api/portal/** security filter chain to validate the token
     * and only allows CONTACT tokens. We then resolve the contactId claim.
     */
    @GetMapping("/portal/me")
    public ContactDTO me(org.springframework.security.core.Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt jwt)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Contact not authenticated");
        }
        Object rawContactId = jwt.getClaim(CONTACT_ID_CLAIM);
        if (rawContactId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Contact not authenticated");
        }
        Long contactId;
        try {
            contactId = Long.valueOf(rawContactId.toString());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Contact not authenticated");
        }

        Contact contact = contactRepository
            .findById(contactId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Contact not found"));

        return contactMapper.toDto(contact);
    }

    /**
     * GET /portal/session — return the current Contact Portal session.
     *
     * For CONTACT tokens (ROLE_CONTACT with contactId claim) this returns the persisted
     * ContactDTO. For guest CONTACT tokens (ROLE_CONTACT_GUEST without contactId), this
     * returns guest=true with only the verified phone number from the JWT subject.
     */
    @GetMapping("/portal/session")
    public ContactPortalSessionVM session(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Contact not authenticated");
        }

        boolean isGuest = authentication
            .getAuthorities()
            .stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch(auth -> "ROLE_CONTACT_GUEST".equals(auth));

        if (isGuest) {
            String subject = jwt.getSubject();
            String phone = subject != null ? subject : "";
            return new ContactPortalSessionVM(true, phone, null);
        }

        Object rawContactId = jwt.getClaim(CONTACT_ID_CLAIM);
        if (rawContactId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Contact not authenticated");
        }
        Long contactId;
        try {
            contactId = Long.valueOf(rawContactId.toString());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Contact not authenticated");
        }

        Contact contact = contactRepository
            .findById(contactId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Contact not found"));

        return new ContactPortalSessionVM(false, contact.getPhone(), contactMapper.toDto(contact));
    }

    /**
     * POST /portal/auth/logout — clear ACCESS_TOKEN cookie for contact portal sessions.
     *
     * Like other logout endpoints, this is purely client-facing and instructs the
     * browser to delete the httpOnly ACCESS_TOKEN cookie. JWTs remain stateless
     * and will naturally expire according to their validity window.
     */
    @PostMapping("/portal/auth/logout")
    public ResponseEntity<Void> contactLogout() {
        ResponseCookie deleteCookie = ResponseCookie
            .from("ACCESS_TOKEN", "")
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite("Lax")
            .path("/")
            .maxAge(0)
            .build();
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.SET_COOKIE, deleteCookie.toString());
        return ResponseEntity.noContent().headers(headers).build();
    }

    private String normalizePhone(String phone) {
        if (phone == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number is required");
        }
        String digits = phone.replaceAll("\\D", "");
        if (!digits.matches("^[6-9]\\d{9}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid 10-digit mobile number");
        }
        return digits;
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String trimmed = email.trim();
        return trimmed.isEmpty() ? null : trimmed.toLowerCase();
    }

    private String createContactToken(Contact contact, boolean rememberMe, Set<? extends GrantedAuthority> authorities) {
        String authoritiesClaim = authorities.stream().map(GrantedAuthority::getAuthority).collect(Collectors.joining(" "));

        Instant now = Instant.now();
        Instant validity = rememberMe
            ? now.plus(this.tokenValidityInSecondsForRememberMe, ChronoUnit.SECONDS)
            : now.plus(this.tokenValidityInSeconds, ChronoUnit.SECONDS);

        JwtClaimsSet claims = JwtClaimsSet
            .builder()
            .issuedAt(now)
            .expiresAt(validity)
            .subject(contact.getPhone())
            .claim(AUTHORITIES_CLAIM, authoritiesClaim)
            .claim(TOKEN_TYPE_CLAIM, TOKEN_TYPE_CONTACT)
            .claim(CONTACT_ID_CLAIM, contact.getId())
            .build();

        JwsHeader jwsHeader = JwsHeader.with(JWT_ALGORITHM).build();
        return this.jwtEncoder.encode(JwtEncoderParameters.from(jwsHeader, claims)).getTokenValue();
    }

    private String createGuestContactToken(String phone) {
        String authoritiesClaim = "ROLE_CONTACT_GUEST";

        Instant now = Instant.now();
        Instant validity = now.plus(this.tokenValidityInSeconds, ChronoUnit.SECONDS);

        JwtClaimsSet claims = JwtClaimsSet
            .builder()
            .issuedAt(now)
            .expiresAt(validity)
            .subject(phone)
            .claim(AUTHORITIES_CLAIM, authoritiesClaim)
            .claim(TOKEN_TYPE_CLAIM, TOKEN_TYPE_CONTACT)
            .build();

        JwsHeader jwsHeader = JwsHeader.with(JWT_ALGORITHM).build();
        return this.jwtEncoder.encode(JwtEncoderParameters.from(jwsHeader, claims)).getTokenValue();
    }

    private HttpHeaders buildAuthHeaders(String jwt) {
        HttpHeaders httpHeaders = new HttpHeaders();
        httpHeaders.setBearerAuth(jwt);
        ResponseCookie cookie = ResponseCookie
            .from("ACCESS_TOKEN", jwt)
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite("Lax")
            .path("/")
            .build();
        httpHeaders.add(HttpHeaders.SET_COOKIE, cookie.toString());
        return httpHeaders;
    }
}

