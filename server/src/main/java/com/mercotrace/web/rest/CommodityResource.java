package com.mercotrace.web.rest;

import com.mercotrace.repository.CommodityRepository;
import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.service.CommodityConfigService;
import com.mercotrace.service.CommodityService;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.dto.CommodityDTO;
import com.mercotrace.service.dto.FullCommodityConfigDTO;
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
 * REST controller for managing {@link com.mercotrace.domain.Commodity}.
 *
 * Commodity Settings module – config (rates, deductions, hamali, charges) stored in DB with audit.
 */
@RestController
@RequestMapping("/api/commodities")
public class CommodityResource {

    private static final Logger LOG = LoggerFactory.getLogger(CommodityResource.class);

    private static final String ENTITY_NAME = "commodity";

    @Value("${jhipster.clientApp.name}")
    private String applicationName;

    private final CommodityService commodityService;

    private final CommodityRepository commodityRepository;

    private final CommodityConfigService commodityConfigService;

    private final TraderContextService traderContextService;

    public CommodityResource(
        CommodityService commodityService,
        CommodityRepository commodityRepository,
        CommodityConfigService commodityConfigService,
        TraderContextService traderContextService
    ) {
        this.commodityService = commodityService;
        this.commodityRepository = commodityRepository;
        this.commodityConfigService = commodityConfigService;
        this.traderContextService = traderContextService;
    }

    /**
     * {@code POST  /commodities} : Create a new commodity.
     *
     * @param commodityDTO the commodityDTO to create.
     * @return the {@link ResponseEntity} with status {@code 201 (Created)} and with body the new commodityDTO,
     * or with status {@code 400 (Bad Request)} if the commodity has already an ID or duplicate name.
     */
    @PostMapping("")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.COMMODITY_SETTINGS_CREATE + "\")")
    public ResponseEntity<CommodityDTO> createCommodity(@Valid @RequestBody CommodityDTO commodityDTO) throws URISyntaxException {
        LOG.debug("REST request to save Commodity : {}", commodityDTO);
        if (commodityDTO.getId() != null) {
            throw new BadRequestAlertException("A new commodity cannot already have an ID", ENTITY_NAME, "idexists");
        }

        Long traderId = resolveTraderId(commodityDTO);
        commodityDTO.setTraderId(traderId);

        // Enforce case-insensitive unique name per trader (active or inactive)
        Optional<com.mercotrace.domain.Commodity> existingByName = commodityRepository
            .findOneByTraderIdAndCommodityNameIgnoreCase(traderId, commodityDTO.getCommodityName());
        if (existingByName.isPresent()) {
            if (Boolean.TRUE.equals(existingByName.get().getActive())) {
                throw new BadRequestAlertException("This commodity name already exists", ENTITY_NAME, "commoditynameexists");
            }
            throw new BadRequestAlertException(
                "A commodity with this name was previously removed. You can restore it instead of creating a new one.",
                ENTITY_NAME,
                "commoditynameexistsinactive"
            );
        }

        commodityDTO = commodityService.save(commodityDTO);
        return ResponseEntity.created(new URI("/api/commodities/" + commodityDTO.getId()))
            .headers(HeaderUtil.createEntityCreationAlert(applicationName, true, ENTITY_NAME, commodityDTO.getId().toString()))
            .body(commodityDTO);
    }

    /**
     * {@code PUT  /commodities/:id} : Updates an existing commodity.
     *
     * @param id the id of the commodityDTO to save.
     * @param commodityDTO the commodityDTO to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated commodityDTO.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.COMMODITY_SETTINGS_EDIT + "\")")
    public ResponseEntity<CommodityDTO> updateCommodity(
        @PathVariable(value = "id", required = false) final Long id,
        @Valid @RequestBody CommodityDTO commodityDTO
    ) throws URISyntaxException {
        LOG.debug("REST request to update Commodity : {}, {}", id, commodityDTO);
        if (commodityDTO.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, commodityDTO.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        Long traderId = resolveTraderId(commodityDTO);
        commodityService
            .findOne(id)
            .ifPresent(existing -> {
                if (!Objects.equals(existing.getTraderId(), traderId)) {
                    throw new BadRequestAlertException("You are not allowed to modify this commodity", ENTITY_NAME, "forbidden");
                }
            });
        commodityDTO.setTraderId(traderId);

        // Enforce case-insensitive unique name per trader, excluding current record
        commodityRepository
            .findOneByTraderIdAndCommodityNameIgnoreCase(traderId, commodityDTO.getCommodityName())
            .ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new BadRequestAlertException("This commodity name already exists", ENTITY_NAME, "commoditynameexists");
                }
            });

        commodityDTO = commodityService.update(commodityDTO);
        return ResponseEntity.ok()
            .headers(HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, commodityDTO.getId().toString()))
            .body(commodityDTO);
    }

    /**
     * {@code PATCH  /commodities/:id} : Partial update.
     *
     * @param id the id of the commodityDTO to save.
     * @param commodityDTO the commodityDTO to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated commodityDTO.
     */
    @PatchMapping(value = "/{id}", consumes = { "application/json", "application/merge-patch+json" })
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.COMMODITY_SETTINGS_EDIT + "\")")
    public ResponseEntity<CommodityDTO> partialUpdateCommodity(
        @PathVariable(value = "id", required = false) final Long id,
        @NotNull @RequestBody CommodityDTO commodityDTO
    ) throws URISyntaxException {
        LOG.debug("REST request to partial update Commodity : {}, {}", id, commodityDTO);
        if (commodityDTO.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, commodityDTO.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        Long traderId = resolveTraderId(commodityDTO);
        commodityService
            .findOne(id)
            .ifPresent(existing -> {
                if (!Objects.equals(existing.getTraderId(), traderId)) {
                    throw new BadRequestAlertException("You are not allowed to modify this commodity", ENTITY_NAME, "forbidden");
                }
            });

        Optional<CommodityDTO> result = commodityService.partialUpdate(commodityDTO);
        return ResponseUtil.wrapOrNotFound(
            result,
            HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, commodityDTO.getId().toString())
        );
    }

    /**
     * {@code GET  /commodities} : get all commodities for the current trader.
     * Trader-scoped so that Stock Purchase and other modules only see commodities they can use.
     *
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the list of commodities in body.
     */
    @GetMapping("")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.COMMODITY_SETTINGS_VIEW + "\")")
    public ResponseEntity<List<CommodityDTO>> getAllCommodities() {
        LOG.debug("REST request to get all Commodities for current trader");
        Long traderId = traderContextService.getCurrentTraderId();
        List<CommodityDTO> list = commodityService.findAllByTrader(traderId);
        return ResponseEntity.ok().body(list);
    }

    /**
     * {@code GET  /commodities/by-name} : get the commodity by name for the current trader (active or inactive).
     * Used when create fails with "name exists but inactive" so the client can get the id to call restore.
     *
     * @param name the commodity name (case-insensitive).
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and body the commodityDTO, or {@code 404 (Not Found)}.
     */
    @GetMapping("/by-name")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.COMMODITY_SETTINGS_VIEW + "\")")
    public ResponseEntity<CommodityDTO> getCommodityByName(@RequestParam("name") String name) {
        LOG.debug("REST request to get Commodity by name : {}", name);
        Long traderId = traderContextService.getCurrentTraderId();
        Optional<CommodityDTO> commodityDTO = commodityService.findOneByTraderIdAndName(traderId, name);
        return ResponseUtil.wrapOrNotFound(commodityDTO);
    }

    /**
     * {@code GET  /commodities/:id} : get the "id" commodity.
     *
     * @param id the id of the commodityDTO to retrieve.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the commodityDTO, or with status {@code 404 (Not Found)}.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.COMMODITY_SETTINGS_VIEW + "\")")
    public ResponseEntity<CommodityDTO> getCommodity(@PathVariable("id") Long id) {
        LOG.debug("REST request to get Commodity : {}", id);
        Long traderId = traderContextService.getCurrentTraderId();
        Optional<CommodityDTO> commodityDTO = commodityService
            .findOne(id)
            .filter(dto -> Objects.equals(dto.getTraderId(), traderId));
        return ResponseUtil.wrapOrNotFound(commodityDTO);
    }

    /**
     * {@code PATCH  /commodities/:id/restore} : restore a soft-deleted commodity (set active = true).
     *
     * @param id the id of the commodity to restore.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and body the restored commodityDTO, or {@code 404 (Not Found)}.
     */
    @PatchMapping("/{id}/restore")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.COMMODITY_SETTINGS_EDIT + "\")")
    public ResponseEntity<CommodityDTO> restoreCommodity(@PathVariable("id") Long id) {
        LOG.debug("REST request to restore Commodity : {}", id);
        Long traderId = traderContextService.getCurrentTraderId();
        Optional<CommodityDTO> restored = commodityService.restore(id);
        if (restored.isEmpty() || !Objects.equals(restored.get().getTraderId(), traderId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok().body(restored.get());
    }

    /**
     * {@code GET  /commodities/full-configs} : get full config for all commodities (for billing/weighing pages).
     */
    @GetMapping("/full-configs")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.COMMODITY_SETTINGS_VIEW + "\")")
    public ResponseEntity<java.util.List<FullCommodityConfigDTO>> getAllFullConfigs() {
        LOG.debug("REST request to get all full configs");
        return ResponseEntity.ok().body(commodityConfigService.getAllFullConfigs());
    }

    /**
     * {@code GET  /commodities/:id/full-config} : get full config (config, deduction rules, hamali slabs, dynamic charges) for the commodity.
     */
    @GetMapping("/{id}/full-config")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.COMMODITY_SETTINGS_VIEW + "\")")
    public ResponseEntity<FullCommodityConfigDTO> getFullConfig(@PathVariable("id") Long id) {
        LOG.debug("REST request to get full config for Commodity : {}", id);
        FullCommodityConfigDTO dto = commodityConfigService.getFullConfig(id);
        return ResponseEntity.ok().body(dto);
    }

    /**
     * {@code PUT  /commodities/:id/full-config} : update full config for the commodity. All config data stored in DB with audit.
     */
    @PutMapping("/{id}/full-config")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.COMMODITY_SETTINGS_EDIT + "\")")
    public ResponseEntity<FullCommodityConfigDTO> updateFullConfig(
        @PathVariable("id") Long id,
        @Valid @RequestBody FullCommodityConfigDTO fullConfig
    ) {
        LOG.debug("REST request to update full config for Commodity : {}", id);
        if (fullConfig.getCommodityId() == null) {
            fullConfig.setCommodityId(id);
        }
        if (!id.equals(fullConfig.getCommodityId())) {
            throw new BadRequestAlertException("ID in path does not match commodityId in body", ENTITY_NAME, "idinvalid");
        }
        FullCommodityConfigDTO saved = commodityConfigService.saveFullConfig(fullConfig);
        return ResponseEntity.ok()
            .headers(HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, id.toString()))
            .body(saved);
    }

    /**
     * {@code DELETE  /commodities/:id} : delete the "id" commodity (and its config, deduction rules, hamali slabs, dynamic charges).
     *
     * @param id the id of the commodityDTO to delete.
     * @return the {@link ResponseEntity} with status {@code 204 (NO_CONTENT)}.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.COMMODITY_SETTINGS_DELETE + "\")")
    public ResponseEntity<Void> deleteCommodity(@PathVariable("id") Long id) {
        LOG.debug("REST request to delete Commodity : {}", id);
        Long traderId = traderContextService.getCurrentTraderId();
        Optional<CommodityDTO> existing = commodityService.findOne(id);
        if (existing.isEmpty() || !Objects.equals(existing.get().getTraderId(), traderId)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }
        commodityService.delete(id);
        return ResponseEntity.noContent()
            .headers(HeaderUtil.createEntityDeletionAlert(applicationName, true, ENTITY_NAME, id.toString()))
            .build();
    }

    private Long resolveTraderId(CommodityDTO commodityDTO) {
        // Always resolve trader from authenticated context; ignore any client-provided traderId
        return traderContextService.getCurrentTraderId();
    }
}
