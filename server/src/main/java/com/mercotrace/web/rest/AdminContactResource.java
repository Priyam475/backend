package com.mercotrace.web.rest;

import com.mercotrace.domain.Contact;
import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.service.dto.ContactDTO;
import com.mercotrace.service.mapper.ContactMapper;
import com.mercotrace.repository.ContactRepository;
import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin-only REST controller for viewing {@link com.mercotrace.domain.Contact} records
 * across all traders.
 *
 * This controller is intentionally read-only and does not apply trader scoping.
 * Access is restricted to admin tokens via {@link AuthoritiesConstants#ADMIN}
 * and the admin security filter chain.
 */
@RestController
@RequestMapping("/api/admin/contacts")
@PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.ADMIN + "\")")
public class AdminContactResource {

    private static final Logger LOG = LoggerFactory.getLogger(AdminContactResource.class);

    private final ContactRepository contactRepository;

    private final ContactMapper contactMapper;

    public AdminContactResource(ContactRepository contactRepository, ContactMapper contactMapper) {
        this.contactRepository = contactRepository;
        this.contactMapper = contactMapper;
    }

    /**
     * {@code GET  /api/admin/contacts} : get all contacts across all traders.
     *
     * This endpoint is intentionally not trader-scoped and is meant for
     * supervisory/admin views. It is read-only; mutations should continue to
     * use the tenant-scoped {@link ContactResource}.
     *
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the list of contacts in body.
     */
    @GetMapping("")
    public ResponseEntity<List<ContactDTO>> getAllContactsForAdmin() {
        LOG.debug("REST request to get all Contacts (admin, unscoped)");
        List<Contact> entities = contactRepository.findAll();
        List<ContactDTO> dtoList = entities.stream().map(contactMapper::toDto).collect(Collectors.toList());
        return ResponseEntity.ok().body(dtoList);
    }
}

