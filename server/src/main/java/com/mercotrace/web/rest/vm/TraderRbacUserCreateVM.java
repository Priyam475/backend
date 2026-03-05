package com.mercotrace.web.rest.vm;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Set;

/**
 * Payload for creating a trader-scoped staff user via {@code POST /api/trader/rbac/users}.
 */
public class TraderRbacUserCreateVM {

    private String login;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String fullName;

    @NotBlank
    @Size(min = 6)
    private String password;

    /**
     * Human-readable role label inside the trader (e.g. CASHIER, WRITER).
     */
    @NotBlank
    private String roleInTrader;

    /**
     * Optional explicit activation flag. Defaults to true when null.
     */
    private Boolean activated;

    /**
     * Trader-scoped role ids to assign to this staff user.
     */
    private Set<Long> roleIds;

    public String getLogin() {
        return login;
    }

    public void setLogin(String login) {
        this.login = login;
    }

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

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRoleInTrader() {
        return roleInTrader;
    }

    public void setRoleInTrader(String roleInTrader) {
        this.roleInTrader = roleInTrader;
    }

    public Boolean getActivated() {
        return activated;
    }

    public void setActivated(Boolean activated) {
        this.activated = activated;
    }

    public Set<Long> getRoleIds() {
        return roleIds;
    }

    public void setRoleIds(Set<Long> roleIds) {
        this.roleIds = roleIds;
    }
}

