package com.mercotrace.web.rest;

import com.mercotrace.domain.enumeration.VoucherLifecycleStatus;
import com.mercotrace.domain.enumeration.VoucherType;
import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.service.VoucherHeaderService;
import java.time.LocalDate;
import com.mercotrace.service.dto.VoucherHeaderCreateRequest;
import com.mercotrace.service.dto.VoucherHeaderDTO;
import com.mercotrace.web.rest.errors.BadRequestAlertException;
import jakarta.validation.Valid;
import java.net.URI;
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
 * REST controller for accounting voucher headers.
 * Frontend: VouchersPage.tsx. Base path: /api/voucher-headers.
 */
@RestController
@RequestMapping("/api/voucher-headers")
public class VoucherHeaderResource {

    private static final Logger LOG = LoggerFactory.getLogger(VoucherHeaderResource.class);
    private static final String ENTITY_NAME = "voucherHeader";

    @Value("${jhipster.clientApp.name}")
    private String applicationName;

    private final VoucherHeaderService voucherHeaderService;

    public VoucherHeaderResource(VoucherHeaderService voucherHeaderService) {
        this.voucherHeaderService = voucherHeaderService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.VOUCHERS_VIEW + "\")")
    public ResponseEntity<Page<VoucherHeaderDTO>> getAll(
        @org.springdoc.core.annotations.ParameterObject
        @PageableDefault(size = 20, sort = "voucherDate", direction = Sort.Direction.DESC) Pageable pageable,
        @RequestParam(required = false) VoucherType voucherType,
        @RequestParam(required = false) VoucherLifecycleStatus status,
        @RequestParam(required = false) LocalDate dateFrom,
        @RequestParam(required = false) LocalDate dateTo,
        @RequestParam(required = false) String search
    ) {
        LOG.debug("REST request to get voucher headers: page={}, voucherType={}, status={}, dateFrom={}, dateTo={}, search={}", pageable, voucherType, status, dateFrom, dateTo, search);
        Page<VoucherHeaderDTO> page = voucherHeaderService.getPage(pageable, voucherType, status, dateFrom, dateTo, search);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.VOUCHERS_VIEW + "\")")
    public ResponseEntity<VoucherHeaderDTO> getById(@PathVariable Long id) {
        LOG.debug("REST request to get voucher header: {}", id);
        try {
            VoucherHeaderDTO dto = voucherHeaderService.getById(id);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            throw new BadRequestAlertException(e.getMessage(), ENTITY_NAME, "notfound");
        }
    }

    @PostMapping
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.VOUCHERS_CREATE + "\")")
    public ResponseEntity<VoucherHeaderDTO> create(@Valid @RequestBody VoucherHeaderCreateRequest request) {
        LOG.debug("REST request to create voucher header: type={}", request.getVoucherType());
        try {
            VoucherHeaderDTO result = voucherHeaderService.create(request);
            return ResponseEntity
                .created(URI.create("/api/voucher-headers/" + result.getVoucherId()))
                .headers(HeaderUtil.createEntityCreationAlert(applicationName, true, ENTITY_NAME, result.getVoucherId()))
                .body(result);
        } catch (IllegalArgumentException e) {
            throw new BadRequestAlertException(e.getMessage(), ENTITY_NAME, "validation");
        }
    }

    @PostMapping("/{id}/post")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.VOUCHERS_APPROVE + "\")")
    public ResponseEntity<VoucherHeaderDTO> post(@PathVariable Long id) {
        LOG.debug("REST request to post voucher header: {}", id);
        try {
            VoucherHeaderDTO result = voucherHeaderService.post(id);
            return ResponseEntity.ok()
                .headers(HeaderUtil.createAlert(applicationName, "Voucher posted", ENTITY_NAME))
                .body(result);
        } catch (IllegalArgumentException e) {
            throw new BadRequestAlertException(e.getMessage(), ENTITY_NAME, "validation");
        }
    }

    @PostMapping("/{id}/reverse")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.VOUCHERS_APPROVE + "\")")
    public ResponseEntity<VoucherHeaderDTO> reverse(@PathVariable Long id) {
        LOG.debug("REST request to reverse voucher header: {}", id);
        try {
            VoucherHeaderDTO result = voucherHeaderService.reverse(id);
            return ResponseEntity.ok()
                .headers(HeaderUtil.createAlert(applicationName, "Voucher reversed", ENTITY_NAME))
                .body(result);
        } catch (IllegalArgumentException e) {
            throw new BadRequestAlertException(e.getMessage(), ENTITY_NAME, "validation");
        }
    }
}
