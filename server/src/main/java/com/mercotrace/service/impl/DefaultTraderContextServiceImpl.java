package com.mercotrace.service.impl;

import com.mercotrace.domain.Trader;
import com.mercotrace.repository.TraderRepository;
import com.mercotrace.repository.UserTraderRepository;
import com.mercotrace.security.SecurityUtils;
import com.mercotrace.service.TraderContextService;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * Default implementation: resolves the current trader id from the authenticated user.
 * Uses {@link com.mercotrace.repository.UserTraderRepository} primary mapping for the
 * current user id (from {@link com.mercotrace.security.SecurityUtils}).
 * Rejects resolution when the trader is inactive.
 */
@Service
public class DefaultTraderContextServiceImpl implements TraderContextService {

    private final UserTraderRepository userTraderRepository;
    private final TraderRepository traderRepository;

    public DefaultTraderContextServiceImpl(UserTraderRepository userTraderRepository, TraderRepository traderRepository) {
        this.userTraderRepository = userTraderRepository;
        this.traderRepository = traderRepository;
    }

    @Override
    public Long getCurrentTraderId() {
        Long userId = SecurityUtils
            .getCurrentUserId()
            .orElseThrow(() -> new IllegalStateException("No authenticated user found for trader resolution"));

        return userTraderRepository
            .findFirstByUserIdAndPrimaryMappingTrueAndActiveTrue(userId)
            .map(mapping -> {
                if (mapping.getTrader() == null || mapping.getTrader().getId() == null) {
                    throw new IllegalStateException("Primary trader mapping has no trader id for user " + userId);
                }
                Long traderId = mapping.getTrader().getId();
                Trader trader = traderRepository.findById(traderId).orElse(null);
                if (trader == null || !Boolean.TRUE.equals(trader.getActive())) {
                    throw new IllegalStateException("Trader account is inactive");
                }
                return traderId;
            })
            .orElseThrow(() -> new IllegalStateException("No primary trader mapping found for user " + userId));
    }

    @Override
    public Optional<Long> getCurrentTraderIdOptional() {
        return SecurityUtils
            .getCurrentUserId()
            .flatMap(userTraderRepository::findFirstByUserIdAndPrimaryMappingTrueAndActiveTrue)
            .filter(mapping -> mapping.getTrader() != null && mapping.getTrader().getId() != null)
            .flatMap(mapping -> {
                Long traderId = mapping.getTrader().getId();
                Trader trader = traderRepository.findById(traderId).orElse(null);
                if (trader == null || !Boolean.TRUE.equals(trader.getActive())) {
                    return Optional.<Long>empty();
                }
                return Optional.of(traderId);
            });
    }
}
