package com.mercotrace.service.dto;

import com.mercotrace.domain.enumeration.BusinessMode;
import jakarta.validation.constraints.Size;
import java.io.Serializable;
import java.util.Objects;

/**
 * DTO for trader configuration (business_mode, bill_prefix) — Module 1 spec GET/PATCH /traders/{id}/config.
 */
public class TraderConfigDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private BusinessMode businessMode;

    @Size(max = 20)
    private String billPrefix;

    public BusinessMode getBusinessMode() {
        return businessMode;
    }

    public void setBusinessMode(BusinessMode businessMode) {
        this.businessMode = businessMode;
    }

    public String getBillPrefix() {
        return billPrefix;
    }

    public void setBillPrefix(String billPrefix) {
        this.billPrefix = billPrefix;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof TraderConfigDTO)) return false;
        TraderConfigDTO that = (TraderConfigDTO) o;
        return businessMode == that.businessMode && Objects.equals(billPrefix, that.billPrefix);
    }

    @Override
    public int hashCode() {
        return Objects.hash(businessMode, billPrefix);
    }
}
