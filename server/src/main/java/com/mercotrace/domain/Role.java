package com.mercotrace.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.io.Serializable;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * A Role.
 */
@Entity
@Table(name = "role")
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@SuppressWarnings("common-java:DuplicatedBlocks")
public class Role extends AbstractAuditingEntity<Long> implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @NotNull
    @Size(max = 100)
    @Column(name = "role_name", length = 100, nullable = false, unique = true)
    private String roleName;

    @Size(max = 255)
    @Column(name = "description", length = 255)
    private String description;

    /**
     * Optional trader scope for this role. When null, the role is considered
     * global/admin-managed. When non-null, the role belongs to a specific
     * trader and is only visible/assignable within that trader context.
     */
    @Column(name = "trader_id")
    private Long traderId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Lob
    @Column(name = "module_permissions")
    private String modulePermissions;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "rel_role__permission",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    @Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
    @JsonIgnoreProperties(value = { "roles" }, allowSetters = true)
    private Set<Permission> permissions = new HashSet<>();

    // jhipster-needle-entity-add-field - JHipster will add fields here

    public Long getId() {
        return this.id;
    }

    public Role id(Long id) {
        this.setId(id);
        return this;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRoleName() {
        return this.roleName;
    }

    public Role roleName(String roleName) {
        this.setRoleName(roleName);
        return this;
    }

    public void setRoleName(String roleName) {
        this.roleName = roleName;
    }

    public String getDescription() {
        return this.description;
    }

    public Role description(String description) {
        this.setDescription(description);
        return this;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getTraderId() {
        return this.traderId;
    }

    public Role traderId(Long traderId) {
        this.setTraderId(traderId);
        return this;
    }

    public void setTraderId(Long traderId) {
        this.traderId = traderId;
    }

    public Instant getCreatedAt() {
        return this.createdAt;
    }

    public Role createdAt(Instant createdAt) {
        this.setCreatedAt(createdAt);
        return this;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getModulePermissions() {
        return this.modulePermissions;
    }

    public Role modulePermissions(String modulePermissions) {
        this.setModulePermissions(modulePermissions);
        return this;
    }

    public void setModulePermissions(String modulePermissions) {
        this.modulePermissions = modulePermissions;
    }

    public Set<Permission> getPermissions() {
        return this.permissions;
    }

    public void setPermissions(Set<Permission> permissions) {
        this.permissions = permissions;
    }

    public Role permissions(Set<Permission> permissions) {
        this.setPermissions(permissions);
        return this;
    }

    public Role addPermission(Permission permission) {
        this.permissions.add(permission);
        return this;
    }

    public Role removePermission(Permission permission) {
        this.permissions.remove(permission);
        return this;
    }

    // jhipster-needle-entity-add-getters-setters - JHipster will add getters and setters here

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Role)) {
            return false;
        }
        return getId() != null && getId().equals(((Role) o).getId());
    }

    @Override
    public int hashCode() {
        // see https://vladmihalcea.com/how-to-implement-equals-and-hashcode-using-the-jpa-entity-identifier/
        return getClass().hashCode();
    }

    // prettier-ignore
    @Override
    public String toString() {
        return "Role{" +
            "id=" + getId() +
            ", roleName='" + getRoleName() + "'" +
            ", description='" + getDescription() + "'" +
            ", createdAt='" + getCreatedAt() + "'" +
            "}";
    }
}
