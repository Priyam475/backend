package com.mercotrace.domain;

import com.mercotrace.domain.enumeration.VoucherLifecycleStatus;
import com.mercotrace.domain.enumeration.VoucherType;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * Accounting voucher header (double-entry). Distinct from domain.Voucher (reference-type vouchers).
 * Aligned with frontend VoucherHeader in client/src/types/accounting.ts.
 * Audit: createdBy, createdDate, lastModifiedBy, lastModifiedDate via AbstractAuditingEntity.
 */
@Entity
@Table(name = "voucher_header")
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@SuppressWarnings("common-java:DuplicatedBlocks")
public class VoucherHeader extends AbstractAuditingEntity<Long> implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @NotNull
    @Column(name = "trader_id", nullable = false)
    private Long traderId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "voucher_type", length = 30, nullable = false)
    private VoucherType voucherType;

    @NotNull
    @Size(max = 50)
    @Column(name = "voucher_number", length = 50, nullable = false)
    private String voucherNumber;

    @NotNull
    @Column(name = "voucher_date", nullable = false)
    private LocalDate voucherDate;

    @NotNull
    @Size(max = 500)
    @Column(name = "narration", length = 500, nullable = false)
    private String narration;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30, nullable = false)
    private VoucherLifecycleStatus status = VoucherLifecycleStatus.DRAFT;

    @NotNull
    @Column(name = "total_debit", precision = 19, scale = 2, nullable = false)
    private BigDecimal totalDebit = BigDecimal.ZERO;

    @NotNull
    @Column(name = "total_credit", precision = 19, scale = 2, nullable = false)
    private BigDecimal totalCredit = BigDecimal.ZERO;

    @NotNull
    @Column(name = "is_migrated", nullable = false)
    private Boolean isMigrated = false;

    @Column(name = "posted_at")
    private Instant postedAt;

    @Column(name = "reversed_at")
    private Instant reversedAt;

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

    public VoucherType getVoucherType() {
        return voucherType;
    }

    public void setVoucherType(VoucherType voucherType) {
        this.voucherType = voucherType;
    }

    public String getVoucherNumber() {
        return voucherNumber;
    }

    public void setVoucherNumber(String voucherNumber) {
        this.voucherNumber = voucherNumber;
    }

    public LocalDate getVoucherDate() {
        return voucherDate;
    }

    public void setVoucherDate(LocalDate voucherDate) {
        this.voucherDate = voucherDate;
    }

    public String getNarration() {
        return narration;
    }

    public void setNarration(String narration) {
        this.narration = narration;
    }

    public VoucherLifecycleStatus getStatus() {
        return status;
    }

    public void setStatus(VoucherLifecycleStatus status) {
        this.status = status;
    }

    public BigDecimal getTotalDebit() {
        return totalDebit;
    }

    public void setTotalDebit(BigDecimal totalDebit) {
        this.totalDebit = totalDebit != null ? totalDebit : BigDecimal.ZERO;
    }

    public BigDecimal getTotalCredit() {
        return totalCredit;
    }

    public void setTotalCredit(BigDecimal totalCredit) {
        this.totalCredit = totalCredit != null ? totalCredit : BigDecimal.ZERO;
    }

    public Boolean getIsMigrated() {
        return isMigrated;
    }

    public void setIsMigrated(Boolean isMigrated) {
        this.isMigrated = isMigrated != null && isMigrated;
    }

    public Instant getPostedAt() {
        return postedAt;
    }

    public void setPostedAt(Instant postedAt) {
        this.postedAt = postedAt;
    }

    public Instant getReversedAt() {
        return reversedAt;
    }

    public void setReversedAt(Instant reversedAt) {
        this.reversedAt = reversedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof VoucherHeader)) return false;
        return id != null && id.equals(((VoucherHeader) o).getId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }

    @Override
    public String toString() {
        return "VoucherHeader{id=" + id + ", voucherNumber='" + voucherNumber + "', status=" + status + "}";
    }
}
