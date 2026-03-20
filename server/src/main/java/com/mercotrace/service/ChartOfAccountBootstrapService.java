package com.mercotrace.service;

/**
 * Seeds system-generated ledgers (Cash, AR Control, AP Control, etc.) for a trader.
 * Idempotent: skips if trader already has system ledgers.
 */
public interface ChartOfAccountBootstrapService {

    /**
     * Seeds system ledgers for the given trader if none exist.
     * Creates: Cash, Accounts Receivable – Control, Accounts Payable – Control.
     * Safe to call multiple times; no-op if trader already has any system ledger.
     *
     * @param traderId the trader id (must exist).
     */
    void seedSystemLedgersForTrader(Long traderId);
}
