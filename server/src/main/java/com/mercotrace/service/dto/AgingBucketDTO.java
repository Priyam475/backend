package com.mercotrace.service.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Objects;

/**
 * DTO for AR/AP aging bucket per contact.
 * Aligned with frontend AgingBucket (camelCase JSON).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AgingBucketDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String contactName;
    private BigDecimal current;
    private BigDecimal days30;
    private BigDecimal days60;
    private BigDecimal days90;
    private BigDecimal over90;
    private BigDecimal total;

    public String getContactName() {
        return contactName;
    }

    public void setContactName(String contactName) {
        this.contactName = contactName;
    }

    public BigDecimal getCurrent() {
        return current;
    }

    public void setCurrent(BigDecimal current) {
        this.current = current;
    }

    public BigDecimal getDays30() {
        return days30;
    }

    public void setDays30(BigDecimal days30) {
        this.days30 = days30;
    }

    public BigDecimal getDays60() {
        return days60;
    }

    public void setDays60(BigDecimal days60) {
        this.days60 = days60;
    }

    public BigDecimal getDays90() {
        return days90;
    }

    public void setDays90(BigDecimal days90) {
        this.days90 = days90;
    }

    public BigDecimal getOver90() {
        return over90;
    }

    public void setOver90(BigDecimal over90) {
        this.over90 = over90;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof AgingBucketDTO)) {
            return false;
        }
        AgingBucketDTO that = (AgingBucketDTO) o;
        return Objects.equals(contactName, that.contactName);
    }

    @Override
    public int hashCode() {
        return Objects.hash(contactName);
    }
}

