package com.mercotrace.domain;

import jakarta.persistence.*;
import java.io.Serializable;
import java.math.BigDecimal;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * Deduction line item on a Sales Patti (freight, coolie, weighing, advance, gunnies, manual).
 */
@Entity
@Table(name = "sales_patti_deduction")
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@SuppressWarnings("common-java:DuplicatedBlocks")
public class PattiDeduction implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patti_id", nullable = false)
    private Patti patti;

    @Column(name = "deduction_key", nullable = false, length = 64)
    private String deductionKey;

    @Column(name = "label", nullable = false, length = 200)
    private String label;

    @Column(name = "amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(name = "editable", nullable = false)
    private Boolean editable = true;

    @Column(name = "auto_pulled", nullable = false)
    private Boolean autoPulled = false;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Patti getPatti() {
        return patti;
    }

    public void setPatti(Patti patti) {
        this.patti = patti;
    }

    public String getDeductionKey() {
        return deductionKey;
    }

    public void setDeductionKey(String deductionKey) {
        this.deductionKey = deductionKey;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public Boolean getEditable() {
        return editable;
    }

    public void setEditable(Boolean editable) {
        this.editable = editable;
    }

    public Boolean getAutoPulled() {
        return autoPulled;
    }

    public void setAutoPulled(Boolean autoPulled) {
        this.autoPulled = autoPulled;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }
}
