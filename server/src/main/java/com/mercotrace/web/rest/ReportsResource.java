package com.mercotrace.web.rest;

import com.mercotrace.domain.enumeration.ArApType;
import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.service.ReportsService;
import com.mercotrace.service.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for financial analytics reports used by FinancialReportsPage.
 */
@RestController
@RequestMapping("/api/reports")
@Tag(name = "Reports", description = "Financial analytics reports (trial balance, P&L, balance sheet, aging, commodity P&L)")
public class ReportsResource {

    private static final Logger LOG = LoggerFactory.getLogger(ReportsResource.class);

    private final ReportsService reportsService;

    public ReportsResource(ReportsService reportsService) {
        this.reportsService = reportsService;
    }

    @GetMapping("/trial-balance")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.FINANCIAL_REPORTS_VIEW + "\")")
    @Operation(summary = "Trial balance", description = "Trial balance rows for the trader between voucher dates (inclusive).")
    public ResponseEntity<List<TrialBalanceRowDTO>> getTrialBalance(
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo
    ) {
        LOG.debug("REST request to get trial balance: dateFrom={}, dateTo={}", dateFrom, dateTo);
        List<TrialBalanceRowDTO> rows = reportsService.getTrialBalance(dateFrom, dateTo);
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/profit-loss")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.FINANCIAL_REPORTS_VIEW + "\")")
    @Operation(summary = "Profit & Loss", description = "Income and expense rows derived from current ledger balances.")
    public ResponseEntity<List<PLRowDTO>> getProfitAndLoss() {
        LOG.debug("REST request to get profit & loss");
        return ResponseEntity.ok(reportsService.getProfitAndLoss());
    }

    @GetMapping("/balance-sheet")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.FINANCIAL_REPORTS_VIEW + "\")")
    @Operation(summary = "Balance sheet", description = "Assets, liabilities, and equity rows from current ledger balances.")
    public ResponseEntity<List<BalanceSheetRowDTO>> getBalanceSheet() {
        LOG.debug("REST request to get balance sheet");
        return ResponseEntity.ok(reportsService.getBalanceSheet());
    }

    @GetMapping("/aging")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.FINANCIAL_REPORTS_VIEW + "\")")
    @Operation(summary = "AR/AP aging", description = "Aging buckets per contact for AR or AP documents.")
    public ResponseEntity<List<AgingBucketDTO>> getAging(@RequestParam ArApType type) {
        LOG.debug("REST request to get aging: type={}", type);
        return ResponseEntity.ok(reportsService.getAging(type));
    }

    @GetMapping("/commodity-profit")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.FINANCIAL_REPORTS_VIEW + "\")")
    @Operation(summary = "Commodity profitability", description = "Commodity-wise income/expense/profit by voucher date range.")
    public ResponseEntity<List<CommodityProfitRowDTO>> getCommodityProfit(
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo
    ) {
        LOG.debug("REST request to get commodity profit: dateFrom={}, dateTo={}", dateFrom, dateTo);
        return ResponseEntity.ok(reportsService.getCommodityProfit(dateFrom, dateTo));
    }
}

