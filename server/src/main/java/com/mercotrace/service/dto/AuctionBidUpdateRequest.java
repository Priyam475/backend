package com.mercotrace.service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.mercotrace.domain.enumeration.AuctionPresetType;
import java.io.Serializable;
import java.math.BigDecimal;

/**
 * Request DTO for updating editable fields on an existing bid.
 */
@SuppressWarnings("common-java:DuplicatedBlocks")
public class AuctionBidUpdateRequest implements Serializable {

    @JsonProperty("token_advance")
    private BigDecimal tokenAdvance;

    @JsonProperty("extra_rate")
    private BigDecimal extraRate;

    @JsonProperty("preset_applied")
    private BigDecimal presetApplied;

    @JsonProperty("preset_type")
    private AuctionPresetType presetType;

    public BigDecimal getTokenAdvance() {
        return tokenAdvance;
    }

    public void setTokenAdvance(BigDecimal tokenAdvance) {
        this.tokenAdvance = tokenAdvance;
    }

    public BigDecimal getExtraRate() {
        return extraRate;
    }

    public void setExtraRate(BigDecimal extraRate) {
        this.extraRate = extraRate;
    }

    public BigDecimal getPresetApplied() {
        return presetApplied;
    }

    public void setPresetApplied(BigDecimal presetApplied) {
        this.presetApplied = presetApplied;
    }

    public AuctionPresetType getPresetType() {
        return presetType;
    }

    public void setPresetType(AuctionPresetType presetType) {
        this.presetType = presetType;
    }
}

