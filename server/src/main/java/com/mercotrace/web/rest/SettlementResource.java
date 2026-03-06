package com.mercotrace.web.rest;

import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.service.SettlementService;
import com.mercotrace.service.dto.SettlementDTOs.*;
import com.mercotrace.web.rest.errors.BadRequestAlertException;
import jakarta.validation.Valid;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import tech.jhipster.web.util.PaginationUtil;

/**
 * REST controller for Settlement (Sales Patti).
 * Base path: /api/settlements. Aligned with SettlementPage.tsx.
 */
@RestController
@RequestMapping("/api/settlements")
public class SettlementResource {

    private static final Logger LOG = LoggerFactory.getLogger(SettlementResource.class);
    private static final String ENTITY_NAME = "patti";

    private final SettlementService settlementService;

    public SettlementResource(SettlementService settlementService) {
        this.settlementService = settlementService;
    }

    /**
     * {@code GET  /api/settlements/sellers} : list sellers for settlement (paginated).
     * Built from completed auctions + weighing, trader-scoped.
     */
    @GetMapping("/sellers")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.SETTLEMENTS_VIEW + "\")")
    public ResponseEntity<List<SellerSettlementDTO>> listSellers(
        @org.springdoc.core.annotations.ParameterObject Pageable pageable,
        @RequestParam(required = false) String search
    ) {
        LOG.debug("REST request to get Settlement sellers page: {}", pageable);
        var page = settlementService.listSellers(pageable, search);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    /**
     * {@code GET  /api/settlements/pattis} : list pattis (paginated).
     */
    @GetMapping("/pattis")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.SETTLEMENTS_VIEW + "\")")
    public ResponseEntity<List<PattiDTO>> listPattis(
        @org.springdoc.core.annotations.ParameterObject Pageable pageable
    ) {
        LOG.debug("REST request to get Pattis page: {}", pageable);
        var page = settlementService.listPattis(pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    /**
     * {@code POST  /api/settlements/pattis} : create a new patti.
     * Patti ID generated server-side (PT-YYYYMMDD-NNNN).
     */
    @PostMapping("/pattis")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.SETTLEMENTS_CREATE + "\")")
    public ResponseEntity<PattiDTO> createPatti(@Valid @RequestBody PattiSaveRequest request) {
        LOG.debug("REST request to create Patti for seller : {}", request.getSellerName());
        PattiDTO created = settlementService.createPatti(request);
        return ResponseEntity.ok(created);
    }

    /**
     * {@code GET  /api/settlements/pattis/:id} : get patti by id.
     */
    @GetMapping("/pattis/{id}")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.SETTLEMENTS_VIEW + "\")")
    public ResponseEntity<PattiDTO> getPattiById(@PathVariable Long id) {
        LOG.debug("REST request to get Patti : {}", id);
        return settlementService.getPattiById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * {@code GET  /api/settlements/pattis/by-patti-id/:pattiId} : get patti by business key.
     */
    @GetMapping("/pattis/by-patti-id/{pattiId}")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.SETTLEMENTS_VIEW + "\")")
    public ResponseEntity<PattiDTO> getPattiByPattiId(@PathVariable String pattiId) {
        LOG.debug("REST request to get Patti by pattiId : {}", pattiId);
        return settlementService.getPattiByPattiId(pattiId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * {@code PUT  /api/settlements/pattis/:id} : update patti (e.g. deductions).
     */
    @PutMapping("/pattis/{id}")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.SETTLEMENTS_EDIT + "\")")
    public ResponseEntity<PattiDTO> updatePatti(@PathVariable Long id, @Valid @RequestBody PattiSaveRequest request) {
        LOG.debug("REST request to update Patti : {}", id);
        if (id == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        return settlementService.updatePatti(id, request)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
