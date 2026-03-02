package com.mercotrace.service.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Objects;

/**
 * DTO for Balance Sheet row (asset / liability / equity).
 * Aligned with frontend BalanceSheetRow (camelCase JSON).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BalanceSheetRowDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    /** ASSET, LIABILITY or EQUITY. */
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
        if (!(o instanceof BalanceSheetRowDTO)) {
            return false;
        }
        BalanceSheetRowDTO that = (BalanceSheetRowDTO) o;
        return Objects.equals(category, that.category)
            && Objects.equals(ledgerName, that.ledgerName);
    }

    @Override
    public int hashCode() {
        return Objects.hash(category, ledgerName);
    }
}

