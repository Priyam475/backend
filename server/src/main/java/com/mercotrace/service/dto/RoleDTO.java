package com.mercotrace.service.dto;

import jakarta.validation.constraints.*;
import java.io.Serializable;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * A DTO for the {@link com.mercotrace.domain.Role} entity.
 */
@SuppressWarnings("common-java:DuplicatedBlocks")
public class RoleDTO implements Serializable {

    private Long id;

    @NotNull
    @Size(max = 100)
    private String roleName;

    private Instant createdAt;

    private Set<PermissionDTO> permissions = new HashSet<>();

    /**
     * Optional human-readable description used by the Settings UI.
     */
    @Size(max = 255)
    private String description;

    /**
     * Module/feature-level permissions as used by the frontend Settings module.
     *
     * Shape:
     * {
     *   "ModuleName": {
     *     "enabled": true,
     *     "features": { "View": true, "Edit": false, ... }
     *   },
     *   ...
     * }
     */
    private Map<String, ModulePermissionEntry> modulePermissions = new HashMap<>();

    /**
     * When non-null, this role is scoped to a specific trader. When null, the role is global/admin.
     */
    private Long traderId;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRoleName() {
        return roleName;
    }

    public void setRoleName(String roleName) {
        this.roleName = roleName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Set<PermissionDTO> getPermissions() {
        return permissions;
    }

    public void setPermissions(Set<PermissionDTO> permissions) {
        this.permissions = permissions;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Map<String, ModulePermissionEntry> getModulePermissions() {
        return modulePermissions;
    }

    public void setModulePermissions(Map<String, ModulePermissionEntry> modulePermissions) {
        this.modulePermissions = modulePermissions;
    }

    public Long getTraderId() {
        return traderId;
    }

    public void setTraderId(Long traderId) {
        this.traderId = traderId;
    }

    public static class ModulePermissionEntry implements Serializable {

        private Boolean enabled;

        private Map<String, Boolean> features = new HashMap<>();

        public Boolean getEnabled() {
            return enabled;
        }

        public void setEnabled(Boolean enabled) {
            this.enabled = enabled;
        }

        public Map<String, Boolean> getFeatures() {
            return features;
        }

        public void setFeatures(Map<String, Boolean> features) {
            this.features = features;
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof RoleDTO)) {
            return false;
        }

        RoleDTO roleDTO = (RoleDTO) o;
        if (this.id == null) {
            return false;
        }
        return Objects.equals(this.id, roleDTO.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(this.id);
    }

    // prettier-ignore
    @Override
    public String toString() {
        return "RoleDTO{" +
            "id=" + getId() +
            ", roleName='" + getRoleName() + "'" +
            ", createdAt='" + getCreatedAt() + "'" +
            ", description='" + getDescription() + "'" +
            ", permissions=" + getPermissions() +
            ", modulePermissions=" + getModulePermissions() +
            "}";
    }
}
