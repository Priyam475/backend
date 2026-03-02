package com.mercotrace.domain.enumeration;

/**
 * Lifecycle status of an accounting voucher (VoucherHeader).
 * Aligned with frontend VoucherLifecycle in client/src/types/accounting.ts.
 */
public enum VoucherLifecycleStatus {
    DRAFT,
    POSTED,
    PARTIALLY_SETTLED,
    CLOSED,
    REVERSED,
}
