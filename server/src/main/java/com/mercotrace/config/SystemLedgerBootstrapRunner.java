package com.mercotrace.config;

import com.mercotrace.domain.Trader;
import com.mercotrace.repository.TraderRepository;
import com.mercotrace.service.ChartOfAccountBootstrapService;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * On every startup, backfills system ledgers (Cash, AR Control, AP Control) for any existing trader
 * that is missing them. Idempotent — bootstrap skips traders that already have system ledgers.
 *
 * This handles traders created before the bootstrap was introduced (or whose seed failed at registration).
 */
@Component
public class SystemLedgerBootstrapRunner implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(SystemLedgerBootstrapRunner.class);

    private final TraderRepository traderRepository;
    private final ChartOfAccountBootstrapService chartOfAccountBootstrapService;

    public SystemLedgerBootstrapRunner(
        TraderRepository traderRepository,
        ChartOfAccountBootstrapService chartOfAccountBootstrapService
    ) {
        this.traderRepository = traderRepository;
        this.chartOfAccountBootstrapService = chartOfAccountBootstrapService;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<Trader> traders = traderRepository.findAll();
        int seeded = 0;
        for (Trader trader : traders) {
            if (trader.getId() == null) {
                continue;
            }
            try {
                chartOfAccountBootstrapService.seedSystemLedgersForTrader(trader.getId());
                seeded++;
            } catch (Exception e) {
                LOG.warn("Failed to seed system ledgers for trader {}: {}", trader.getId(), e.getMessage());
            }
        }
        LOG.info("SystemLedgerBootstrapRunner: checked {} traders, attempted seed on {} (already-seeded traders are skipped by bootstrap)", traders.size(), seeded);
    }
}
