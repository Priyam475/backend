package com.mercotrace.service.impl;

import com.mercotrace.repository.UserTraderRepository;
import com.mercotrace.security.SecurityUtils;
import com.mercotrace.service.TraderContextService;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * Default implementation: resolves the current trader id from the authenticated user.
 * Uses {@link com.mercotrace.repository.UserTraderRepository} primary mapping for the
 * current user id (from {@link com.mercotrace.security.SecurityUtils}).
 */
@Service
public class DefaultTraderContextServiceImpl implements TraderContextService {

    private final UserTraderRepository userTraderRepository;

    public DefaultTraderContextServiceImpl(UserTraderRepository userTraderRepository) {
        this.userTraderRepository = userTraderRepository;
    }

    @Override
    public Long getCurrentTraderId() {
        Long userId = SecurityUtils
            .getCurrentUserId()
            .orElseThrow(() -> new IllegalStateException("No authenticated user found for trader resolution"));

        return userTraderRepository
            .findFirstByUserIdAndPrimaryMappingTrue(userId)
            .map(mapping -> {
                if (mapping.getTrader() == null || mapping.getTrader().getId() == null) {
                    throw new IllegalStateException("Primary trader mapping has no trader id for user " + userId);
                }
                return mapping.getTrader().getId();
            })
            .orElseThrow(() -> new IllegalStateException("No primary trader mapping found for user " + userId));
    }

    @Override
    public Optional<Long> getCurrentTraderIdOptional() {
        return SecurityUtils
            .getCurrentUserId()
            .flatMap(userTraderRepository::findFirstByUserIdAndPrimaryMappingTrue)
            .filter(mapping -> mapping.getTrader() != null && mapping.getTrader().getId() != null)
            .map(mapping -> mapping.getTrader().getId());
    }
}
