package com.mercotrace.service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * DTO for dynamic_charge. Includes audit fields.
 */
public class DynamicChargeDTO implements Serializable {

    private Long id;

    @NotNull
    @JsonProperty("commodity_id")
    private Long commodityId;

    @JsonProperty("trader_id")
    private Long traderId;

    @NotNull
    @Size(max = 150)
    @JsonProperty("charge_name")
    private String chargeName;

    @NotNull
    @Size(max = 20)
    @JsonProperty("charge_type")
    private String chargeType;

    @NotNull
    @JsonProperty("value")
    private BigDecimal valueAmount;

    @NotNull
    @Size(max = 20)
    @JsonProperty("applies_to")
    private String appliesTo;

    @JsonProperty("percent_basis")
    private String percentBasis;

    @JsonProperty("fixed_basis")
    private String fixedBasis;

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
    public Long getTraderId() { return traderId; }
    public void setTraderId(Long traderId) { this.traderId = traderId; }
    public String getChargeName() { return chargeName; }
    public void setChargeName(String chargeName) { this.chargeName = chargeName; }
    public String getChargeType() { return chargeType; }
    public void setChargeType(String chargeType) { this.chargeType = chargeType; }
    public BigDecimal getValueAmount() { return valueAmount; }
    public void setValueAmount(BigDecimal valueAmount) { this.valueAmount = valueAmount; }
    public String getAppliesTo() { return appliesTo; }
    public void setAppliesTo(String appliesTo) { this.appliesTo = appliesTo; }
    public String getPercentBasis() { return percentBasis; }
    public void setPercentBasis(String percentBasis) { this.percentBasis = percentBasis; }
    public String getFixedBasis() { return fixedBasis; }
    public void setFixedBasis(String fixedBasis) { this.fixedBasis = fixedBasis; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedDate() { return createdDate; }
    public void setCreatedDate(Instant createdDate) { this.createdDate = createdDate; }
    public String getLastModifiedBy() { return lastModifiedBy; }
    public void setLastModifiedBy(String lastModifiedBy) { this.lastModifiedBy = lastModifiedBy; }
    public Instant getLastModifiedDate() { return lastModifiedDate; }
    public void setLastModifiedDate(Instant lastModifiedDate) { this.lastModifiedDate = lastModifiedDate; }
}
