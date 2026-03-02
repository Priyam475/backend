package com.mercotrace.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.io.Serializable;
import java.time.Instant;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * Version snapshot for sales bill audit trail. Aligned with BillingPage versions[].
 */
@Entity
@Table(name = "sales_bill_version")
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@SuppressWarnings("common-java:DuplicatedBlocks")
public class SalesBillVersion implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_bill_id", nullable = false)
    private SalesBill salesBill;

    @NotNull
    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @NotNull
    @Column(name = "saved_at", nullable = false)
    private Instant savedAt;

    @Column(name = "snapshot_json", columnDefinition = "text")
    private String snapshotJson;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public SalesBill getSalesBill() { return salesBill; }
    public void setSalesBill(SalesBill salesBill) { this.salesBill = salesBill; }
    public Integer getVersionNumber() { return versionNumber; }
    public void setVersionNumber(Integer versionNumber) { this.versionNumber = versionNumber; }
    public Instant getSavedAt() { return savedAt; }
    public void setSavedAt(Instant savedAt) { this.savedAt = savedAt; }
    public String getSnapshotJson() { return snapshotJson; }
    public void setSnapshotJson(String snapshotJson) { this.snapshotJson = snapshotJson; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SalesBillVersion)) return false;
        SalesBillVersion that = (SalesBillVersion) o;
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() { return getClass().hashCode(); }
}
