package com.mercotrace.web.rest;

import com.mercotrace.repository.ContactRepository;
import com.mercotrace.service.ContactService;
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

    public ContactResource(ContactService contactService, ContactRepository contactRepository) {
        this.contactService = contactService;
        this.contactRepository = contactRepository;
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
    public ResponseEntity<ContactDTO> createContact(@Valid @RequestBody ContactDTO contactDTO) throws URISyntaxException {
        LOG.debug("REST request to save Contact : {}", contactDTO);
        if (contactDTO.getId() != null) {
            throw new BadRequestAlertException("A new contact cannot already have an ID", ENTITY_NAME, "idexists");
        }

        // Resolve trader ownership (for module 1 we default to trader 1 when not provided)
        Long traderId = resolveTraderId(contactDTO);
        contactDTO.setTraderId(traderId);

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

        if (!contactRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        Long traderId = resolveTraderId(contactDTO);
        contactDTO.setTraderId(traderId);

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

        if (!contactRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
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
    public ResponseEntity<List<ContactDTO>> getAllContacts() {
        LOG.debug("REST request to get all Contacts");
        // For now just return all; later we can introduce criteria or trader scoping in the service.
        List<ContactDTO> list = contactRepository.findAll().stream().map(contactEntity ->
            contactService.findOne(contactEntity.getId()).orElse(null)
        ).filter(java.util.Objects::nonNull).toList();
        return ResponseEntity.ok().body(list);
    }

    /**
     * {@code GET  /contacts/:id} : get the "id" contact.
     *
     * @param id the id of the contactDTO to retrieve.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the contactDTO, or with status {@code 404 (Not Found)}.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ContactDTO> getContact(@PathVariable("id") Long id) {
        LOG.debug("REST request to get Contact : {}", id);
        Optional<ContactDTO> contactDTO = contactService.findOne(id);
        return ResponseUtil.wrapOrNotFound(contactDTO);
    }

    private Long resolveTraderId(ContactDTO contactDTO) {
        if (contactDTO.getTraderId() != null) {
            return contactDTO.getTraderId();
        }
        // TODO: Integrate with authenticated trader context; for module 1 we assume trader 1.
        return 1L;
    }

    /**
     * {@code DELETE  /contacts/:id} : delete the "id" contact.
     *
     * @param id the id of the contactDTO to delete.
     * @return the {@link ResponseEntity} with status {@code 204 (NO_CONTENT)}.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContact(@PathVariable("id") Long id) {
        LOG.debug("REST request to delete Contact : {}", id);
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
    public ResponseEntity<List<ContactDTO>> searchContactsByMark(
        @RequestParam(value = "traderId", required = false) Long traderId,
        @RequestParam("mark") String mark
    ) {
        LOG.debug("REST request to search Contacts by mark. traderId={}, mark={}", traderId, mark);
        List<ContactDTO> list;
        if (traderId == null) {
            // Fallback: search across all traders if traderId is not provided.
            list = contactRepository
                .findAll()
                .stream()
                .filter(c -> c.getMark() != null && c.getMark().toLowerCase().contains(mark.toLowerCase()))
                .map(c -> contactService.findOne(c.getId()).orElse(null))
                .filter(java.util.Objects::nonNull)
                .toList();
        } else {
            list = contactService.searchByMark(traderId, mark);
        }
        return ResponseEntity.ok().body(list);
    }
}

