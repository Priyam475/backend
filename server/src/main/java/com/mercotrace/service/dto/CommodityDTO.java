package com.mercotrace.service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

/**
 * A DTO for the {@link com.mercotrace.domain.Commodity} entity.
 * JSON keys aligned with frontend Commodity model (commodity_id, trader_id, commodity_name, created_at).
 */
@SuppressWarnings("common-java:DuplicatedBlocks")
public class CommodityDTO implements Serializable {

    @JsonProperty("commodity_id")
    private Long id;

    @JsonProperty("trader_id")
    private Long traderId;

    @NotBlank
    @Size(max = 150)
    @JsonProperty("commodity_name")
    private String commodityName;

    @JsonProperty("created_at")
    private Instant createdAt;

    @JsonProperty("created_by")
    private String createdBy;

    @JsonProperty("created_date")
    private Instant createdDate;

    @JsonProperty("last_modified_by")
    private String lastModifiedBy;

    @JsonProperty("last_modified_date")
    private Instant lastModifiedDate;

    @JsonProperty("active")
    private Boolean active;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTraderId() {
        return traderId;
    }

    public void setTraderId(Long traderId) {
        this.traderId = traderId;
    }

    public String getCommodityName() {
        return commodityName;
    }

    public void setCommodityName(String commodityName) {
        this.commodityName = commodityName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public Instant getCreatedDate() {
        return createdDate;
    }

    public void setCreatedDate(Instant createdDate) {
        this.createdDate = createdDate;
    }

    public String getLastModifiedBy() {
        return lastModifiedBy;
    }

    public void setLastModifiedBy(String lastModifiedBy) {
        this.lastModifiedBy = lastModifiedBy;
    }

    public Instant getLastModifiedDate() {
        return lastModifiedDate;
    }

    public void setLastModifiedDate(Instant lastModifiedDate) {
        this.lastModifiedDate = lastModifiedDate;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof CommodityDTO)) {
            return false;
        }
        CommodityDTO that = (CommodityDTO) o;
        if (this.id == null) {
            return false;
        }
        return Objects.equals(this.id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(this.id);
    }

    @Override
    public String toString() {
        return "CommodityDTO{" +
            "id=" + getId() +
            ", traderId=" + getTraderId() +
            ", commodityName='" + getCommodityName() + "'" +
            ", createdAt='" + getCreatedAt() + "'" +
            "}";
    }
}
