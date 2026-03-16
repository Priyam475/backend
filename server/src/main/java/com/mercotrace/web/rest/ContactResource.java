package com.mercotrace.web.rest;

import com.mercotrace.repository.ContactRepository;
import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.service.ContactIdentityService;
import com.mercotrace.service.ContactService;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.dto.ContactDTO;
import com.mercotrace.web.rest.errors.BadRequestAlertException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import tech.jhipster.web.util.HeaderUtil;
import tech.jhipster.web.util.ResponseUtil;

/**
 * REST controller for managing {@link com.mercotrace.domain.Contact}.
 *
 * Note: This controller is intentionally kept simple (no criteria/pagination)
 * because the frontend loads all contacts client-side and performs its own filtering.
 */
@RestController
@RequestMapping("/api/contacts")
public class ContactResource {

    private static final Logger LOG = LoggerFactory.getLogger(ContactResource.class);

    private static final String ENTITY_NAME = "contact";

    @Value("${jhipster.clientApp.name}")
    private String applicationName;

    private final ContactService contactService;

    private final ContactRepository contactRepository;

    private final TraderContextService traderContextService;

    private final ContactIdentityService contactIdentityService;

    public ContactResource(
        ContactService contactService,
        ContactRepository contactRepository,
        TraderContextService traderContextService,
        ContactIdentityService contactIdentityService
    ) {
        this.contactService = contactService;
        this.contactRepository = contactRepository;
        this.traderContextService = traderContextService;
        this.contactIdentityService = contactIdentityService;
    }

    /**
     * {@code POST  /contacts} : Create a new contact.
     *
     * @param contactDTO the contactDTO to create.
     * @return the {@link ResponseEntity} with status {@code 201 (Created)} and with body the new contactDTO,
     * or with status {@code 400 (Bad Request)} if the contact has already an ID.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PostMapping("")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.CONTACTS_CREATE + "\")")
    public ResponseEntity<ContactDTO> createContact(@Valid @RequestBody ContactDTO contactDTO) throws URISyntaxException {
        LOG.debug("REST request to save Contact : {}", contactDTO);
        if (contactDTO.getId() != null) {
            throw new BadRequestAlertException("A new contact cannot already have an ID", ENTITY_NAME, "idexists");
        }

        // Resolve trader ownership from authenticated user
        Long traderId = resolveTraderId();
        contactDTO.setTraderId(traderId);

        // Enforce global mobile uniqueness across trader owner, trader staff and contacts
        contactIdentityService.assertMobileAvailableForContact(contactDTO.getPhone(), null);

        // Enforce phone uniqueness per trader, aligned with frontend validation
        if (contactRepository.findOneByTraderIdAndPhone(traderId, contactDTO.getPhone()).isPresent()) {
            throw new BadRequestAlertException("This phone number is already registered", ENTITY_NAME, "phoneexists");
        }

        contactDTO = contactService.save(contactDTO);
        return ResponseEntity.created(new URI("/api/contacts/" + contactDTO.getId()))
            .headers(HeaderUtil.createEntityCreationAlert(applicationName, true, ENTITY_NAME, contactDTO.getId().toString()))
            .body(contactDTO);
    }

    /**
     * {@code PUT  /contacts/:id} : Updates an existing contact.
     *
     * @param id the id of the contactDTO to save.
     * @param contactDTO the contactDTO to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated contactDTO,
     * or with status {@code 400 (Bad Request)} if the contactDTO is not valid,
     * or with status {@code 500 (Internal Server Error)} if the contactDTO couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.CONTACTS_EDIT + "\")")
    public ResponseEntity<ContactDTO> updateContact(
        @PathVariable(value = "id", required = false) final Long id,
        @Valid @RequestBody ContactDTO contactDTO
    ) throws URISyntaxException {
        LOG.debug("REST request to update Contact : {}, {}", id, contactDTO);
        if (contactDTO.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, contactDTO.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        Long traderId = resolveTraderId();
        contactService
            .findOne(id)
            .ifPresent(existing -> {
                if (!Objects.equals(existing.getTraderId(), traderId)) {
                    throw new BadRequestAlertException("You are not allowed to modify this contact", ENTITY_NAME, "forbidden");
                }
            });

        contactDTO.setTraderId(traderId);

        // Enforce global mobile uniqueness across trader owner, trader staff and contacts (exclude current contact)
        contactIdentityService.assertMobileAvailableForContact(contactDTO.getPhone(), id);

        // Enforce phone uniqueness per trader, excluding the current record
        contactRepository
            .findOneByTraderIdAndPhone(traderId, contactDTO.getPhone())
            .ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new BadRequestAlertException("This phone number is already registered", ENTITY_NAME, "phoneexists");
                }
            });

        contactDTO = contactService.update(contactDTO);
        return ResponseEntity.ok()
            .headers(HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, contactDTO.getId().toString()))
            .body(contactDTO);
    }

    /**
     * {@code PATCH  /contacts/:id} : Partial updates given fields of an existing contact, field will ignore if it is null.
     *
     * @param id the id of the contactDTO to save.
     * @param contactDTO the contactDTO to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated contactDTO,
     * or with status {@code 400 (Bad Request)} if the contactDTO is not valid,
     * or with status {@code 404 (Not Found)} if the contactDTO is not found,
     * or with status {@code 500 (Internal Server Error)} if the contactDTO couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PatchMapping(value = "/{id}", consumes = { "application/json", "application/merge-patch+json" })
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.CONTACTS_EDIT + "\")")
    public ResponseEntity<ContactDTO> partialUpdateContact(
        @PathVariable(value = "id", required = false) final Long id,
        @NotNull @RequestBody ContactDTO contactDTO
    ) throws URISyntaxException {
        LOG.debug("REST request to partial update Contact partially : {}, {}", id, contactDTO);
        if (contactDTO.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, contactDTO.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        Long traderId = resolveTraderId();
        contactService
            .findOne(id)
            .ifPresent(existing -> {
                if (!Objects.equals(existing.getTraderId(), traderId)) {
                    throw new BadRequestAlertException("You are not allowed to modify this contact", ENTITY_NAME, "forbidden");
                }
            });

        // If phone is being updated, enforce global mobile uniqueness
        if (contactDTO.getPhone() != null) {
            contactIdentityService.assertMobileAvailableForContact(contactDTO.getPhone(), id);
        }

        Optional<ContactDTO> result = contactService.partialUpdate(contactDTO);

        return ResponseUtil.wrapOrNotFound(
            result,
            HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, contactDTO.getId().toString())
        );
    }

    /**
     * {@code GET  /contacts} : get all the contacts.
     *
     * For module 1, this returns all contacts regardless of trader. Later we can scope to current trader.
     *
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the list of contacts in body.
     */
    @GetMapping("")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.CONTACTS_VIEW + "\")")
    public ResponseEntity<List<ContactDTO>> getAllContacts() {
        LOG.debug("REST request to get all Contacts for current trader");
        Long traderId = resolveTraderId();
        List<ContactDTO> list = contactService.findAllByTrader(traderId);
        return ResponseEntity.ok().body(list);
    }

    /**
     * {@code GET  /contacts/:id} : get the "id" contact.
     *
     * @param id the id of the contactDTO to retrieve.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the contactDTO, or with status {@code 404 (Not Found)}.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.CONTACTS_VIEW + "\")")
    public ResponseEntity<ContactDTO> getContact(@PathVariable("id") Long id) {
        LOG.debug("REST request to get Contact : {}", id);
        Long traderId = resolveTraderId();
        Optional<ContactDTO> contactDTO = contactService
            .findOne(id)
            .filter(dto -> Objects.equals(dto.getTraderId(), traderId));
        return ResponseUtil.wrapOrNotFound(contactDTO);
    }

    private Long resolveTraderId() {
        return traderContextService.getCurrentTraderId();
    }

    /**
     * {@code DELETE  /contacts/:id} : delete the "id" contact.
     *
     * @param id the id of the contactDTO to delete.
     * @return the {@link ResponseEntity} with status {@code 204 (NO_CONTENT)}.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.CONTACTS_DELETE + "\")")
    public ResponseEntity<Void> deleteContact(@PathVariable("id") Long id) {
        LOG.debug("REST request to delete Contact : {}", id);
        Long traderId = resolveTraderId();
        Optional<ContactDTO> existing = contactService.findOne(id);
        if (existing.isEmpty() || !Objects.equals(existing.get().getTraderId(), traderId)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }
        contactService.delete(id);
        return ResponseEntity.noContent()
            .headers(HeaderUtil.createEntityDeletionAlert(applicationName, true, ENTITY_NAME, id.toString()))
            .build();
    }

    /**
     * {@code GET  /contacts/search} : search contacts by mark for a trader.
     *
     * @param traderId the trader id (optional for now).
     * @param mark the mark fragment.
     * @return the list of matching contacts.
     */
    @GetMapping("/search")
    public ResponseEntity<List<ContactDTO>> searchContactsByMark(@RequestParam("mark") String mark) {
        Long traderId = resolveTraderId();
        LOG.debug("REST request to search Contacts by mark for current trader. traderId={}, mark={}", traderId, mark);
        List<ContactDTO> list = contactService.searchByMark(traderId, mark);
        return ResponseEntity.ok().body(list);
    }
}

