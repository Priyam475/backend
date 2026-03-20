package com.mercotrace.service;

/**
 * How trader-facing contact lists are scoped.
 */
public enum ContactListScope {
    /** Contacts registry: trader-owned plus portal participants already used by this trader. */
    REGISTRY,
    /** Arrival / auction picker: trader-owned plus all active self-signup (portal) contacts. */
    PARTICIPANTS,
}
