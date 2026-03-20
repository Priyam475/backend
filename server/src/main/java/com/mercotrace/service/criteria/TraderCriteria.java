package com.mercotrace.service.criteria;

import com.mercotrace.domain.enumeration.ApprovalStatus;
import com.mercotrace.domain.enumeration.BusinessMode;
import java.io.Serializable;
import java.util.Objects;
import java.util.Optional;
import org.springdoc.core.annotations.ParameterObject;
import tech.jhipster.service.Criteria;
import tech.jhipster.service.filter.*;

/**
 * Criteria class for the {@link com.mercotrace.domain.Trader} entity. This class is used
 * in {@link com.mercotrace.web.rest.TraderResource} to receive all the possible filtering options from
 * the Http GET request parameters.
 * For example the following could be a valid request:
 * {@code /traders?id.greaterThan=5&attr1.contains=something&attr2.specified=false}
 * As Spring is unable to properly convert the types, unless specific {@link Filter} class are used, we need to use
 * fix type specific filters.
 */
@ParameterObject
@SuppressWarnings("common-java:DuplicatedBlocks")
public class TraderCriteria implements Serializable, Criteria {

    /**
     * Class for filtering ApprovalStatus
     */
    public static class ApprovalStatusFilter extends Filter<ApprovalStatus> {

        public ApprovalStatusFilter() {}

        public ApprovalStatusFilter(ApprovalStatusFilter filter) {
            super(filter);
        }

        @Override
        public ApprovalStatusFilter copy() {
            return new ApprovalStatusFilter(this);
        }
    }

    /**
     * Class for filtering BusinessMode
     */
    public static class BusinessModeFilter extends Filter<BusinessMode> {

        public BusinessModeFilter() {}

        public BusinessModeFilter(BusinessModeFilter filter) {
            super(filter);
        }

        @Override
        public BusinessModeFilter copy() {
            return new BusinessModeFilter(this);
        }
    }

    private static final long serialVersionUID = 1L;

    private LongFilter id;

    private StringFilter businessName;

    private StringFilter ownerName;

    private StringFilter category;

    private ApprovalStatusFilter approvalStatus;

    private BusinessModeFilter businessMode;

    private StringFilter billPrefix;

    private InstantFilter createdAt;

    private InstantFilter updatedAt;

    private Boolean distinct;

    private BooleanFilter active;

    public TraderCriteria() {}

    public TraderCriteria(TraderCriteria other) {
        this.id = other.optionalId().map(LongFilter::copy).orElse(null);
        this.businessName = other.optionalBusinessName().map(StringFilter::copy).orElse(null);
        this.ownerName = other.optionalOwnerName().map(StringFilter::copy).orElse(null);
        this.category = other.optionalCategory().map(StringFilter::copy).orElse(null);
        this.approvalStatus = other.optionalApprovalStatus().map(ApprovalStatusFilter::copy).orElse(null);
        this.businessMode = other.optionalBusinessMode().map(BusinessModeFilter::copy).orElse(null);
        this.billPrefix = other.optionalBillPrefix().map(StringFilter::copy).orElse(null);
        this.createdAt = other.optionalCreatedAt().map(InstantFilter::copy).orElse(null);
        this.updatedAt = other.optionalUpdatedAt().map(InstantFilter::copy).orElse(null);
        this.distinct = other.distinct;
        this.active = other.optionalActive().map(BooleanFilter::copy).orElse(null);
    }

    @Override
    public TraderCriteria copy() {
        return new TraderCriteria(this);
    }

    public LongFilter getId() {
        return id;
    }

    public Optional<LongFilter> optionalId() {
        return Optional.ofNullable(id);
    }

    public LongFilter id() {
        if (id == null) {
            setId(new LongFilter());
        }
        return id;
    }

    public void setId(LongFilter id) {
        this.id = id;
    }

    public StringFilter getBusinessName() {
        return businessName;
    }

    public Optional<StringFilter> optionalBusinessName() {
        return Optional.ofNullable(businessName);
    }

    public StringFilter businessName() {
        if (businessName == null) {
            setBusinessName(new StringFilter());
        }
        return businessName;
    }

    public void setBusinessName(StringFilter businessName) {
        this.businessName = businessName;
    }

    public StringFilter getOwnerName() {
        return ownerName;
    }

    public Optional<StringFilter> optionalOwnerName() {
        return Optional.ofNullable(ownerName);
    }

    public StringFilter ownerName() {
        if (ownerName == null) {
            setOwnerName(new StringFilter());
        }
        return ownerName;
    }

    public void setOwnerName(StringFilter ownerName) {
        this.ownerName = ownerName;
    }

    public StringFilter getCategory() {
        return category;
    }

    public Optional<StringFilter> optionalCategory() {
        return Optional.ofNullable(category);
    }

    public StringFilter category() {
        if (category == null) {
            setCategory(new StringFilter());
        }
        return category;
    }

    public void setCategory(StringFilter category) {
        this.category = category;
    }

    public ApprovalStatusFilter getApprovalStatus() {
        return approvalStatus;
    }

    public Optional<ApprovalStatusFilter> optionalApprovalStatus() {
        return Optional.ofNullable(approvalStatus);
    }

    public ApprovalStatusFilter approvalStatus() {
        if (approvalStatus == null) {
            setApprovalStatus(new ApprovalStatusFilter());
        }
        return approvalStatus;
    }

    public void setApprovalStatus(ApprovalStatusFilter approvalStatus) {
        this.approvalStatus = approvalStatus;
    }

    public BusinessModeFilter getBusinessMode() {
        return businessMode;
    }

    public Optional<BusinessModeFilter> optionalBusinessMode() {
        return Optional.ofNullable(businessMode);
    }

    public BusinessModeFilter businessMode() {
        if (businessMode == null) {
            setBusinessMode(new BusinessModeFilter());
        }
        return businessMode;
    }

    public void setBusinessMode(BusinessModeFilter businessMode) {
        this.businessMode = businessMode;
    }

    public StringFilter getBillPrefix() {
        return billPrefix;
    }

    public Optional<StringFilter> optionalBillPrefix() {
        return Optional.ofNullable(billPrefix);
    }

    public StringFilter billPrefix() {
        if (billPrefix == null) {
            setBillPrefix(new StringFilter());
        }
        return billPrefix;
    }

    public void setBillPrefix(StringFilter billPrefix) {
        this.billPrefix = billPrefix;
    }

    public InstantFilter getCreatedAt() {
        return createdAt;
    }

    public Optional<InstantFilter> optionalCreatedAt() {
        return Optional.ofNullable(createdAt);
    }

    public InstantFilter createdAt() {
        if (createdAt == null) {
            setCreatedAt(new InstantFilter());
        }
        return createdAt;
    }

    public void setCreatedAt(InstantFilter createdAt) {
        this.createdAt = createdAt;
    }

    public InstantFilter getUpdatedAt() {
        return updatedAt;
    }

    public Optional<InstantFilter> optionalUpdatedAt() {
        return Optional.ofNullable(updatedAt);
    }

    public InstantFilter updatedAt() {
        if (updatedAt == null) {
            setUpdatedAt(new InstantFilter());
        }
        return updatedAt;
    }

    public void setUpdatedAt(InstantFilter updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Boolean getDistinct() {
        return distinct;
    }

    public Optional<Boolean> optionalDistinct() {
        return Optional.ofNullable(distinct);
    }

    public Boolean distinct() {
        if (distinct == null) {
            setDistinct(true);
        }
        return distinct;
    }

    public void setDistinct(Boolean distinct) {
        this.distinct = distinct;
    }

    public BooleanFilter getActive() {
        return active;
    }

    public Optional<BooleanFilter> optionalActive() {
        return Optional.ofNullable(active);
    }

    public BooleanFilter active() {
        if (active == null) {
            setActive(new BooleanFilter());
        }
        return active;
    }

    public void setActive(BooleanFilter active) {
        this.active = active;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        final TraderCriteria that = (TraderCriteria) o;
        return (
            Objects.equals(id, that.id) &&
            Objects.equals(businessName, that.businessName) &&
            Objects.equals(ownerName, that.ownerName) &&
            Objects.equals(category, that.category) &&
            Objects.equals(approvalStatus, that.approvalStatus) &&
            Objects.equals(businessMode, that.businessMode) &&
            Objects.equals(billPrefix, that.billPrefix) &&
            Objects.equals(createdAt, that.createdAt) &&
            Objects.equals(updatedAt, that.updatedAt) &&
            Objects.equals(distinct, that.distinct) &&
            Objects.equals(active, that.active)
        );
    }

    @Override
    public int hashCode() {
        return Objects.hash(
            id,
            businessName,
            ownerName,
            category,
            approvalStatus,
            businessMode,
            billPrefix,
            createdAt,
            updatedAt,
            distinct,
            active
        );
    }

    // prettier-ignore
    @Override
    public String toString() {
        return "TraderCriteria{" +
            optionalId().map(f -> "id=" + f + ", ").orElse("") +
            optionalBusinessName().map(f -> "businessName=" + f + ", ").orElse("") +
            optionalOwnerName().map(f -> "ownerName=" + f + ", ").orElse("") +
            optionalCategory().map(f -> "category=" + f + ", ").orElse("") +
            optionalApprovalStatus().map(f -> "approvalStatus=" + f + ", ").orElse("") +
            optionalBusinessMode().map(f -> "businessMode=" + f + ", ").orElse("") +
            optionalBillPrefix().map(f -> "billPrefix=" + f + ", ").orElse("") +
            optionalCreatedAt().map(f -> "createdAt=" + f + ", ").orElse("") +
            optionalUpdatedAt().map(f -> "updatedAt=" + f + ", ").orElse("") +
            optionalDistinct().map(f -> "distinct=" + f + ", ").orElse("") +
            optionalActive().map(f -> "active=" + f + ", ").orElse("") +
        "}";
    }
}
