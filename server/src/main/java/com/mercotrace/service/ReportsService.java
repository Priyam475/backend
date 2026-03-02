package com.mercotrace.service;

import com.mercotrace.domain.enumeration.ArApType;
import com.mercotrace.service.dto.*;
import java.time.LocalDate;
import java.util.List;

/**
 * Financial analytics reports service (backend implementation for FinancialReportsPage and analytics UIs).
 */
public interface ReportsService {

    /**
     * Trial balance for the trader between the given voucher date range.
     */
    List<TrialBalanceRowDTO> getTrialBalance(LocalDate dateFrom, LocalDate dateTo);

    /**
     * Profit &amp; Loss rows derived from current ledger balances.
     */
    List<PLRowDTO> getProfitAndLoss();

    /**
     * Balance sheet rows derived from current ledger balances.
     */
    List<BalanceSheetRowDTO> getBalanceSheet();

    /**
     * Aging buckets for AR or AP documents, grouped by contact.
     */
    List<AgingBucketDTO> getAging(ArApType type);

    /**
     * Commodity profitability by voucher date range.
     */
    List<CommodityProfitRowDTO> getCommodityProfit(LocalDate dateFrom, LocalDate dateTo);
}

