package com.mercotrace.contact.portal.web.rest;

import com.mercotrace.contact.portal.service.ContactPortalService;
import com.mercotrace.contact.portal.service.dto.ContactPortalArrivalDTO;
import com.mercotrace.contact.portal.service.dto.ContactPortalProfileUpdateDTO;
import com.mercotrace.contact.portal.service.dto.ContactPortalPurchaseDTO;
import com.mercotrace.contact.portal.service.dto.ContactPortalStatementDTO;
import com.mercotrace.security.SecurityUtils;
import com.mercotrace.service.dto.ContactDTO;
import jakarta.validation.Valid;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Contact Portal endpoints for arrivals, purchases, statements and profile.
 *
 * Base path: /api/portal/*
 * Secured by the CONTACT token chain in SecurityConfiguration.
 */
@RestController
@RequestMapping("/api/portal")
public class ContactPortalResource {

    private static final Logger LOG = LoggerFactory.getLogger(ContactPortalResource.class);

    private final ContactPortalService contactPortalService;

    public ContactPortalResource(ContactPortalService contactPortalService) {
        this.contactPortalService = contactPortalService;
    }

    @GetMapping("/arrivals")
    @PreAuthorize("hasAuthority('ROLE_CONTACT')")
    public List<ContactPortalArrivalDTO> getArrivals(
        Authentication authentication,
        @RequestParam(name = "limit", defaultValue = "50") int limit
    ) {
        Long contactId = getCurrentContactId(authentication);
        return contactPortalService.getArrivalsForContact(contactId, Math.min(Math.max(limit, 1), 200));
    }

    @GetMapping("/purchases")
    @PreAuthorize("hasAuthority('ROLE_CONTACT')")
    public List<ContactPortalPurchaseDTO> getPurchases(
        Authentication authentication,
        @RequestParam(name = "limit", defaultValue = "50") int limit
    ) {
        Long contactId = getCurrentContactId(authentication);
        return contactPortalService.getPurchasesForContact(contactId, Math.min(Math.max(limit, 1), 200));
    }

    @GetMapping("/statements")
    @PreAuthorize("hasAuthority('ROLE_CONTACT')")
    public List<ContactPortalStatementDTO> getStatements(
        Authentication authentication,
        @RequestParam(name = "limit", defaultValue = "100") int limit
    ) {
        Long contactId = getCurrentContactId(authentication);
        return contactPortalService.getStatementsForContact(contactId, Math.min(Math.max(limit, 1), 500));
    }

    @GetMapping("/settlements")
    @PreAuthorize("hasAuthority('ROLE_CONTACT')")
    public List<ContactPortalStatementDTO> getSettlements(
        Authentication authentication,
        @RequestParam(name = "limit", defaultValue = "100") int limit
    ) {
        Long contactId = getCurrentContactId(authentication);
        return contactPortalService.getSettlementsForContact(contactId, Math.min(Math.max(limit, 1), 500));
    }

    @PutMapping("/profile")
    @PreAuthorize("hasAuthority('ROLE_CONTACT')")
    public ResponseEntity<ContactDTO> updateProfile(
        Authentication authentication,
        @Valid @RequestBody ContactPortalProfileUpdateDTO update
    ) {
        Long contactId = getCurrentContactId(authentication);
        LOG.debug("Updating profile for contactId={}", contactId);
        ContactDTO dto = contactPortalService.updateProfile(contactId, update);
        return ResponseEntity.ok(dto);
    }

    private Long getCurrentContactId(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Contact not authenticated");
        }
        Object raw = jwt.getClaim(SecurityUtils.CONTACT_ID_CLAIM);
        if (raw == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Contact not authenticated");
        }
        try {
            return Long.valueOf(raw.toString());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Contact not authenticated");
        }
    }
}

