package com.mercotrace.domain.enumeration;

/**
 * Type of accounting voucher. Aligned with frontend VoucherType in client/src/types/accounting.ts.
 */
public enum VoucherType {
    SALES_BILL,
    SALES_SETTLEMENT,
    RECEIPT,
    PAYMENT,
    JOURNAL,
    CONTRA,
    ADVANCE,
    WRITE_OFF,
}
