package com.mercotrace.service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import java.io.Serializable;
import java.time.Instant;

public class HamaliSlabDTO implements Serializable {

    private Long id;

    @NotNull
    @JsonProperty("commodity_id")
    private Long commodityId;

    @NotNull
    @JsonProperty("threshold_weight")
    private Double thresholdWeight;

    @NotNull
    @JsonProperty("fixed_rate")
    private Double fixedRate;

    @NotNull
    @JsonProperty("per_kg_rate")
    private Double perKgRate = 0D;

    @JsonProperty("created_by")
    private String createdBy;

    @JsonProperty("created_date")
    private Instant createdDate;

    @JsonProperty("last_modified_by")
    private String lastModifiedBy;

    @JsonProperty("last_modified_date")
    private Instant lastModifiedDate;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getCommodityId() { return commodityId; }
    public void setCommodityId(Long commodityId) { this.commodityId = commodityId; }
    public Double getThresholdWeight() { return thresholdWeight; }
    public void setThresholdWeight(Double thresholdWeight) { this.thresholdWeight = thresholdWeight; }
    public Double getFixedRate() { return fixedRate; }
    public void setFixedRate(Double fixedRate) { this.fixedRate = fixedRate; }
    public Double getPerKgRate() { return perKgRate; }
    public void setPerKgRate(Double perKgRate) { this.perKgRate = perKgRate; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedDate() { return createdDate; }
    public void setCreatedDate(Instant createdDate) { this.createdDate = createdDate; }
    public String getLastModifiedBy() { return lastModifiedBy; }
    public void setLastModifiedBy(String lastModifiedBy) { this.lastModifiedBy = lastModifiedBy; }
    public Instant getLastModifiedDate() { return lastModifiedDate; }
    public void setLastModifiedDate(Instant lastModifiedDate) { this.lastModifiedDate = lastModifiedDate; }
}
