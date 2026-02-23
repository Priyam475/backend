package com.mercotrace.service.criteria;

import java.io.Serializable;
import java.util.Objects;
import java.util.Optional;
import org.springdoc.core.annotations.ParameterObject;
import tech.jhipster.service.Criteria;
import tech.jhipster.service.filter.*;

/**
 * Criteria class for the {@link com.mercotrace.domain.Role} entity. This class is used
 * in {@link com.mercotrace.web.rest.RoleResource} to receive all the possible filtering options from
 * the Http GET request parameters.
 * For example the following could be a valid request:
 * {@code /roles?id.greaterThan=5&attr1.contains=something&attr2.specified=false}
 * As Spring is unable to properly convert the types, unless specific {@link Filter} class are used, we need to use
 * fix type specific filters.
 */
@ParameterObject
@SuppressWarnings("common-java:DuplicatedBlocks")
public class RoleCriteria implements Serializable, Criteria {

    private static final long serialVersionUID = 1L;

    private LongFilter id;

    private StringFilter roleName;

    private InstantFilter createdAt;

    private LongFilter permissionId;

    private Boolean distinct;

    public RoleCriteria() {}

    public RoleCriteria(RoleCriteria other) {
        this.id = other.optionalId().map(LongFilter::copy).orElse(null);
        this.roleName = other.optionalRoleName().map(StringFilter::copy).orElse(null);
        this.createdAt = other.optionalCreatedAt().map(InstantFilter::copy).orElse(null);
        this.permissionId = other.optionalPermissionId().map(LongFilter::copy).orElse(null);
        this.distinct = other.distinct;
    }

    @Override
    public RoleCriteria copy() {
        return new RoleCriteria(this);
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

    public StringFilter getRoleName() {
        return roleName;
    }

    public Optional<StringFilter> optionalRoleName() {
        return Optional.ofNullable(roleName);
    }

    public StringFilter roleName() {
        if (roleName == null) {
            setRoleName(new StringFilter());
        }
        return roleName;
    }

    public void setRoleName(StringFilter roleName) {
        this.roleName = roleName;
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

    public LongFilter getPermissionId() {
        return permissionId;
    }

    public Optional<LongFilter> optionalPermissionId() {
        return Optional.ofNullable(permissionId);
    }

    public LongFilter permissionId() {
        if (permissionId == null) {
            setPermissionId(new LongFilter());
        }
        return permissionId;
    }

    public void setPermissionId(LongFilter permissionId) {
        this.permissionId = permissionId;
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

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        final RoleCriteria that = (RoleCriteria) o;
        return (
            Objects.equals(id, that.id) &&
            Objects.equals(roleName, that.roleName) &&
            Objects.equals(createdAt, that.createdAt) &&
            Objects.equals(permissionId, that.permissionId) &&
            Objects.equals(distinct, that.distinct)
        );
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, roleName, createdAt, permissionId, distinct);
    }

    // prettier-ignore
    @Override
    public String toString() {
        return "RoleCriteria{" +
            optionalId().map(f -> "id=" + f + ", ").orElse("") +
            optionalRoleName().map(f -> "roleName=" + f + ", ").orElse("") +
            optionalCreatedAt().map(f -> "createdAt=" + f + ", ").orElse("") +
            optionalPermissionId().map(f -> "permissionId=" + f + ", ").orElse("") +
            optionalDistinct().map(f -> "distinct=" + f + ", ").orElse("") +
        "}";
    }
}
