package com.mercotrace.service.dto;

import com.mercotrace.domain.enumeration.ApprovalStatus;
import com.mercotrace.domain.enumeration.BusinessMode;
import jakarta.persistence.Lob;
import jakarta.validation.constraints.*;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

/**
 * A DTO for the {@link com.mercotrace.domain.Trader} entity.
 */
@SuppressWarnings("common-java:DuplicatedBlocks")
public class TraderDTO implements Serializable {

    private Long id;

    @NotNull
    @Size(max = 150)
    private String businessName;

    @NotNull
    @Size(max = 150)
    private String ownerName;

    @Lob
    private String address;

    @Size(max = 100)
    private String category;

    private ApprovalStatus approvalStatus;

    private BusinessMode businessMode;

    @Size(max = 20)
    private String billPrefix;

    private Instant createdAt;

    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getBusinessName() {
        return businessName;
    }

    public void setBusinessName(String businessName) {
        this.businessName = businessName;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public ApprovalStatus getApprovalStatus() {
        return approvalStatus;
    }

    public void setApprovalStatus(ApprovalStatus approvalStatus) {
        this.approvalStatus = approvalStatus;
    }

    public BusinessMode getBusinessMode() {
        return businessMode;
    }

    public void setBusinessMode(BusinessMode businessMode) {
        this.businessMode = businessMode;
    }

    public String getBillPrefix() {
        return billPrefix;
    }

    public void setBillPrefix(String billPrefix) {
        this.billPrefix = billPrefix;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof TraderDTO)) {
            return false;
        }

        TraderDTO traderDTO = (TraderDTO) o;
        if (this.id == null) {
            return false;
        }
        return Objects.equals(this.id, traderDTO.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(this.id);
    }

    // prettier-ignore
    @Override
    public String toString() {
        return "TraderDTO{" +
            "id=" + getId() +
            ", businessName='" + getBusinessName() + "'" +
            ", ownerName='" + getOwnerName() + "'" +
            ", address='" + getAddress() + "'" +
            ", category='" + getCategory() + "'" +
            ", approvalStatus='" + getApprovalStatus() + "'" +
            ", businessMode='" + getBusinessMode() + "'" +
            ", billPrefix='" + getBillPrefix() + "'" +
            ", createdAt='" + getCreatedAt() + "'" +
            ", updatedAt='" + getUpdatedAt() + "'" +
            "}";
    }
}
