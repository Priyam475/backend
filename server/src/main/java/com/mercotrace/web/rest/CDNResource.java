package com.mercotrace.web.rest;

import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.service.CdnService;
import com.mercotrace.service.dto.CDNDTOs.CDNCreateDTO;
import com.mercotrace.service.dto.CDNDTOs.CDNResponseDTO;
import com.mercotrace.service.dto.CDNDTOs.ReceiveByPINDTO;
import com.mercotrace.web.rest.errors.BadRequestAlertException;
import jakarta.validation.Valid;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
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
 * REST controller for CDN (Consignment Dispatch Notes). Frontend: CDNPage.tsx.
 */
@RestController
@RequestMapping("/api/cdns")
public class CDNResource {

    private static final Logger LOG = LoggerFactory.getLogger(CDNResource.class);
    private static final String ENTITY_NAME = "cdn";

    @Value("${jhipster.clientApp.name}")
    private String applicationName;

    private final CdnService cdnService;

    public CDNResource(CdnService cdnService) {
        this.cdnService = cdnService;
    }

    /**
     * {@code POST  /api/cdns} : Create a new CDN. Returns body with generated PIN.
     */
    @PostMapping("")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.CDN_CREATE + "\")")
    public ResponseEntity<CDNResponseDTO> createCdn(@Valid @RequestBody CDNCreateDTO request) throws URISyntaxException {
        LOG.debug("REST request to create CDN : {}", request.getReceivingParty());
        try {
            CDNResponseDTO result = cdnService.create(request);
            return ResponseEntity
                .created(new URI("/api/cdns/" + result.getId()))
                .headers(HeaderUtil.createEntityCreationAlert(applicationName, true, ENTITY_NAME, String.valueOf(result.getId())))
                .body(result);
        } catch (IllegalArgumentException e) {
            throw new BadRequestAlertException(e.getMessage(), ENTITY_NAME, "validation");
        }
    }

    /**
     * {@code GET  /api/cdns/:id} : Get CDN by id (trader-scoped).
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.CDN_VIEW + "\")")
    public ResponseEntity<CDNResponseDTO> getCdn(@PathVariable Long id) {
        LOG.debug("REST request to get CDN : {}", id);
        CDNResponseDTO dto = cdnService.getById(id);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok().body(dto);
    }

    /**
     * {@code GET  /api/cdns} : List CDNs with pagination and optional search.
     */
    @GetMapping("")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.CDN_VIEW + "\")")
    public ResponseEntity<List<CDNResponseDTO>> getAllCdns(
        @org.springdoc.core.annotations.ParameterObject
        @PageableDefault(size = 10, sort = "cdnDate", direction = Sort.Direction.DESC) Pageable pageable,
        @RequestParam(required = false) String q
    ) {
        LOG.debug("REST request to get CDNs page: {}, q: {}", pageable, q);
        var page = cdnService.list(pageable, q);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    /**
     * {@code POST  /api/cdns/receive} : Receive CDN by PIN.
     */
    @PostMapping("/receive")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.CDN_CREATE + "\")")
    public ResponseEntity<CDNResponseDTO> receiveByPin(@Valid @RequestBody ReceiveByPINDTO request) {
        LOG.debug("REST request to receive CDN by PIN");
        try {
            CDNResponseDTO result = cdnService.receiveByPin(request);
            return ResponseEntity.ok().body(result);
        } catch (IllegalArgumentException e) {
            throw new BadRequestAlertException(e.getMessage(), ENTITY_NAME, "pininvalid");
        }
    }
}
