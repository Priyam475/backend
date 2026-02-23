package com.mercotrace.service.dto;

import jakarta.validation.constraints.*;
import java.io.Serializable;
import java.time.Instant;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

/**
 * A DTO for the {@link com.mercotrace.domain.Permission} entity.
 */
@SuppressWarnings("common-java:DuplicatedBlocks")
public class PermissionDTO implements Serializable {

    private Long id;

    @NotNull
    @Size(max = 150)
    private String permissionName;

    private Instant createdAt;

    private Set<RoleDTO> roles = new HashSet<>();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPermissionName() {
        return permissionName;
    }

    public void setPermissionName(String permissionName) {
        this.permissionName = permissionName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Set<RoleDTO> getRoles() {
        return roles;
    }

    public void setRoles(Set<RoleDTO> roles) {
        this.roles = roles;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof PermissionDTO)) {
            return false;
        }

        PermissionDTO permissionDTO = (PermissionDTO) o;
        if (this.id == null) {
            return false;
        }
        return Objects.equals(this.id, permissionDTO.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(this.id);
    }

    // prettier-ignore
    @Override
    public String toString() {
        return "PermissionDTO{" +
            "id=" + getId() +
            ", permissionName='" + getPermissionName() + "'" +
            ", createdAt='" + getCreatedAt() + "'" +
            ", roles=" + getRoles() +
            "}";
    }
}
