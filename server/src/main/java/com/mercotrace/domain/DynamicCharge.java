package com.mercotrace.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.io.Serializable;
import java.math.BigDecimal;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * Dynamic charge (e.g. Association Fee, Weighment Fee). Audit fields included.
 */
@Entity
@Table(name = "dynamic_charge")
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
public class DynamicCharge extends AbstractAuditingEntity<Long> implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @NotNull
    @Column(name = "commodity_id", nullable = false)
    private Long commodityId;

    @Column(name = "trader_id")
    private Long traderId;

    @NotNull
    @Size(max = 150)
    @Column(name = "charge_name", length = 150, nullable = false)
    private String chargeName;

    @NotNull
    @Size(max = 20)
    @Column(name = "charge_type", length = 20, nullable = false)
    private String chargeType;

    @NotNull
    @Column(name = "value_amount", precision = 19, scale = 4, nullable = false)
    private BigDecimal valueAmount;

    @NotNull
    @Size(max = 20)
    @Column(name = "applies_to", length = 20, nullable = false)
    private String appliesTo;

    @Column(name = "percent_basis", length = 30)
    private String percentBasis;

    @Column(name = "fixed_basis", length = 30)
    private String fixedBasis;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getCommodityId() {
        return commodityId;
    }

    public void setCommodityId(Long commodityId) {
        this.commodityId = commodityId;
    }

    public Long getTraderId() {
        return traderId;
    }

    public void setTraderId(Long traderId) {
        this.traderId = traderId;
    }

    public String getChargeName() {
        return chargeName;
    }

    public void setChargeName(String chargeName) {
        this.chargeName = chargeName;
    }

    public String getChargeType() {
        return chargeType;
    }

    public void setChargeType(String chargeType) {
        this.chargeType = chargeType;
    }

    public BigDecimal getValueAmount() {
        return valueAmount;
    }

    public void setValueAmount(BigDecimal valueAmount) {
        this.valueAmount = valueAmount;
    }

    public String getAppliesTo() {
        return appliesTo;
    }

    public void setAppliesTo(String appliesTo) {
        this.appliesTo = appliesTo;
    }

    public String getPercentBasis() {
        return percentBasis;
    }

    public void setPercentBasis(String percentBasis) {
        this.percentBasis = percentBasis;
    }

    public String getFixedBasis() {
        return fixedBasis;
    }

    public void setFixedBasis(String fixedBasis) {
        this.fixedBasis = fixedBasis;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof DynamicCharge)) return false;
        return id != null && id.equals(((DynamicCharge) o).getId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
