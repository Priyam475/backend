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
 * REST controller for voucher lines (by date range for Financial Reports, by ledger for Ledger View).
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
     * GET /api/voucher-lines : get lines whose voucher date is in [dateFrom, dateTo].
     * Optional ledgerId: if provided, returns lines for that ledger only (Ledger View).
     * If not provided, returns all lines in date range (Financial Reports).
     * Trader-scoped. Allowed: FINANCIAL_REPORTS_VIEW or CHART_OF_ACCOUNTS_VIEW.
     */
    @GetMapping
    @PreAuthorize(
        "hasAuthority(\"" + AuthoritiesConstants.FINANCIAL_REPORTS_VIEW + "\") or " +
        "hasAuthority(\"" + AuthoritiesConstants.CHART_OF_ACCOUNTS_VIEW + "\")"
    )
    public ResponseEntity<List<VoucherLineDTO>> getByDateRange(
        @RequestParam LocalDate dateFrom,
        @RequestParam LocalDate dateTo,
        @RequestParam(required = false) Long ledgerId
    ) {
        LOG.debug("REST request to get voucher lines: dateFrom={}, dateTo={}, ledgerId={}", dateFrom, dateTo, ledgerId);
        List<VoucherLineDTO> list = ledgerId != null
            ? voucherLineService.getLinesByLedgerAndDateRange(ledgerId, dateFrom, dateTo)
            : voucherLineService.getLinesByDateRange(dateFrom, dateTo);
        return ResponseEntity.ok().body(list);
    }
}
