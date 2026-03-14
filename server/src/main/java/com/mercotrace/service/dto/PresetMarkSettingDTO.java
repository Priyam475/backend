package com.mercotrace.service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/**
 * DTO for Preset Mark Setting (Auction preset margin configuration).
 */
public class PresetMarkSettingDTO {

    private Long id;

    @NotBlank
    @Size(min = 1, max = 20)
    @Pattern(regexp = "^[a-zA-Z0-9]+$", message = "Only letters and numbers allowed (no spaces or special characters)")
    @JsonProperty("predefined_mark")
    private String predefinedMark;

    @NotNull
    @DecimalMin(value = "0", inclusive = true)
    @DecimalMax(value = "100000", inclusive = true)
    @JsonProperty("extra_amount")
    private BigDecimal extraAmount;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPredefinedMark() {
        return predefinedMark;
    }

    public void setPredefinedMark(String predefinedMark) {
        this.predefinedMark = predefinedMark;
    }

    public BigDecimal getExtraAmount() {
        return extraAmount;
    }

    public void setExtraAmount(BigDecimal extraAmount) {
        this.extraAmount = extraAmount;
    }
}
