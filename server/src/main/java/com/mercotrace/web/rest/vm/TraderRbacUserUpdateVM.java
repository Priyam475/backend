package com.mercotrace.web.rest.vm;

import jakarta.validation.constraints.Email;
import java.util.Set;

/**
 * Payload for updating a trader-scoped staff user via {@code PUT /api/trader/rbac/users/{id}}.
 */
public class TraderRbacUserUpdateVM {

    @Email
    private String email;

    private String fullName;

    /**
     * Optional mobile number. If present, must be exactly 10 digits (digits only).
     */
    @jakarta.validation.constraints.Pattern(regexp = "^(|\\d{10})$", message = "Mobile must be exactly 10 digits when provided")
    @jakarta.validation.constraints.Size(max = 15)
    private String mobile;

    private Boolean activated;

    private String roleInTrader;

    private Set<Long> roleIds;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public Boolean getActivated() {
        return activated;
    }

    public void setActivated(Boolean activated) {
        this.activated = activated;
    }

    public String getRoleInTrader() {
        return roleInTrader;
    }

    public void setRoleInTrader(String roleInTrader) {
        this.roleInTrader = roleInTrader;
    }

    public Set<Long> getRoleIds() {
        return roleIds;
    }

    public void setRoleIds(Set<Long> roleIds) {
        this.roleIds = roleIds;
    }
}

