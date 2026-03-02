package com.mercotrace.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * Commodity group within a sales bill. Aligned with BillingPage CommodityGroup.
 */
@Entity
@Table(name = "sales_bill_commodity_group")
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@SuppressWarnings("common-java:DuplicatedBlocks")
public class SalesBillCommodityGroup implements Serializable {

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
    @Column(name = "commodity_name", nullable = false, length = 150)
    private String commodityName;

    @Column(name = "hsn_code", length = 20)
    private String hsnCode;

    @NotNull
    @Column(name = "commission_percent", precision = 8, scale = 2, nullable = false)
    private BigDecimal commissionPercent = BigDecimal.ZERO;

    @NotNull
    @Column(name = "user_fee_percent", precision = 8, scale = 2, nullable = false)
    private BigDecimal userFeePercent = BigDecimal.ZERO;

    @NotNull
    @Column(name = "subtotal", precision = 15, scale = 2, nullable = false)
    private BigDecimal subtotal;

    @NotNull
    @Column(name = "commission_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal commissionAmount = BigDecimal.ZERO;

    @NotNull
    @Column(name = "user_fee_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal userFeeAmount = BigDecimal.ZERO;

    @NotNull
    @Column(name = "total_charges", precision = 15, scale = 2, nullable = false)
    private BigDecimal totalCharges = BigDecimal.ZERO;

    @NotNull
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @OneToMany(mappedBy = "commodityGroup", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sortOrder")
    private List<SalesBillLineItem> items = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public SalesBill getSalesBill() { return salesBill; }
    public void setSalesBill(SalesBill salesBill) { this.salesBill = salesBill; }
    public String getCommodityName() { return commodityName; }
    public void setCommodityName(String commodityName) { this.commodityName = commodityName; }
    public String getHsnCode() { return hsnCode; }
    public void setHsnCode(String hsnCode) { this.hsnCode = hsnCode; }
    public BigDecimal getCommissionPercent() { return commissionPercent; }
    public void setCommissionPercent(BigDecimal commissionPercent) { this.commissionPercent = commissionPercent; }
    public BigDecimal getUserFeePercent() { return userFeePercent; }
    public void setUserFeePercent(BigDecimal userFeePercent) { this.userFeePercent = userFeePercent; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getCommissionAmount() { return commissionAmount; }
    public void setCommissionAmount(BigDecimal commissionAmount) { this.commissionAmount = commissionAmount; }
    public BigDecimal getUserFeeAmount() { return userFeeAmount; }
    public void setUserFeeAmount(BigDecimal userFeeAmount) { this.userFeeAmount = userFeeAmount; }
    public BigDecimal getTotalCharges() { return totalCharges; }
    public void setTotalCharges(BigDecimal totalCharges) { this.totalCharges = totalCharges; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public List<SalesBillLineItem> getItems() { return items; }
    public void setItems(List<SalesBillLineItem> items) { this.items = items; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SalesBillCommodityGroup)) return false;
        SalesBillCommodityGroup that = (SalesBillCommodityGroup) o;
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() { return getClass().hashCode(); }
}
