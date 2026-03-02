package com.mercotrace.service.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Objects;

/**
 * DTO for party exposure summary row (used in analytics reports).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PartyExposureRowDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String party;
    private BigDecimal totalSale;
    private BigDecimal totalCollected;
    private BigDecimal outstanding;
    private String oldestDue; // ISO date string (yyyy-MM-dd) or "-"
    private String riskLevel;

    public String getParty() {
        return party;
    }

    public void setParty(String party) {
        this.party = party;
    }

    public BigDecimal getTotalSale() {
        return totalSale;
    }

    public void setTotalSale(BigDecimal totalSale) {
        this.totalSale = totalSale;
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

    public String getOldestDue() {
        return oldestDue;
    }

    public void setOldestDue(String oldestDue) {
        this.oldestDue = oldestDue;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof PartyExposureRowDTO)) {
            return false;
        }
        PartyExposureRowDTO that = (PartyExposureRowDTO) o;
        return Objects.equals(party, that.party);
    }

    @Override
    public int hashCode() {
        return Objects.hash(party);
    }
}

