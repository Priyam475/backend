package com.mercotrace.service;

import com.mercotrace.domain.Contact;
import com.mercotrace.repository.ContactRepository;
import com.mercotrace.repository.TraderRepository;
import com.mercotrace.repository.UserRepository;
import com.mercotrace.web.rest.errors.BadRequestAlertException;
import com.mercotrace.web.rest.errors.ConflictAlertException;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Shared validation and normalization for contact login identity fields.
 *
 * Centralizes rules for:
 * - Phone/email normalization
 * - Uniqueness of login-capable contacts (canLogin=true)
 */
@Service
@Transactional(readOnly = true)
public class ContactIdentityService {

    private final ContactRepository contactRepository;

    private final TraderRepository traderRepository;

    private final UserRepository userRepository;

    private final com.mercotrace.admin.identity.AdminUserRepository adminUserRepository;

    public ContactIdentityService(
        ContactRepository contactRepository,
        TraderRepository traderRepository,
        UserRepository userRepository,
        com.mercotrace.admin.identity.AdminUserRepository adminUserRepository
    ) {
        this.contactRepository = contactRepository;
        this.traderRepository = traderRepository;
        this.userRepository = userRepository;
        this.adminUserRepository = adminUserRepository;
    }

    public String normalizePhoneOrThrow(String phone) {
        if (phone == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number is required");
        }
        String digits = phone.replaceAll("\\D", "");
        if (!digits.matches("^[6-9]\\d{9}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid 10-digit mobile number");
        }
        return digits;
    }

    public String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String trimmed = email.trim();
        return trimmed.isEmpty() ? null : trimmed.toLowerCase();
    }

    /**
     * Ensure there is no other login-capable contact with the given phone or email.
     * Used during self-registration.
     */
    public void assertNoLoginConflictForRegistration(String phone, String email) {
        if (phone == null || phone.isBlank()) {
            // Nothing to validate if phone is absent; caller should enforce required fields.
            return;
        }

        Optional<Contact> existingByPhone = contactRepository.findOneByPhone(phone);
        if (existingByPhone.isPresent() && Boolean.TRUE.equals(existingByPhone.get().getCanLogin())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A contact is already registered with this phone number");
        }

        if (email != null && !email.isBlank()) {
            contactRepository
                .findOneByEmailIgnoreCase(email)
                .ifPresent(existing -> {
                    if (Boolean.TRUE.equals(existing.getCanLogin())) {
                        throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "A contact is already registered with this email address"
                        );
                    }
                });
        }
    }

    /**
     * Ensure updated email for a contact does not conflict with another login-capable contact.
     */
    public void assertNoLoginConflictForEmailUpdate(Long contactId, String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        contactRepository
            .findOneByEmailIgnoreCase(email)
            .ifPresent(existing -> {
                if (!existing.getId().equals(contactId) && Boolean.TRUE.equals(existing.getCanLogin())) {
                    throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "A contact is already registered with this email address"
                    );
                }
            });
    }

    /**
     * Ensure the given mobile number is not already used by any trader owner, trader staff user,
     * admin user or another contact (other than the current one).
     *
     * This is used by the trader Contacts module so that contacts do not conflict with
     * login identities across the platform.
     */
    public void assertMobileAvailableForContact(String mobile, Long currentContactId) {
        if (mobile == null || mobile.isBlank()) {
            return;
        }

        String normalized = mobile.trim();

        // Check trader owner (Trader.mobile)
        traderRepository
            .findOneByMobile(normalized)
            .ifPresent(existing -> {
                throw new BadRequestAlertException("This mobile number is already in use.", "contact", "mobileinuse");
            });

        // Check trader staff user (User.mobile)
        userRepository
            .findOneByMobile(normalized)
            .ifPresent(existing -> {
                throw new BadRequestAlertException("This mobile number is already in use.", "contact", "mobileinuse");
            });

        // Check admin user (AdminUser.mobile)
        adminUserRepository
            .findOneByMobile(normalized)
            .ifPresent(existing -> {
                throw new BadRequestAlertException("This mobile number is already in use.", "contact", "mobileinuse");
            });

        // Check other contacts (Contact.phone)
        contactRepository
            .findOneByPhone(normalized)
            .ifPresent(existing -> {
                if (currentContactId == null || !existing.getId().equals(currentContactId)) {
                    throw new BadRequestAlertException("This mobile number is already in use.", "contact", "mobileinuse");
                }
            });
    }
}

