package com.mercotrace.web.rest;

import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.service.ArrivalService;
import com.mercotrace.service.dto.ArrivalDTOs.ArrivalRequestDTO;
import com.mercotrace.service.dto.ArrivalDTOs.ArrivalSummaryDTO;
import com.mercotrace.service.dto.ArrivalDTOs.ArrivalDetailDTO;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import tech.jhipster.web.util.HeaderUtil;
import tech.jhipster.web.util.PaginationUtil;

/**
 * REST controller for managing arrivals (inward logistics).
 *
 * Frontend contract is defined by ArrivalsPage.tsx.
 */
@RestController
@RequestMapping("/api/arrivals")
public class ArrivalResource {

    private static final Logger LOG = LoggerFactory.getLogger(ArrivalResource.class);

    private static final String ENTITY_NAME = "arrival";

    @Value("${jhipster.clientApp.name}")
    private String applicationName;

    private final ArrivalService arrivalService;

    public ArrivalResource(ArrivalService arrivalService) {
        this.arrivalService = arrivalService;
    }

    /**
     * {@code POST  /arrivals} : Create a new arrival.
     */
    @PostMapping("")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.ARRIVALS_CREATE + "\")")
    public ResponseEntity<ArrivalSummaryDTO> createArrival(@Valid @RequestBody ArrivalRequestDTO request) throws URISyntaxException {
        LOG.debug("REST request to create Arrival : {}", request);
        try {
            ArrivalSummaryDTO result = arrivalService.createArrival(request);
            return ResponseEntity
                .created(new URI("/api/arrivals/" + result.getVehicleId()))
                .headers(HeaderUtil.createEntityCreationAlert(applicationName, true, ENTITY_NAME, String.valueOf(result.getVehicleId())))
                .body(result);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestAlertException(ex.getMessage(), ENTITY_NAME, "validation");
        }
    }

    /**
     * {@code GET  /arrivals} : get paginated arrivals summaries.
     */
    @GetMapping("")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.ARRIVALS_VIEW + "\")")
    public ResponseEntity<List<ArrivalSummaryDTO>> getAllArrivals(
        @org.springdoc.core.annotations.ParameterObject Pageable pageable
    ) {
        LOG.debug("REST request to get Arrivals page: {}", pageable);
        Page<ArrivalSummaryDTO> page = arrivalService.listArrivals(pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    /**
     * {@code GET  /arrivals/detail} : get paginated arrivals with nested sellers and lots (id, lotName, sellerName) for lot-level lookup (e.g. WeighingPage).
     */
    @GetMapping("/detail")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.ARRIVALS_VIEW + "\")")
    public ResponseEntity<List<ArrivalDetailDTO>> getArrivalsDetail(
        @org.springdoc.core.annotations.ParameterObject Pageable pageable
    ) {
        LOG.debug("REST request to get Arrivals detail page: {}", pageable);
        var page = arrivalService.listArrivalsDetail(pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }
}

