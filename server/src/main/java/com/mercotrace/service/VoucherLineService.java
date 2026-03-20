package com.mercotrace.service;

import com.mercotrace.service.dto.VoucherLineDTO;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/** Service for voucher lines (by date range for Financial Reports, by ledger for Ledger View). */
public interface VoucherLineService {

    /**
     * All lines whose voucher date is between dateFrom and dateTo, trader-scoped.
     */
    List<VoucherLineDTO> getLinesByDateRange(LocalDate dateFrom, LocalDate dateTo);

    Page<VoucherLineDTO> getLinesByDateRange(LocalDate dateFrom, LocalDate dateTo, Pageable pageable);

    /**
     * Lines for a specific ledger in date range, trader-scoped. Validates ledger belongs to trader.
     * Includes voucher header fields (date, number, type, narration, status) for Ledger View.
     */
    List<VoucherLineDTO> getLinesByLedgerAndDateRange(Long ledgerId, LocalDate dateFrom, LocalDate dateTo);

    /**
     * Unified chronological transaction timeline for all ledgers of a contact.
     * Validates contact exists and belongs to trader. Excludes REVERSED vouchers.
     * If dateFrom/dateTo null, uses start of year to today.
     */
    List<VoucherLineDTO> getLinesByContactIdAndDateRange(Long contactId, LocalDate dateFrom, LocalDate dateTo);
}
