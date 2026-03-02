package com.mercotrace.service.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Objects;

/**
 * DTO for trial balance row in Financial Reports.
 * Aligned with frontend TrialBalanceRow (camelCase JSON, string IDs).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TrialBalanceRowDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String ledgerId;
    private String ledgerName;
    private String accountingClass;
    private BigDecimal debit;
    private BigDecimal credit;

    public String getLedgerId() {
        return ledgerId;
    }

    public void setLedgerId(String ledgerId) {
        this.ledgerId = ledgerId;
    }

    public String getLedgerName() {
        return ledgerName;
    }

    public void setLedgerName(String ledgerName) {
        this.ledgerName = ledgerName;
    }

    public String getAccountingClass() {
        return accountingClass;
    }

    public void setAccountingClass(String accountingClass) {
        this.accountingClass = accountingClass;
    }

    public BigDecimal getDebit() {
        return debit;
    }

    public void setDebit(BigDecimal debit) {
        this.debit = debit;
    }

    public BigDecimal getCredit() {
        return credit;
    }

    public void setCredit(BigDecimal credit) {
        this.credit = credit;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof TrialBalanceRowDTO)) {
            return false;
        }
        TrialBalanceRowDTO that = (TrialBalanceRowDTO) o;
        return Objects.equals(ledgerId, that.ledgerId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(ledgerId);
    }
}

