package com.mercotrace.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.io.Serializable;
import java.time.Instant;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * A Commodity.
 * Commodity Settings module – aligned with frontend Commodity model.
 * Audit: created_by, created_date, last_modified_by, last_modified_date.
 */
@Entity
@Table(name = "commodity")
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@SuppressWarnings("common-java:DuplicatedBlocks")
public class Commodity extends AbstractAuditingEntity<Long> implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @Column(name = "trader_id")
    private Long traderId;

    @NotNull
    @Size(max = 150)
    @Column(name = "commodity_name", length = 150, nullable = false)
    private String commodityName;

    @Column(name = "created_at")
    private Instant createdAt;

    // jhipster-needle-entity-add-field - JHipster will add fields here

    public Long getId() {
        return this.id;
    }

    public Commodity id(Long id) {
        this.setId(id);
        return this;
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

    public String getCommodityName() {
        return this.commodityName;
    }

    public Commodity commodityName(String commodityName) {
        this.setCommodityName(commodityName);
        return this;
    }

    public void setCommodityName(String commodityName) {
        this.commodityName = commodityName;
    }

    public Instant getCreatedAt() {
        return this.createdAt;
    }

    public Commodity createdAt(Instant createdAt) {
        this.setCreatedAt(createdAt);
        return this;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    // jhipster-needle-entity-add-getters-setters - JHipster will add getters and setters here

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Commodity)) {
            return false;
        }
        return getId() != null && getId().equals(((Commodity) o).getId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }

    @Override
    public String toString() {
        return "Commodity{" +
            "id=" + getId() +
            ", traderId=" + getTraderId() +
            ", commodityName='" + getCommodityName() + "'" +
            ", createdAt='" + getCreatedAt() + "'" +
            "}";
    }
}
