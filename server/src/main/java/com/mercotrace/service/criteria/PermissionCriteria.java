package com.mercotrace.service.criteria;

import java.io.Serializable;
import java.util.Objects;
import java.util.Optional;
import org.springdoc.core.annotations.ParameterObject;
import tech.jhipster.service.Criteria;
import tech.jhipster.service.filter.*;

/**
 * Criteria class for the {@link com.mercotrace.domain.Permission} entity. This class is used
 * in {@link com.mercotrace.web.rest.PermissionResource} to receive all the possible filtering options from
 * the Http GET request parameters.
 * For example the following could be a valid request:
 * {@code /permissions?id.greaterThan=5&attr1.contains=something&attr2.specified=false}
 * As Spring is unable to properly convert the types, unless specific {@link Filter} class are used, we need to use
 * fix type specific filters.
 */
@ParameterObject
@SuppressWarnings("common-java:DuplicatedBlocks")
public class PermissionCriteria implements Serializable, Criteria {

    private static final long serialVersionUID = 1L;

    private LongFilter id;

    private StringFilter permissionName;

    private InstantFilter createdAt;

    private LongFilter roleId;

    private Boolean distinct;

    public PermissionCriteria() {}

    public PermissionCriteria(PermissionCriteria other) {
        this.id = other.optionalId().map(LongFilter::copy).orElse(null);
        this.permissionName = other.optionalPermissionName().map(StringFilter::copy).orElse(null);
        this.createdAt = other.optionalCreatedAt().map(InstantFilter::copy).orElse(null);
        this.roleId = other.optionalRoleId().map(LongFilter::copy).orElse(null);
        this.distinct = other.distinct;
    }

    @Override
    public PermissionCriteria copy() {
        return new PermissionCriteria(this);
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

    public StringFilter getPermissionName() {
        return permissionName;
    }

    public Optional<StringFilter> optionalPermissionName() {
        return Optional.ofNullable(permissionName);
    }

    public StringFilter permissionName() {
        if (permissionName == null) {
            setPermissionName(new StringFilter());
        }
        return permissionName;
    }

    public void setPermissionName(StringFilter permissionName) {
        this.permissionName = permissionName;
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

    public LongFilter getRoleId() {
        return roleId;
    }

    public Optional<LongFilter> optionalRoleId() {
        return Optional.ofNullable(roleId);
    }

    public LongFilter roleId() {
        if (roleId == null) {
            setRoleId(new LongFilter());
        }
        return roleId;
    }

    public void setRoleId(LongFilter roleId) {
        this.roleId = roleId;
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
        final PermissionCriteria that = (PermissionCriteria) o;
        return (
            Objects.equals(id, that.id) &&
            Objects.equals(permissionName, that.permissionName) &&
            Objects.equals(createdAt, that.createdAt) &&
            Objects.equals(roleId, that.roleId) &&
            Objects.equals(distinct, that.distinct)
        );
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, permissionName, createdAt, roleId, distinct);
    }

    // prettier-ignore
    @Override
    public String toString() {
        return "PermissionCriteria{" +
            optionalId().map(f -> "id=" + f + ", ").orElse("") +
            optionalPermissionName().map(f -> "permissionName=" + f + ", ").orElse("") +
            optionalCreatedAt().map(f -> "createdAt=" + f + ", ").orElse("") +
            optionalRoleId().map(f -> "roleId=" + f + ", ").orElse("") +
            optionalDistinct().map(f -> "distinct=" + f + ", ").orElse("") +
        "}";
    }
}
