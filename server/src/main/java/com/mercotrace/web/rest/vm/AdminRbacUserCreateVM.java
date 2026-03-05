package com.mercotrace.web.rest.vm;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Payload for creating an admin user via {@code POST /api/admin/rbac/users}.
 *
 * This operates on {@link com.mercotrace.admin.identity.AdminUser} and is
 * completely separate from trader identity and {@link com.mercotrace.domain.User}.
 */
public class AdminRbacUserCreateVM {

    private String login;

    @NotBlank
    @Email
    private String email;

    private String firstName;

    private String lastName;

    /**
     * Optional mobile number. If present, must be exactly 10 digits (digits only).
     */
    @Pattern(regexp = "^(|\\d{10})$", message = "Mobile must be exactly 10 digits when provided")
    @Size(max = 15)
    private String mobile;

    @NotBlank
    @Size(min = 6)
    private String password;

    /**
     * Optional explicit activation flag. Defaults to {@code true} when null.
     */
    private Boolean activated;

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

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
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

    public Boolean getActivated() {
        return activated;
    }

    public void setActivated(Boolean activated) {
        this.activated = activated;
    }
}

