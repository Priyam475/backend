package com.mercotrace.service.impl;

import com.mercotrace.repository.ChartOfAccountRepository;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Keeps AR Control / AP Control {@code currentBalance} equal to the sum of RECEIVABLE / PAYABLE subledgers
 * (SRS Part 6 §4.1). Subledger balances change on voucher post, opening balance, or manual current balance edits.
 * Runs in the caller's transaction (e.g. {@link ChartOfAccountServiceImpl#create} or {@link VoucherHeaderServiceImpl#post}).
 */
@Service
public class ChartOfAccountArApControlSyncService {

    private final ChartOfAccountRepository chartOfAccountRepository;

    public ChartOfAccountArApControlSyncService(ChartOfAccountRepository chartOfAccountRepository) {
        this.chartOfAccountRepository = chartOfAccountRepository;
    }

    /**
     * @return ids of control ledgers that were written (for cache eviction)
     */
    public Set<Long> syncControlBalancesFromSubledgers(Long traderId) {
        Set<Long> updatedControlIds = new HashSet<>();
        chartOfAccountRepository
            .findFirstByTraderIdAndClassificationAndLedgerNameContainingIgnoreCase(traderId, "CONTROL", "accounts receivable")
            .ifPresent(control -> {
                BigDecimal sum = chartOfAccountRepository.sumCurrentBalanceReceivableSubledgers(traderId);
                if (sum == null) sum = BigDecimal.ZERO;
                control.setCurrentBalance(sum);
                chartOfAccountRepository.save(control);
                if (control.getId() != null) {
                    updatedControlIds.add(control.getId());
                }
            });
        chartOfAccountRepository
            .findFirstByTraderIdAndClassificationAndLedgerNameContainingIgnoreCase(traderId, "CONTROL", "accounts payable")
            .ifPresent(control -> {
                BigDecimal sum = chartOfAccountRepository.sumCurrentBalancePayableSubledgers(traderId);
                if (sum == null) sum = BigDecimal.ZERO;
                control.setCurrentBalance(sum);
                chartOfAccountRepository.save(control);
                if (control.getId() != null) {
                    updatedControlIds.add(control.getId());
                }
            });
        return updatedControlIds;
    }
}
