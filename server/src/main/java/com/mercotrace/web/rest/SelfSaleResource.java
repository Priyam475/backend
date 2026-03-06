package com.mercotrace.web.rest;

import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.service.SelfSaleService;
import com.mercotrace.service.dto.SelfSaleDTOs.ClosureDTO;
import com.mercotrace.service.dto.SelfSaleDTOs.CreateClosureRequestDTO;
import com.mercotrace.service.dto.SelfSaleDTOs.OpenLotDTO;
import com.mercotrace.web.rest.errors.BadRequestAlertException;
import jakarta.validation.Valid;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
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
 * REST controller for Self-Sale: open lots and create/list closures.
 * Frontend contract: SelfSalePage.tsx.
 */
@RestController
@RequestMapping("/api/self-sale")
public class SelfSaleResource {

    private static final Logger LOG = LoggerFactory.getLogger(SelfSaleResource.class);

    private static final String ENTITY_NAME = "selfSaleClosure";

    @Value("${jhipster.clientApp.name}")
    private String applicationName;

    private final SelfSaleService selfSaleService;

    public SelfSaleResource(SelfSaleService selfSaleService) {
        this.selfSaleService = selfSaleService;
    }

    /**
     * {@code GET  /self-sale/open-lots} : Get open lots (from arrivals, excluding already closed). Optional search.
     */
    @GetMapping("/open-lots")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.SELF_SALE_VIEW + "\")")
    public ResponseEntity<List<OpenLotDTO>> getOpenLots(
        @org.springdoc.core.annotations.ParameterObject @PageableDefault(size = 20) Pageable pageable,
        @RequestParam(required = false) String search
    ) {
        LOG.debug("REST request to get open lots: page={}, search={}", pageable, search);
        Page<OpenLotDTO> page = selfSaleService.getOpenLots(pageable, search);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    /**
     * {@code POST  /self-sale/closures} : Create a self-sale closure.
     */
    @PostMapping("/closures")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.SELF_SALE_CREATE + "\")")
    public ResponseEntity<ClosureDTO> createClosure(@Valid @RequestBody CreateClosureRequestDTO request) throws URISyntaxException {
        LOG.debug("REST request to create self-sale closure: {}", request);
        try {
            ClosureDTO result = selfSaleService.createClosure(request);
            return ResponseEntity
                .created(new URI("/api/self-sale/closures/" + result.getId()))
                .headers(HeaderUtil.createEntityCreationAlert(applicationName, true, ENTITY_NAME, String.valueOf(result.getId())))
                .body(result);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestAlertException(ex.getMessage(), ENTITY_NAME, "validation");
        }
    }

    /**
     * {@code GET  /self-sale/closures} : Get paginated closed self-sales (default sort: closedAt,desc).
     */
    @GetMapping("/closures")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.SELF_SALE_VIEW + "\")")
    public ResponseEntity<List<ClosureDTO>> getClosures(
        @org.springdoc.core.annotations.ParameterObject @PageableDefault(size = 10, sort = "closedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        LOG.debug("REST request to get closures: {}", pageable);
        Page<ClosureDTO> page = selfSaleService.getClosures(pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }
}
