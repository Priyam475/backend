package com.mercotrace.service;

import java.util.Optional;

/**
 * Resolves the current trader id for request-scoped operations.
 * Default implementation returns the dev seed trader (101). In production this can be
 * replaced with an implementation that resolves the trader from the authenticated user
 * (e.g. SecurityUtils.getCurrentUserLogin() and User.traderId when that column exists).
 */
public interface TraderContextService {

    /**
     * @return the current trader id (e.g. 101 in dev; from JWT/User in production).
     * @throws IllegalStateException if the current user has no primary trader mapping (e.g. admin).
     */
    Long getCurrentTraderId();

    /**
     * Optional trader context. Use when the caller may be either a trader or an admin.
     *
     * @return {@link Optional#of(Long)} when the current user has a primary trader mapping,
     *         {@link Optional#empty()} otherwise (e.g. admin or no mapping).
     */
    Optional<Long> getCurrentTraderIdOptional();
}
