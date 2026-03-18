package com.mercotrace.web.rest;

import com.mercotrace.repository.TraderRepository;
import com.mercotrace.repository.UserTraderRepository;
import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.security.SecurityUtils;
import com.mercotrace.service.TraderQueryService;
import com.mercotrace.service.TraderService;
import com.mercotrace.service.criteria.TraderCriteria;
import com.mercotrace.service.dto.TraderDTO;
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
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import tech.jhipster.web.util.HeaderUtil;
import tech.jhipster.web.util.PaginationUtil;
import tech.jhipster.web.util.ResponseUtil;

/**
 * REST controller for managing {@link com.mercotrace.domain.Trader}.
 */
@RestController
@RequestMapping("/api/traders")
public class TraderResource {

    private static final Logger LOG = LoggerFactory.getLogger(TraderResource.class);

    private static final String ENTITY_NAME = "trader";

    @Value("${jhipster.clientApp.name}")
    private String applicationName;

    private final TraderService traderService;

    private final TraderRepository traderRepository;

    private final TraderQueryService traderQueryService;

    private final UserTraderRepository userTraderRepository;

    public TraderResource(TraderService traderService, TraderRepository traderRepository, TraderQueryService traderQueryService, UserTraderRepository userTraderRepository) {
        this.traderService = traderService;
        this.traderRepository = traderRepository;
        this.traderQueryService = traderQueryService;
        this.userTraderRepository = userTraderRepository;
    }

    /**
     * Returns true if the current user is allowed to access photos for the given trader:
     * - user is ROLE_ADMIN, or
     * - user has an active primary UserTrader mapping for this trader.
     */
    private boolean canAccessTraderPhotos(Long traderId) {
        if (SecurityUtils.hasCurrentUserThisAuthority(AuthoritiesConstants.ADMIN)) {
            return true;
        }
        return SecurityUtils.getCurrentUserId()
            .flatMap(userId -> userTraderRepository.findFirstByUserIdAndTraderIdAndPrimaryMappingTrueAndActiveTrue(userId, traderId))
            .isPresent();
    }

    /**
     * {@code POST  /traders} : Create a new trader.
     *
     * @param traderDTO the traderDTO to create.
     * @return the {@link ResponseEntity} with status {@code 201 (Created)} and with body the new traderDTO, or with status {@code 400 (Bad Request)} if the trader has already an ID.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PostMapping("")
    public ResponseEntity<TraderDTO> createTrader(@Valid @RequestBody TraderDTO traderDTO) throws URISyntaxException {
        LOG.debug("REST request to save Trader : {}", traderDTO);
        if (traderDTO.getId() != null) {
            throw new BadRequestAlertException("A new trader cannot already have an ID", ENTITY_NAME, "idexists");
        }
        traderDTO = traderService.save(traderDTO);
        return ResponseEntity.created(new URI("/api/traders/" + traderDTO.getId()))
            .headers(HeaderUtil.createEntityCreationAlert(applicationName, true, ENTITY_NAME, traderDTO.getId().toString()))
            .body(traderDTO);
    }

    /**
     * {@code PUT  /traders/:id} : Updates an existing trader.
     *
     * @param id the id of the traderDTO to save.
     * @param traderDTO the traderDTO to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated traderDTO,
     * or with status {@code 400 (Bad Request)} if the traderDTO is not valid,
     * or with status {@code 500 (Internal Server Error)} if the traderDTO couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PutMapping("/{id}")
    public ResponseEntity<TraderDTO> updateTrader(
        @PathVariable(value = "id", required = false) final Long id,
        @Valid @RequestBody TraderDTO traderDTO
    ) throws URISyntaxException {
        LOG.debug("REST request to update Trader : {}, {}", id, traderDTO);
        if (traderDTO.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, traderDTO.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        if (!traderRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        traderDTO = traderService.update(traderDTO);
        return ResponseEntity.ok()
            .headers(HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, traderDTO.getId().toString()))
            .body(traderDTO);
    }

    /**
     * {@code PATCH  /traders/:id} : Partial updates given fields of an existing trader, field will ignore if it is null
     *
     * @param id the id of the traderDTO to save.
     * @param traderDTO the traderDTO to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated traderDTO,
     * or with status {@code 400 (Bad Request)} if the traderDTO is not valid,
     * or with status {@code 404 (Not Found)} if the traderDTO is not found,
     * or with status {@code 500 (Internal Server Error)} if the traderDTO couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PatchMapping(value = "/{id}", consumes = { "application/json", "application/merge-patch+json" })
    public ResponseEntity<TraderDTO> partialUpdateTrader(
        @PathVariable(value = "id", required = false) final Long id,
        @NotNull @RequestBody TraderDTO traderDTO
    ) throws URISyntaxException {
        LOG.debug("REST request to partial update Trader partially : {}, {}", id, traderDTO);
        if (traderDTO.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, traderDTO.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        if (!traderRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        Optional<TraderDTO> result = traderService.partialUpdate(traderDTO);

        return ResponseUtil.wrapOrNotFound(
            result,
            HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, traderDTO.getId().toString())
        );
    }

    /**
     * {@code GET  /traders} : get all the traders.
     *
     * @param pageable the pagination information.
     * @param criteria the criteria which the requested entities should match.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the list of traders in body.
     */
    @GetMapping("")
    public ResponseEntity<List<TraderDTO>> getAllTraders(
        TraderCriteria criteria,
        @org.springdoc.core.annotations.ParameterObject Pageable pageable
    ) {
        LOG.debug("REST request to get Traders by criteria: {}", criteria);

        Page<TraderDTO> page = traderQueryService.findByCriteria(criteria, pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    /**
     * {@code GET  /traders/count} : count all the traders.
     *
     * @param criteria the criteria which the requested entities should match.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the count in body.
     */
    @GetMapping("/count")
    public ResponseEntity<Long> countTraders(TraderCriteria criteria) {
        LOG.debug("REST request to count Traders by criteria: {}", criteria);
        return ResponseEntity.ok().body(traderQueryService.countByCriteria(criteria));
    }

    /**
     * {@code GET  /traders/:id} : get the "id" trader.
     *
     * @param id the id of the traderDTO to retrieve.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the traderDTO, or with status {@code 404 (Not Found)}.
     */
    @GetMapping("/{id}")
    public ResponseEntity<TraderDTO> getTrader(@PathVariable("id") Long id) {
        LOG.debug("REST request to get Trader : {}", id);
        Optional<TraderDTO> traderDTO = traderService.findOne(id);
        return ResponseUtil.wrapOrNotFound(traderDTO);
    }

    /**
     * {@code DELETE  /traders/:id} : delete the "id" trader.
     *
     * @param id the id of the traderDTO to delete.
     * @return the {@link ResponseEntity} with status {@code 204 (NO_CONTENT)}.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTrader(@PathVariable("id") Long id) {
        LOG.debug("REST request to delete Trader : {}", id);
        traderService.delete(id);
        return ResponseEntity.noContent()
            .headers(HeaderUtil.createEntityDeletionAlert(applicationName, true, ENTITY_NAME, id.toString()))
            .build();
    }

    /**
     * {@code POST  /traders/:id/photos} : Upload one or more shop photos for a trader.
     * Stores files on disk and saves comma-separated URLs in trader.shopPhotos.
     * Only the trader owner or ROLE_ADMIN may upload.
     */
    @PostMapping("/{id}/photos")
    public ResponseEntity<String[]> uploadTraderPhotos(@PathVariable("id") Long id, @RequestParam("files") MultipartFile[] files) {
        LOG.debug("REST request to upload photos for Trader : {}", id);
        if (!canAccessTraderPhotos(id)) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        Optional<TraderDTO> existingOpt = traderService.findOne(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        TraderDTO existing = existingOpt.get();
        java.util.List<String> paths = new java.util.ArrayList<>();

        java.nio.file.Path baseDir = java.nio.file.Paths.get("uploads", "traders", id.toString());
        try {
            java.nio.file.Files.createDirectories(baseDir);
            for (MultipartFile file : files) {
                if (file.isEmpty()) continue;
                String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "photo";
                String lower = original.toLowerCase();
                if (!lower.endsWith(".jpg") && !lower.endsWith(".jpeg") && !lower.endsWith(".png") && !lower.endsWith(".webp")) {
                    return ResponseEntity.badRequest().build();
                }
                String sanitized = original.replaceAll("[^a-zA-Z0-9._-]", "_");
                java.nio.file.Path target = baseDir.resolve(System.currentTimeMillis() + "_" + sanitized);
                java.nio.file.Files.copy(file.getInputStream(), target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                String url = "/api/traders/" + id + "/photos/" + target.getFileName();
                paths.add(url);
            }
        } catch (Exception e) {
            LOG.error("Failed to store trader photos", e);
            return ResponseEntity.status(500).build();
        }

        String existingPhotos = existing.getShopPhotos();
        String all = String.join(",", paths);
        if (existingPhotos != null && !existingPhotos.isBlank()) {
            all = existingPhotos + "," + all;
        }
        existing.setShopPhotos(all);
        traderService.update(existing);

        return ResponseEntity.ok(paths.toArray(new String[0]));
    }

    /**
     * {@code GET  /traders/:id/photos/:filename} : Serve a trader photo from disk.
     * Private: only the trader owner or ROLE_ADMIN may access.
     */
    @GetMapping("/{id}/photos/{filename}")
    public ResponseEntity<Resource> getTraderPhoto(@PathVariable("id") Long id, @PathVariable("filename") String filename) {
        if (!canAccessTraderPhotos(id)) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        try {
            java.nio.file.Path file = java.nio.file.Paths.get("uploads", "traders", id.toString()).resolve(filename);
            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }
            MediaType contentType = getMediaTypeForFilename(filename);
            return ResponseEntity.ok().contentType(contentType).body(resource);
        } catch (Exception e) {
            LOG.error("Failed to read trader photo {}", filename, e);
            return ResponseEntity.status(500).build();
        }
    }

    private MediaType getMediaTypeForFilename(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (lower.endsWith(".gif")) return MediaType.IMAGE_GIF;
        if (lower.endsWith(".webp")) return MediaType.parseMediaType("image/webp");
        return MediaType.IMAGE_JPEG;
    }

    /**
     * {@code GET  /traders/:id/config} : get trader configuration (business_mode, bill_prefix) — Module 1 spec.
     */
    @GetMapping("/{id}/config")
    public ResponseEntity<com.mercotrace.service.dto.TraderConfigDTO> getTraderConfig(@PathVariable("id") Long id) {
        LOG.debug("REST request to get Trader config : {}", id);
        Optional<TraderDTO> dto = traderService.findOne(id);
        return dto
            .map(t -> {
                com.mercotrace.service.dto.TraderConfigDTO config = new com.mercotrace.service.dto.TraderConfigDTO();
                config.setBusinessMode(t.getBusinessMode());
                config.setBillPrefix(t.getBillPrefix());
                return ResponseEntity.ok(config);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * {@code PATCH  /traders/:id/config} : update trader configuration (business_mode, bill_prefix) — Module 1 spec.
     */
    @PatchMapping(value = "/{id}/config", consumes = { "application/json", "application/merge-patch+json" })
    public ResponseEntity<TraderDTO> patchTraderConfig(
        @PathVariable("id") Long id,
        @RequestBody com.mercotrace.service.dto.TraderConfigDTO configDTO
    ) {
        LOG.debug("REST request to patch Trader config : {}", id);
        Optional<TraderDTO> existing = traderService.findOne(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        TraderDTO toUpdate = existing.get();
        if (configDTO.getBusinessMode() != null) toUpdate.setBusinessMode(configDTO.getBusinessMode());
        if (configDTO.getBillPrefix() != null) toUpdate.setBillPrefix(configDTO.getBillPrefix());
        toUpdate = traderService.update(toUpdate);
        return ResponseEntity.ok().body(toUpdate);
    }
}
