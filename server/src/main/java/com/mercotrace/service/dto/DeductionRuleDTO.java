package com.mercotrace.service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import java.io.Serializable;
import java.time.Instant;

/**
 * DTO for deduction_rule. Includes audit fields.
 */
public class DeductionRuleDTO implements Serializable {

    private Long id;

    @NotNull
    @JsonProperty("commodity_id")
    private Long commodityId;

    @NotNull
    @JsonProperty("min_weight")
    private Double minWeight;

    @NotNull
    @JsonProperty("max_weight")
    private Double maxWeight;

    @NotNull
    @JsonProperty("deduction_value")
    private Double deductionValue;

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
    public Double getMinWeight() { return minWeight; }
    public void setMinWeight(Double minWeight) { this.minWeight = minWeight; }
    public Double getMaxWeight() { return maxWeight; }
    public void setMaxWeight(Double maxWeight) { this.maxWeight = maxWeight; }
    public Double getDeductionValue() { return deductionValue; }
    public void setDeductionValue(Double deductionValue) { this.deductionValue = deductionValue; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedDate() { return createdDate; }
    public void setCreatedDate(Instant createdDate) { this.createdDate = createdDate; }
    public String getLastModifiedBy() { return lastModifiedBy; }
    public void setLastModifiedBy(String lastModifiedBy) { this.lastModifiedBy = lastModifiedBy; }
    public Instant getLastModifiedDate() { return lastModifiedDate; }
    public void setLastModifiedDate(Instant lastModifiedDate) { this.lastModifiedDate = lastModifiedDate; }
}
