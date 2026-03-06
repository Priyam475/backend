package com.mercotrace.service;

import com.mercotrace.domain.UserTrader;
import com.mercotrace.repository.UserTraderRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Startup component that upgrades existing trader OWNER users so they receive
 * the full trader-module authority set.
 */
@Component
public class TraderOwnerAuthorityBootstrap {

    private static final Logger LOG = LoggerFactory.getLogger(TraderOwnerAuthorityBootstrap.class);

    private final UserTraderRepository userTraderRepository;
    private final TraderOwnerAuthorityService traderOwnerAuthorityService;

    public TraderOwnerAuthorityBootstrap(
        UserTraderRepository userTraderRepository,
        TraderOwnerAuthorityService traderOwnerAuthorityService
    ) {
        this.userTraderRepository = userTraderRepository;
        this.traderOwnerAuthorityService = traderOwnerAuthorityService;
    }

    // TODO 2026-03-04: This startup backfill is temporarily disabled to avoid
    // LazyInitializationException caused by logging user entities outside an
    // active Hibernate session during bean initialization.
    //
    // When reworking this, prefer an @EventListener(ApplicationReadyEvent) with
    // proper transactional boundaries and ID-based loading to avoid touching
    // lazily-initialized associations in a non-managed context.
    @Transactional
    public void upgradeExistingTraderOwners() {
        List<UserTrader> ownerMappings = userTraderRepository.findAllByRoleInTraderAndPrimaryMappingTrue("OWNER");
        if (ownerMappings.isEmpty()) {
            LOG.info("TraderOwnerAuthorityBootstrap: no existing OWNER mappings found to upgrade.");
            return;
        }

        int updated = 0;
        for (UserTrader mapping : ownerMappings) {
            if (mapping.getUser() == null) {
                continue;
            }
            traderOwnerAuthorityService.ensureTraderOwnerAuthorities(mapping.getUser());
            updated++;
        }

        LOG.info("TraderOwnerAuthorityBootstrap: processed {} OWNER user mappings for trader-module authority upgrade.", updated);
    }
}

