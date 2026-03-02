package com.mercotrace.service.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.mercotrace.domain.enumeration.VoucherLifecycleStatus;
import com.mercotrace.domain.enumeration.VoucherType;
import jakarta.validation.constraints.NotNull;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class VoucherHeaderDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String voucherId;
    private String traderId;
    @NotNull
    private VoucherType voucherType;
    private String voucherNumber;
    private LocalDate voucherDate;
    @NotNull
    private String narration;
    private VoucherLifecycleStatus status;
    private BigDecimal totalDebit;
    private BigDecimal totalCredit;
    private Boolean isMigrated;
    private Instant createdAt;
    private String createdBy;
    private Instant postedAt;
    private Instant reversedAt;
    private List<VoucherLineDTO> lines = new ArrayList<>();

    public String getVoucherId() { return voucherId; }
    public void setVoucherId(String voucherId) { this.voucherId = voucherId; }
    public String getTraderId() { return traderId; }
    public void setTraderId(String traderId) { this.traderId = traderId; }
    public VoucherType getVoucherType() { return voucherType; }
    public void setVoucherType(VoucherType voucherType) { this.voucherType = voucherType; }
    public String getVoucherNumber() { return voucherNumber; }
    public void setVoucherNumber(String voucherNumber) { this.voucherNumber = voucherNumber; }
    public LocalDate getVoucherDate() { return voucherDate; }
    public void setVoucherDate(LocalDate voucherDate) { this.voucherDate = voucherDate; }
    public String getNarration() { return narration; }
    public void setNarration(String narration) { this.narration = narration; }
    public VoucherLifecycleStatus getStatus() { return status; }
    public void setStatus(VoucherLifecycleStatus status) { this.status = status; }
    public BigDecimal getTotalDebit() { return totalDebit; }
    public void setTotalDebit(BigDecimal totalDebit) { this.totalDebit = totalDebit; }
    public BigDecimal getTotalCredit() { return totalCredit; }
    public void setTotalCredit(BigDecimal totalCredit) { this.totalCredit = totalCredit; }
    public Boolean getIsMigrated() { return isMigrated; }
    public void setIsMigrated(Boolean isMigrated) { this.isMigrated = isMigrated; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public Instant getPostedAt() { return postedAt; }
    public void setPostedAt(Instant postedAt) { this.postedAt = postedAt; }
    public Instant getReversedAt() { return reversedAt; }
    public void setReversedAt(Instant reversedAt) { this.reversedAt = reversedAt; }
    public List<VoucherLineDTO> getLines() { return lines; }
    public void setLines(List<VoucherLineDTO> lines) { this.lines = lines != null ? lines : new ArrayList<>(); }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof VoucherHeaderDTO)) return false;
        VoucherHeaderDTO that = (VoucherHeaderDTO) o;
        return Objects.equals(voucherId, that.voucherId);
    }

    @Override
    public int hashCode() { return Objects.hash(voucherId); }
}
