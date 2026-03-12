package com.mercotrace.web.rest.vm;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Set;

/**
 * Payload for creating a trader-scoped staff user via {@code POST /api/trader/rbac/users}.
 */
public class TraderRbacUserCreateVM {

    private String login;

    @NotBlank
    @Email
    @Size(max = 254)
    @Pattern(regexp = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", message = "Invalid email format")
    private String email;

    @NotBlank
    @Size(max = 200)
    private String fullName;

    /**
     * Optional mobile number. If present, must be exactly 10 digits (digits only).
     */
    @Pattern(regexp = "^(|\\d{10})$", message = "Mobile must be exactly 10 digits when provided")
    @Size(max = 15)
    private String mobile;

    @NotBlank
    @Size(min = 6, max = 100)
    private String password;

    /**
     * Human-readable role label inside the trader (e.g. CASHIER, WRITER).
     */
    @NotBlank
    @Size(max = 50)
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

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
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

