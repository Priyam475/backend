package com.mercotrace.service;

import com.mercotrace.service.dto.ChartOfAccountCreateRequest;
import com.mercotrace.service.dto.ChartOfAccountDTO;
import com.mercotrace.service.dto.ChartOfAccountUpdateRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/** Service for Chart of Accounts (CoA) ledgers. */
public interface ChartOfAccountService {

    Page<ChartOfAccountDTO> getPage(Pageable pageable, String search, String accountingClass, String classification);
    ChartOfAccountDTO getById(Long id);
    ChartOfAccountDTO create(ChartOfAccountCreateRequest request);
    ChartOfAccountDTO update(Long id, ChartOfAccountUpdateRequest request);
    void delete(Long id);

    /**
     * Get opening balance for a ledger. If asOfDate is provided, computes dynamically from historical
     * transactions (stored opening + sum of prior-period lines). If asOfDate is null, returns stored opening.
     */
    BigDecimal getOpeningBalance(Long ledgerId, LocalDate asOfDate);

    /**
     * Get all ledgers linked to a contact. Validates contact exists and belongs to current trader.
     * Used for Contact Consolidated Ledger View (Phase 6).
     */
    List<ChartOfAccountDTO> getLedgersByContactId(Long contactId);
}
