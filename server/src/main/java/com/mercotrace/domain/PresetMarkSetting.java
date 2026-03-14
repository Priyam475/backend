package com.mercotrace.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.io.Serializable;
import java.math.BigDecimal;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * Preset mark setting for Auction (Sales Pad): predefined mark label and extra amount (₹).
 * One row per trader preset; used for dynamic margin buttons in AuctionsPage.
 */
@Entity
@Table(name = "preset_mark_setting")
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
public class PresetMarkSetting implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @NotNull
    @Column(name = "trader_id", nullable = false)
    private Long traderId;

    @NotBlank
    @Size(min = 1, max = 20)
    @Pattern(regexp = "^[a-zA-Z0-9]+$", message = "Only letters and numbers allowed (no spaces or special characters)")
    @Column(name = "predefined_mark", length = 20, nullable = false)
    private String predefinedMark;

    @NotNull
    @DecimalMin(value = "0", inclusive = true)
    @DecimalMax(value = "100000", inclusive = true)
    @Column(name = "extra_amount", precision = 19, scale = 2, nullable = false)
    private BigDecimal extraAmount;

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
