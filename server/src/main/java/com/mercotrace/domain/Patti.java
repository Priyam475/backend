package com.mercotrace.domain;

import jakarta.persistence.*;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * Sales Patti (settlement document) per seller.
 * Aligned with SettlementPage.tsx PattiData. Business key: pattiId (PT-YYYYMMDD-NNNN).
 */
@Entity
@Table(name = "sales_patti")
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@SuppressWarnings("common-java:DuplicatedBlocks")
public class Patti extends AbstractAuditingEntity<Long> implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @Column(name = "trader_id")
    private Long traderId;

    /** Business key: PT-YYYYMMDD-NNNN */
    @Column(name = "patti_id", nullable = false, unique = true, length = 32)
    private String pattiId;

    @Column(name = "seller_id", length = 128)
    private String sellerId;

    @Column(name = "seller_name", nullable = false, length = 200)
    private String sellerName;

    @Column(name = "gross_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal grossAmount;

    @Column(name = "total_deductions", nullable = false, precision = 19, scale = 2)
    private BigDecimal totalDeductions = BigDecimal.ZERO;

    @Column(name = "net_payable", nullable = false, precision = 19, scale = 2)
    private BigDecimal netPayable;

    @Column(name = "use_average_weight", nullable = false)
    private Boolean useAverageWeight = false;

    @OneToMany(mappedBy = "patti", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("rate DESC")
    private List<PattiRateCluster> rateClusters = new ArrayList<>();

    @OneToMany(mappedBy = "patti", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    private List<PattiDeduction> deductions = new ArrayList<>();

    @OneToMany(mappedBy = "patti", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("versionNumber ASC")
    private List<PattiVersion> versions = new ArrayList<>();

    @Override
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

    public String getPattiId() {
        return pattiId;
    }

    public void setPattiId(String pattiId) {
        this.pattiId = pattiId;
    }

    public String getSellerId() {
        return sellerId;
    }

    public void setSellerId(String sellerId) {
        this.sellerId = sellerId;
    }

    public String getSellerName() {
        return sellerName;
    }

    public void setSellerName(String sellerName) {
        this.sellerName = sellerName;
    }

    public BigDecimal getGrossAmount() {
        return grossAmount;
    }

    public void setGrossAmount(BigDecimal grossAmount) {
        this.grossAmount = grossAmount;
    }

    public BigDecimal getTotalDeductions() {
        return totalDeductions;
    }

    public void setTotalDeductions(BigDecimal totalDeductions) {
        this.totalDeductions = totalDeductions;
    }

    public BigDecimal getNetPayable() {
        return netPayable;
    }

    public void setNetPayable(BigDecimal netPayable) {
        this.netPayable = netPayable;
    }

    public Boolean getUseAverageWeight() {
        return useAverageWeight;
    }

    public void setUseAverageWeight(Boolean useAverageWeight) {
        this.useAverageWeight = useAverageWeight;
    }

    public List<PattiRateCluster> getRateClusters() {
        return rateClusters;
    }

    public void setRateClusters(List<PattiRateCluster> rateClusters) {
        this.rateClusters = rateClusters;
    }

    public List<PattiDeduction> getDeductions() {
        return deductions;
    }

    public void setDeductions(List<PattiDeduction> deductions) {
        this.deductions = deductions;
    }

    public List<PattiVersion> getVersions() {
        return versions;
    }

    public void setVersions(List<PattiVersion> versions) {
        this.versions = versions;
    }
}
