package com.mercotrace.web.rest;

import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.service.StockPurchaseService;
import com.mercotrace.service.dto.StockPurchaseDTOs.CreateStockPurchaseRequestDTO;
import com.mercotrace.service.dto.StockPurchaseDTOs.StockPurchaseDTO;
import com.mercotrace.web.rest.errors.BadRequestAlertException;
import jakarta.validation.Valid;
import java.net.URI;
import java.net.URISyntaxException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import tech.jhipster.web.util.HeaderUtil;
import tech.jhipster.web.util.PaginationUtil;

/**
 * REST controller for Stock Purchase: list (paginated, vendor search) and create.
 * Frontend contract: StockPurchasePage.tsx.
 */
@RestController
@RequestMapping("/api/stock-purchases")
public class StockPurchaseResource {

    private static final Logger LOG = LoggerFactory.getLogger(StockPurchaseResource.class);
    private static final String ENTITY_NAME = "stockPurchase";

    @Value("${jhipster.clientApp.name}")
    private String applicationName;

    private final StockPurchaseService stockPurchaseService;

    public StockPurchaseResource(StockPurchaseService stockPurchaseService) {
        this.stockPurchaseService = stockPurchaseService;
    }

    /**
     * {@code GET  /api/stock-purchases} : Get paginated stock purchases. Optional vendor search.
     */
    @GetMapping
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.STOCK_PURCHASE_VIEW + "\")")
    public ResponseEntity<Page<StockPurchaseDTO>> getPurchases(
        @org.springdoc.core.annotations.ParameterObject @PageableDefault(size = 10, sort = "createdDate", direction = Sort.Direction.DESC) Pageable pageable,
        @RequestParam(required = false) String vendorSearch
    ) {
        LOG.debug("REST request to get stock purchases: page={}, vendorSearch={}", pageable, vendorSearch);
        Page<StockPurchaseDTO> page = stockPurchaseService.getPurchases(pageable, vendorSearch);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page);
    }

    /**
     * {@code GET  /api/stock-purchases/:id} : Get one stock purchase by id.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.STOCK_PURCHASE_VIEW + "\")")
    public ResponseEntity<StockPurchaseDTO> getPurchase(@PathVariable Long id) {
        LOG.debug("REST request to get stock purchase: {}", id);
        try {
            StockPurchaseDTO dto = stockPurchaseService.getById(id);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            throw new BadRequestAlertException(e.getMessage(), ENTITY_NAME, "notfound");
        }
    }

    /**
     * {@code POST  /api/stock-purchases} : Create a stock purchase.
     */
    @PostMapping
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.STOCK_PURCHASE_CREATE + "\")")
    public ResponseEntity<StockPurchaseDTO> createStockPurchase(@Valid @RequestBody CreateStockPurchaseRequestDTO request) throws URISyntaxException {
        LOG.debug("REST request to create stock purchase: vendorId={}", request.getVendorId());
        try {
            StockPurchaseDTO result = stockPurchaseService.create(request);
            return ResponseEntity
                .created(new URI("/api/stock-purchases/" + result.getId()))
                .headers(HeaderUtil.createEntityCreationAlert(applicationName, true, ENTITY_NAME, String.valueOf(result.getId())))
                .body(result);
        } catch (IllegalArgumentException e) {
            throw new BadRequestAlertException(e.getMessage(), ENTITY_NAME, "validation");
        }
    }
}
