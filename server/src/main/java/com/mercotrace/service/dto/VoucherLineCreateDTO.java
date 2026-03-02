package com.mercotrace.service.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.io.Serializable;
import java.math.BigDecimal;

/**
 * Single line for create voucher request: ledgerId, debit, credit.
 */
public class VoucherLineCreateDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    @NotNull(message = "Ledger is required")
    private Long ledgerId;

    @NotNull
    @DecimalMin(value = "0", inclusive = true)
    private BigDecimal debit = BigDecimal.ZERO;

    @NotNull
    @DecimalMin(value = "0", inclusive = true)
    private BigDecimal credit = BigDecimal.ZERO;

    public Long getLedgerId() { return ledgerId; }
    public void setLedgerId(Long ledgerId) { this.ledgerId = ledgerId; }
    public BigDecimal getDebit() { return debit; }
    public void setDebit(BigDecimal debit) { this.debit = debit != null ? debit : BigDecimal.ZERO; }
    public BigDecimal getCredit() { return credit; }
    public void setCredit(BigDecimal credit) { this.credit = credit != null ? credit : BigDecimal.ZERO; }
}
