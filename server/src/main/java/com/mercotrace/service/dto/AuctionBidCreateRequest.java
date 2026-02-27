package com.mercotrace.service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.mercotrace.domain.enumeration.AuctionPresetType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.io.Serializable;
import java.math.BigDecimal;

/**
 * Request DTO for creating a new bid from Sales Pad.
 * Mirrors the frontend payload shape.
 */
@SuppressWarnings("common-java:DuplicatedBlocks")
public class AuctionBidCreateRequest implements Serializable {

    @JsonProperty("buyer_id")
    private Long buyerId;

    @NotBlank
    @JsonProperty("buyer_name")
    private String buyerName;

    @NotBlank
    @JsonProperty("buyer_mark")
    private String buyerMark;

    @JsonProperty("is_scribble")
    private boolean scribble;

    @JsonProperty("is_self_sale")
    private boolean selfSale;

    @NotNull
    @Min(1)
    @JsonProperty("rate")
    private BigDecimal rate;

    @NotNull
    @Min(1)
    @JsonProperty("quantity")
    private Integer quantity;

    @JsonProperty("extra_rate")
    private BigDecimal extraRate = BigDecimal.ZERO;

    @JsonProperty("preset_applied")
    private BigDecimal presetApplied = BigDecimal.ZERO;

    @JsonProperty("preset_type")
    private AuctionPresetType presetType = AuctionPresetType.PROFIT;

    @JsonProperty("token_advance")
    private BigDecimal tokenAdvance = BigDecimal.ZERO;

    @JsonProperty("allow_lot_increase")
    private boolean allowLotIncrease;

    public Long getBuyerId() {
        return buyerId;
    }

    public void setBuyerId(Long buyerId) {
        this.buyerId = buyerId;
    }

    public String getBuyerName() {
        return buyerName;
    }

    public void setBuyerName(String buyerName) {
        this.buyerName = buyerName;
    }

    public String getBuyerMark() {
        return buyerMark;
    }

    public void setBuyerMark(String buyerMark) {
        this.buyerMark = buyerMark;
    }

    public boolean isScribble() {
        return scribble;
    }

    public void setScribble(boolean scribble) {
        this.scribble = scribble;
    }

    public boolean isSelfSale() {
        return selfSale;
    }

    public void setSelfSale(boolean selfSale) {
        this.selfSale = selfSale;
    }

    public BigDecimal getRate() {
        return rate;
    }

    public void setRate(BigDecimal rate) {
        this.rate = rate;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
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

    public BigDecimal getTokenAdvance() {
        return tokenAdvance;
    }

    public void setTokenAdvance(BigDecimal tokenAdvance) {
        this.tokenAdvance = tokenAdvance;
    }

    public boolean isAllowLotIncrease() {
        return allowLotIncrease;
    }

    public void setAllowLotIncrease(boolean allowLotIncrease) {
        this.allowLotIncrease = allowLotIncrease;
    }
}

