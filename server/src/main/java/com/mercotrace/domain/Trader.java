package com.mercotrace.domain;

import com.mercotrace.domain.enumeration.ApprovalStatus;
import com.mercotrace.domain.enumeration.BusinessMode;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.io.Serializable;
import java.time.Instant;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * A Trader.
 */
@Entity
@Table(name = "trader")
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@SuppressWarnings("common-java:DuplicatedBlocks")
public class Trader implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @NotNull
    @Size(max = 150)
    @Column(name = "business_name", length = 150, nullable = false)
    private String businessName;

    @NotNull
    @Size(max = 150)
    @Column(name = "owner_name", length = 150, nullable = false)
    private String ownerName;

    @Lob
    @Column(name = "address")
    private String address;

    @Size(max = 100)
    @Column(name = "category", length = 100)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status")
    private ApprovalStatus approvalStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "business_mode")
    private BusinessMode businessMode;

    @Size(max = 20)
    @Column(name = "bill_prefix", length = 20)
    private String billPrefix;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    // jhipster-needle-entity-add-field - JHipster will add fields here

    public Long getId() {
        return this.id;
    }

    public Trader id(Long id) {
        this.setId(id);
        return this;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getBusinessName() {
        return this.businessName;
    }

    public Trader businessName(String businessName) {
        this.setBusinessName(businessName);
        return this;
    }

    public void setBusinessName(String businessName) {
        this.businessName = businessName;
    }

    public String getOwnerName() {
        return this.ownerName;
    }

    public Trader ownerName(String ownerName) {
        this.setOwnerName(ownerName);
        return this;
    }

    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
    }

    public String getAddress() {
        return this.address;
    }

    public Trader address(String address) {
        this.setAddress(address);
        return this;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCategory() {
        return this.category;
    }

    public Trader category(String category) {
        this.setCategory(category);
        return this;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public ApprovalStatus getApprovalStatus() {
        return this.approvalStatus;
    }

    public Trader approvalStatus(ApprovalStatus approvalStatus) {
        this.setApprovalStatus(approvalStatus);
        return this;
    }

    public void setApprovalStatus(ApprovalStatus approvalStatus) {
        this.approvalStatus = approvalStatus;
    }

    public BusinessMode getBusinessMode() {
        return this.businessMode;
    }

    public Trader businessMode(BusinessMode businessMode) {
        this.setBusinessMode(businessMode);
        return this;
    }

    public void setBusinessMode(BusinessMode businessMode) {
        this.businessMode = businessMode;
    }

    public String getBillPrefix() {
        return this.billPrefix;
    }

    public Trader billPrefix(String billPrefix) {
        this.setBillPrefix(billPrefix);
        return this;
    }

    public void setBillPrefix(String billPrefix) {
        this.billPrefix = billPrefix;
    }

    public Instant getCreatedAt() {
        return this.createdAt;
    }

    public Trader createdAt(Instant createdAt) {
        this.setCreatedAt(createdAt);
        return this;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return this.updatedAt;
    }

    public Trader updatedAt(Instant updatedAt) {
        this.setUpdatedAt(updatedAt);
        return this;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    // jhipster-needle-entity-add-getters-setters - JHipster will add getters and setters here

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Trader)) {
            return false;
        }
        return getId() != null && getId().equals(((Trader) o).getId());
    }

    @Override
    public int hashCode() {
        // see https://vladmihalcea.com/how-to-implement-equals-and-hashcode-using-the-jpa-entity-identifier/
        return getClass().hashCode();
    }

    // prettier-ignore
    @Override
    public String toString() {
        return "Trader{" +
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
