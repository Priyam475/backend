package com.mercotrace.contact.portal.service.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Minimal DTO for stock purchases visible in the Contact Portal.
 */
public class ContactPortalPurchaseDTO implements Serializable {

    private String purchaseId;
    private String traderId;
    private Instant purchaseDate;
    private BigDecimal totalAmount;

    public String getPurchaseId() {
        return purchaseId;
    }

    public void setPurchaseId(String purchaseId) {
        this.purchaseId = purchaseId;
    }

    public String getTraderId() {
        return traderId;
    }

    public void setTraderId(String traderId) {
        this.traderId = traderId;
    }

    public Instant getPurchaseDate() {
        return purchaseDate;
    }

    public void setPurchaseDate(Instant purchaseDate) {
        this.purchaseDate = purchaseDate;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }
}

