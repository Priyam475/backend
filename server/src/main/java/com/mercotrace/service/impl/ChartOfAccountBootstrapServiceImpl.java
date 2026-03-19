package com.mercotrace.service.impl;

import com.mercotrace.domain.ChartOfAccount;
import com.mercotrace.repository.ChartOfAccountRepository;
import com.mercotrace.service.ChartOfAccountBootstrapService;
import java.math.BigDecimal;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds system-generated ledgers for new traders.
 * Per SRS Part 6 §3.2: Cash, AR Control, AP Control (cannot be deleted, cannot be reclassified).
 */
@Service
public class ChartOfAccountBootstrapServiceImpl implements ChartOfAccountBootstrapService {

    private static final Logger LOG = LoggerFactory.getLogger(ChartOfAccountBootstrapServiceImpl.class);

    /** Audit field for system-created ledgers. */
    private static final String CREATED_BY_SYSTEM = "system-bootstrap";

    private final ChartOfAccountRepository chartOfAccountRepository;

    public ChartOfAccountBootstrapServiceImpl(ChartOfAccountRepository chartOfAccountRepository) {
        this.chartOfAccountRepository = chartOfAccountRepository;
    }

    @Override
    @Transactional
    public void seedSystemLedgersForTrader(Long traderId) {
        if (traderId == null) {
            return;
        }
        if (chartOfAccountRepository.existsByTraderIdAndSystemTrue(traderId)) {
            LOG.debug("Trader {} already has system ledgers, skipping bootstrap", traderId);
            return;
        }

        List<ChartOfAccount> ledgers = List.of(
            createLedger(traderId, "Cash", "ASSET", "CASH"),
            createLedger(traderId, "Accounts Receivable – Control", "ASSET", "CONTROL"),
            createLedger(traderId, "Accounts Payable – Control", "LIABILITY", "CONTROL")
        );

        for (ChartOfAccount ledger : ledgers) {
            chartOfAccountRepository.save(ledger);
        }
        LOG.info("Seeded {} system ledgers for trader {}", ledgers.size(), traderId);
    }

    private ChartOfAccount createLedger(Long traderId, String ledgerName, String accountingClass, String classification) {
        ChartOfAccount entity = new ChartOfAccount();
        entity.setTraderId(traderId);
        entity.setLedgerName(ledgerName);
        entity.setAccountingClass(accountingClass);
        entity.setClassification(classification);
        entity.setParentControlId(null);
        entity.setContactId(null);
        entity.setSystem(true);
        entity.setLocked(false);
        entity.setOpeningBalance(BigDecimal.ZERO);
        entity.setCurrentBalance(BigDecimal.ZERO);
        entity.setCreatedBy(CREATED_BY_SYSTEM);
        return entity;
    }
}
