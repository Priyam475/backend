package com.mercotrace.service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/**
 * Aggregated DTO for loading/saving full commodity config in one request.
 * Used by GET/PUT /api/commodities/{commodityId}/full-config.
 */
public class FullCommodityConfigDTO implements Serializable {

    @NotNull
    private Long commodityId;

    @Valid
    private CommodityConfigDTO config;

    @Valid
    private List<DeductionRuleDTO> deductionRules = new ArrayList<>();

    @Valid
    private List<HamaliSlabDTO> hamaliSlabs = new ArrayList<>();

    @Valid
    private List<DynamicChargeDTO> dynamicCharges = new ArrayList<>();

    public Long getCommodityId() {
        return commodityId;
    }

    public void setCommodityId(Long commodityId) {
        this.commodityId = commodityId;
    }

    public CommodityConfigDTO getConfig() {
        return config;
    }

    public void setConfig(CommodityConfigDTO config) {
        this.config = config;
    }

    public List<DeductionRuleDTO> getDeductionRules() {
        return deductionRules;
    }

    public void setDeductionRules(List<DeductionRuleDTO> deductionRules) {
        this.deductionRules = deductionRules != null ? deductionRules : new ArrayList<>();
    }

    public List<HamaliSlabDTO> getHamaliSlabs() {
        return hamaliSlabs;
    }

    public void setHamaliSlabs(List<HamaliSlabDTO> hamaliSlabs) {
        this.hamaliSlabs = hamaliSlabs != null ? hamaliSlabs : new ArrayList<>();
    }

    public List<DynamicChargeDTO> getDynamicCharges() {
        return dynamicCharges;
    }

    public void setDynamicCharges(List<DynamicChargeDTO> dynamicCharges) {
        this.dynamicCharges = dynamicCharges != null ? dynamicCharges : new ArrayList<>();
    }
}
