package com.mercotrace.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.io.Serializable;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * Hamali (unloading) charge slab: threshold, fixed rate, per-kg rate. Audit fields included.
 */
@Entity
@Table(name = "hamali_slab")
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
public class HamaliSlab extends AbstractAuditingEntity<Long> implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @NotNull
    @Column(name = "commodity_id", nullable = false)
    private Long commodityId;

    @NotNull
    @Column(name = "threshold_weight", nullable = false)
    private Double thresholdWeight;

    @NotNull
    @Column(name = "fixed_rate", nullable = false)
    private Double fixedRate;

    @NotNull
    @Column(name = "per_kg_rate", nullable = false)
    private Double perKgRate = 0D;

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

    public Double getThresholdWeight() {
        return thresholdWeight;
    }

    public void setThresholdWeight(Double thresholdWeight) {
        this.thresholdWeight = thresholdWeight;
    }

    public Double getFixedRate() {
        return fixedRate;
    }

    public void setFixedRate(Double fixedRate) {
        this.fixedRate = fixedRate;
    }

    public Double getPerKgRate() {
        return perKgRate;
    }

    public void setPerKgRate(Double perKgRate) {
        this.perKgRate = perKgRate;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof HamaliSlab)) return false;
        return id != null && id.equals(((HamaliSlab) o).getId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
