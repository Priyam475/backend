package com.mercotrace.contact.portal.service.dto;

import jakarta.validation.constraints.Size;

/**
 * DTO for profile updates in the Contact Portal.
 */
public class ContactPortalProfileUpdateDTO {

    @Size(max = 150)
    private String name;

    @Size(max = 191)
    private String email;

    private String address;

    private String currentPassword;

    @Size(min = 6, max = 100)
    private String newPassword;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCurrentPassword() {
        return currentPassword;
    }

    public void setCurrentPassword(String currentPassword) {
        this.currentPassword = currentPassword;
    }

    public String getNewPassword() {
        return newPassword;
    }

    public void setNewPassword(String newPassword) {
        this.newPassword = newPassword;
    }
}

