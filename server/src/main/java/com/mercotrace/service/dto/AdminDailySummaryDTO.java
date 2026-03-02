package com.mercotrace.service.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.Serializable;
import java.math.BigDecimal;

/**
 * DTO for admin-level daily summary metrics (AdminReportsPage).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdminDailySummaryDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private long totalArrivals;
    private long totalLots;
    private long totalAuctions;
    private long totalBills;
    private BigDecimal totalRevenue;
    private BigDecimal totalCollected;
    private BigDecimal totalPending;

    public long getTotalArrivals() {
        return totalArrivals;
    }

    public void setTotalArrivals(long totalArrivals) {
        this.totalArrivals = totalArrivals;
    }

    public long getTotalLots() {
        return totalLots;
    }

    public void setTotalLots(long totalLots) {
        this.totalLots = totalLots;
    }

    public long getTotalAuctions() {
        return totalAuctions;
    }

    public void setTotalAuctions(long totalAuctions) {
        this.totalAuctions = totalAuctions;
    }

    public long getTotalBills() {
        return totalBills;
    }

    public void setTotalBills(long totalBills) {
        this.totalBills = totalBills;
    }

    public BigDecimal getTotalRevenue() {
        return totalRevenue;
    }

    public void setTotalRevenue(BigDecimal totalRevenue) {
        this.totalRevenue = totalRevenue;
    }

    public BigDecimal getTotalCollected() {
        return totalCollected;
    }

    public void setTotalCollected(BigDecimal totalCollected) {
        this.totalCollected = totalCollected;
    }

    public BigDecimal getTotalPending() {
        return totalPending;
    }

    public void setTotalPending(BigDecimal totalPending) {
        this.totalPending = totalPending;
    }
}

