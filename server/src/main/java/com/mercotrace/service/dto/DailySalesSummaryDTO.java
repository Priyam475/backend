package com.mercotrace.service.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.Serializable;
import java.math.BigDecimal;

/**
 * DTO for daily sales summary metrics used in analytics reports.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DailySalesSummaryDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private long totalBills;
    private long totalBags;
    private BigDecimal grossSale;
    private BigDecimal commission;
    private BigDecimal userFee;
    private BigDecimal coolie;
    private BigDecimal netSales;
    private BigDecimal cashReceived;
    private BigDecimal bankReceived;
    private BigDecimal totalCollected;
    private BigDecimal outstanding;

    public long getTotalBills() {
        return totalBills;
    }

    public void setTotalBills(long totalBills) {
        this.totalBills = totalBills;
    }

    public long getTotalBags() {
        return totalBags;
    }

    public void setTotalBags(long totalBags) {
        this.totalBags = totalBags;
    }

    public BigDecimal getGrossSale() {
        return grossSale;
    }

    public void setGrossSale(BigDecimal grossSale) {
        this.grossSale = grossSale;
    }

    public BigDecimal getCommission() {
        return commission;
    }

    public void setCommission(BigDecimal commission) {
        this.commission = commission;
    }

    public BigDecimal getUserFee() {
        return userFee;
    }

    public void setUserFee(BigDecimal userFee) {
        this.userFee = userFee;
    }

    public BigDecimal getCoolie() {
        return coolie;
    }

    public void setCoolie(BigDecimal coolie) {
        this.coolie = coolie;
    }

    public BigDecimal getNetSales() {
        return netSales;
    }

    public void setNetSales(BigDecimal netSales) {
        this.netSales = netSales;
    }

    public BigDecimal getCashReceived() {
        return cashReceived;
    }

    public void setCashReceived(BigDecimal cashReceived) {
        this.cashReceived = cashReceived;
    }

    public BigDecimal getBankReceived() {
        return bankReceived;
    }

    public void setBankReceived(BigDecimal bankReceived) {
        this.bankReceived = bankReceived;
    }

    public BigDecimal getTotalCollected() {
        return totalCollected;
    }

    public void setTotalCollected(BigDecimal totalCollected) {
        this.totalCollected = totalCollected;
    }

    public BigDecimal getOutstanding() {
        return outstanding;
    }

    public void setOutstanding(BigDecimal outstanding) {
        this.outstanding = outstanding;
    }
}

