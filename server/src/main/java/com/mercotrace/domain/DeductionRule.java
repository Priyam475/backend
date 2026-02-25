package com.mercotrace.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.io.Serializable;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * Government deduction rule: weight range -> deduction value. Audit fields included.
 */
@Entity
@Table(name = "deduction_rule")
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
public class DeductionRule extends AbstractAuditingEntity<Long> implements Serializable {

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
    @Column(name = "min_weight", nullable = false)
    private Double minWeight;

    @NotNull
    @Column(name = "max_weight", nullable = false)
    private Double maxWeight;

    @NotNull
    @Column(name = "deduction_value", nullable = false)
    private Double deductionValue;

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

    public Double getMinWeight() {
        return minWeight;
    }

    public void setMinWeight(Double minWeight) {
        this.minWeight = minWeight;
    }

    public Double getMaxWeight() {
        return maxWeight;
    }

    public void setMaxWeight(Double maxWeight) {
        this.maxWeight = maxWeight;
    }

    public Double getDeductionValue() {
        return deductionValue;
    }

    public void setDeductionValue(Double deductionValue) {
        this.deductionValue = deductionValue;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof DeductionRule)) return false;
        return id != null && id.equals(((DeductionRule) o).getId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
