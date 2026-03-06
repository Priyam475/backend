package com.mercotrace.web.rest.vm;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Payload for updating an admin user via {@code PUT /api/admin/rbac/users/{id}}.
 */
public class AdminRbacUserUpdateVM {

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

    private Boolean activated;

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

    public Boolean getActivated() {
        return activated;
    }

    public void setActivated(Boolean activated) {
        this.activated = activated;
    }
}

