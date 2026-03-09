package com.mercotrace.contact.portal.service.dto;

import com.mercotrace.domain.enumeration.ArApStatus;
import com.mercotrace.domain.enumeration.ArApType;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Minimal DTO for AR/AP statements visible in the Contact Portal.
 */
public class ContactPortalStatementDTO implements Serializable {

    private String documentId;
    private String traderId;
    private ArApType type;
    private String referenceNumber;
    private BigDecimal originalAmount;
    private BigDecimal outstandingBalance;
    private ArApStatus status;
    private LocalDate documentDate;

    public String getDocumentId() {
        return documentId;
    }

    public void setDocumentId(String documentId) {
        this.documentId = documentId;
    }

    public String getTraderId() {
        return traderId;
    }

    public void setTraderId(String traderId) {
        this.traderId = traderId;
    }

    public ArApType getType() {
        return type;
    }

    public void setType(ArApType type) {
        this.type = type;
    }

    public String getReferenceNumber() {
        return referenceNumber;
    }

    public void setReferenceNumber(String referenceNumber) {
        this.referenceNumber = referenceNumber;
    }

    public BigDecimal getOriginalAmount() {
        return originalAmount;
    }

    public void setOriginalAmount(BigDecimal originalAmount) {
        this.originalAmount = originalAmount;
    }

    public BigDecimal getOutstandingBalance() {
        return outstandingBalance;
    }

    public void setOutstandingBalance(BigDecimal outstandingBalance) {
        this.outstandingBalance = outstandingBalance;
    }

    public ArApStatus getStatus() {
        return status;
    }

    public void setStatus(ArApStatus status) {
        this.status = status;
    }

    public LocalDate getDocumentDate() {
        return documentDate;
    }

    public void setDocumentDate(LocalDate documentDate) {
        this.documentDate = documentDate;
    }
}

