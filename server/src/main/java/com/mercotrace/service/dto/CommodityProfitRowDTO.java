package com.mercotrace.service.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Objects;

/**
 * DTO for commodity profitability row.
 * Aligned with frontend CommodityProfitRow (camelCase JSON).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CommodityProfitRowDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String commodityName;
    private BigDecimal income;
    private BigDecimal expenses;
    private BigDecimal profit;

    public String getCommodityName() {
        return commodityName;
    }

    public void setCommodityName(String commodityName) {
        this.commodityName = commodityName;
    }

    public BigDecimal getIncome() {
        return income;
    }

    public void setIncome(BigDecimal income) {
        this.income = income;
    }

    public BigDecimal getExpenses() {
        return expenses;
    }

    public void setExpenses(BigDecimal expenses) {
        this.expenses = expenses;
    }

    public BigDecimal getProfit() {
        return profit;
    }

    public void setProfit(BigDecimal profit) {
        this.profit = profit;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof CommodityProfitRowDTO)) {
            return false;
        }
        CommodityProfitRowDTO that = (CommodityProfitRowDTO) o;
        return Objects.equals(commodityName, that.commodityName);
    }

    @Override
    public int hashCode() {
        return Objects.hash(commodityName);
    }
}

