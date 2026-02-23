package com.mercotrace.web.rest;

import com.mercotrace.repository.BusinessCategoryRepository;
import com.mercotrace.service.BusinessCategoryQueryService;
import com.mercotrace.service.BusinessCategoryService;
import com.mercotrace.service.criteria.BusinessCategoryCriteria;
import com.mercotrace.service.dto.BusinessCategoryDTO;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import tech.jhipster.web.util.HeaderUtil;
import tech.jhipster.web.util.PaginationUtil;
import tech.jhipster.web.util.ResponseUtil;

/**
 * REST controller for managing {@link com.mercotrace.domain.BusinessCategory}.
 */
@RestController
@RequestMapping("/api/business-categories")
public class BusinessCategoryResource {

    private static final Logger LOG = LoggerFactory.getLogger(BusinessCategoryResource.class);

    private static final String ENTITY_NAME = "businessCategory";

    @Value("${jhipster.clientApp.name}")
    private String applicationName;

    private final BusinessCategoryService businessCategoryService;

    private final BusinessCategoryRepository businessCategoryRepository;

    private final BusinessCategoryQueryService businessCategoryQueryService;

    public BusinessCategoryResource(
        BusinessCategoryService businessCategoryService,
        BusinessCategoryRepository businessCategoryRepository,
        BusinessCategoryQueryService businessCategoryQueryService
    ) {
        this.businessCategoryService = businessCategoryService;
        this.businessCategoryRepository = businessCategoryRepository;
        this.businessCategoryQueryService = businessCategoryQueryService;
    }

    /**
     * {@code POST  /business-categories} : Create a new businessCategory.
     *
     * @param businessCategoryDTO the businessCategoryDTO to create.
     * @return the {@link ResponseEntity} with status {@code 201 (Created)} and with body the new businessCategoryDTO, or with status {@code 400 (Bad Request)} if the businessCategory has already an ID.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PostMapping("")
    public ResponseEntity<BusinessCategoryDTO> createBusinessCategory(@Valid @RequestBody BusinessCategoryDTO businessCategoryDTO)
        throws URISyntaxException {
        LOG.debug("REST request to save BusinessCategory : {}", businessCategoryDTO);
        if (businessCategoryDTO.getId() != null) {
            throw new BadRequestAlertException("A new businessCategory cannot already have an ID", ENTITY_NAME, "idexists");
        }
        businessCategoryDTO = businessCategoryService.save(businessCategoryDTO);
        return ResponseEntity.created(new URI("/api/business-categories/" + businessCategoryDTO.getId()))
            .headers(HeaderUtil.createEntityCreationAlert(applicationName, true, ENTITY_NAME, businessCategoryDTO.getId().toString()))
            .body(businessCategoryDTO);
    }

    /**
     * {@code PUT  /business-categories/:id} : Updates an existing businessCategory.
     *
     * @param id the id of the businessCategoryDTO to save.
     * @param businessCategoryDTO the businessCategoryDTO to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated businessCategoryDTO,
     * or with status {@code 400 (Bad Request)} if the businessCategoryDTO is not valid,
     * or with status {@code 500 (Internal Server Error)} if the businessCategoryDTO couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PutMapping("/{id}")
    public ResponseEntity<BusinessCategoryDTO> updateBusinessCategory(
        @PathVariable(value = "id", required = false) final Long id,
        @Valid @RequestBody BusinessCategoryDTO businessCategoryDTO
    ) throws URISyntaxException {
        LOG.debug("REST request to update BusinessCategory : {}, {}", id, businessCategoryDTO);
        if (businessCategoryDTO.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, businessCategoryDTO.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        if (!businessCategoryRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        businessCategoryDTO = businessCategoryService.update(businessCategoryDTO);
        return ResponseEntity.ok()
            .headers(HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, businessCategoryDTO.getId().toString()))
            .body(businessCategoryDTO);
    }

    /**
     * {@code PATCH  /business-categories/:id} : Partial updates given fields of an existing businessCategory, field will ignore if it is null
     *
     * @param id the id of the businessCategoryDTO to save.
     * @param businessCategoryDTO the businessCategoryDTO to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated businessCategoryDTO,
     * or with status {@code 400 (Bad Request)} if the businessCategoryDTO is not valid,
     * or with status {@code 404 (Not Found)} if the businessCategoryDTO is not found,
     * or with status {@code 500 (Internal Server Error)} if the businessCategoryDTO couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PatchMapping(value = "/{id}", consumes = { "application/json", "application/merge-patch+json" })
    public ResponseEntity<BusinessCategoryDTO> partialUpdateBusinessCategory(
        @PathVariable(value = "id", required = false) final Long id,
        @NotNull @RequestBody BusinessCategoryDTO businessCategoryDTO
    ) throws URISyntaxException {
        LOG.debug("REST request to partial update BusinessCategory partially : {}, {}", id, businessCategoryDTO);
        if (businessCategoryDTO.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, businessCategoryDTO.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        if (!businessCategoryRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        Optional<BusinessCategoryDTO> result = businessCategoryService.partialUpdate(businessCategoryDTO);

        return ResponseUtil.wrapOrNotFound(
            result,
            HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, businessCategoryDTO.getId().toString())
        );
    }

    /**
     * {@code GET  /business-categories} : get all the businessCategories.
     *
     * @param pageable the pagination information.
     * @param criteria the criteria which the requested entities should match.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the list of businessCategories in body.
     */
    @GetMapping("")
    public ResponseEntity<List<BusinessCategoryDTO>> getAllBusinessCategories(
        BusinessCategoryCriteria criteria,
        @org.springdoc.core.annotations.ParameterObject Pageable pageable
    ) {
        LOG.debug("REST request to get BusinessCategories by criteria: {}", criteria);

        Page<BusinessCategoryDTO> page = businessCategoryQueryService.findByCriteria(criteria, pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    /**
     * {@code GET  /business-categories/count} : count all the businessCategories.
     *
     * @param criteria the criteria which the requested entities should match.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the count in body.
     */
    @GetMapping("/count")
    public ResponseEntity<Long> countBusinessCategories(BusinessCategoryCriteria criteria) {
        LOG.debug("REST request to count BusinessCategories by criteria: {}", criteria);
        return ResponseEntity.ok().body(businessCategoryQueryService.countByCriteria(criteria));
    }

    /**
     * {@code GET  /business-categories/:id} : get the "id" businessCategory.
     *
     * @param id the id of the businessCategoryDTO to retrieve.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the businessCategoryDTO, or with status {@code 404 (Not Found)}.
     */
    @GetMapping("/{id}")
    public ResponseEntity<BusinessCategoryDTO> getBusinessCategory(@PathVariable("id") Long id) {
        LOG.debug("REST request to get BusinessCategory : {}", id);
        Optional<BusinessCategoryDTO> businessCategoryDTO = businessCategoryService.findOne(id);
        return ResponseUtil.wrapOrNotFound(businessCategoryDTO);
    }

    /**
     * {@code DELETE  /business-categories/:id} : delete the "id" businessCategory.
     *
     * @param id the id of the businessCategoryDTO to delete.
     * @return the {@link ResponseEntity} with status {@code 204 (NO_CONTENT)}.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBusinessCategory(@PathVariable("id") Long id) {
        LOG.debug("REST request to delete BusinessCategory : {}", id);
        businessCategoryService.delete(id);
        return ResponseEntity.noContent()
            .headers(HeaderUtil.createEntityDeletionAlert(applicationName, true, ENTITY_NAME, id.toString()))
            .build();
    }
}
