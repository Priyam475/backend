package com.mercotrace.service.dto;

import com.mercotrace.admin.rbac.AdminRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.io.Serializable;
import java.util.Set;

/**
 * Minimal DTO for {@link AdminRole}.
 */
public class AdminRoleDTO implements Serializable {

    private Long id;

    @NotBlank
    @Size(max = 100)
    private String name;

    @Size(max = 255)
    private String description;

    /**
     * Effective admin authority names granted by this role.
     *
     * These are derived from server-side RBAC mapping to {@link com.mercotrace.admin.identity.AdminAuthority}
     * and surfaced so the admin UI can understand which modules/features a role enables.
     */
    private Set<String> authorities;

    public AdminRoleDTO() {}

    public AdminRoleDTO(AdminRole role, Set<String> authorities) {
        this.id = role.getId();
        this.name = role.getName();
        this.description = role.getDescription();
        this.authorities = authorities;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Set<String> getAuthorities() {
        return authorities;
    }

    public void setAuthorities(Set<String> authorities) {
        this.authorities = authorities;
    }
}

