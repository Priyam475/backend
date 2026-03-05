package com.mercotrace.web.rest;

import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.service.VoucherLineService;
import com.mercotrace.service.dto.VoucherLineDTO;
import java.time.LocalDate;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for voucher lines (by date range for Financial Reports).
 * Base path: /api/voucher-lines.
 */
@RestController
@RequestMapping("/api/voucher-lines")
public class VoucherLineResource {

    private static final Logger LOG = LoggerFactory.getLogger(VoucherLineResource.class);

    private final VoucherLineService voucherLineService;

    public VoucherLineResource(VoucherLineService voucherLineService) {
        this.voucherLineService = voucherLineService;
    }

    /**
     * GET /api/voucher-lines : get all lines whose voucher date is in [dateFrom, dateTo].
     * Trader-scoped. For Financial Reports trial balance and commodity P&L.
     */
    @GetMapping
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.FINANCIAL_REPORTS_VIEW + "\")")
    public ResponseEntity<List<VoucherLineDTO>> getByDateRange(
        @RequestParam LocalDate dateFrom,
        @RequestParam LocalDate dateTo
    ) {
        LOG.debug("REST request to get voucher lines: dateFrom={}, dateTo={}", dateFrom, dateTo);
        List<VoucherLineDTO> list = voucherLineService.getLinesByDateRange(dateFrom, dateTo);
        return ResponseEntity.ok().body(list);
    }
}
