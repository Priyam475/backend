package com.mercotrace.service.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Objects;

/**
 * DTO for Profit & Loss row (income/expense).
 * Aligned with frontend PLRow (camelCase JSON).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PLRowDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    /** INCOME or EXPENSE (from AccountingClass). */
    private String category;
    private String ledgerName;
    private BigDecimal amount;

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getLedgerName() {
        return ledgerName;
    }

    public void setLedgerName(String ledgerName) {
        this.ledgerName = ledgerName;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof PLRowDTO)) {
            return false;
        }
        PLRowDTO that = (PLRowDTO) o;
        return Objects.equals(category, that.category)
            && Objects.equals(ledgerName, that.ledgerName);
    }

    @Override
    public int hashCode() {
        return Objects.hash(category, ledgerName);
    }
}

