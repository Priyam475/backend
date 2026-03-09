package com.mercotrace.web.rest.vm;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * View Model for Contact Portal registration and login payloads.
 *
 * For registration:
 * - phone (required)
 * - password (required)
 * - email (optional)
 * - name (optional)
 *
 * For login:
 * - phone can contain either phone or email (identifier)
 * - password (required)
 */
public class ContactRegisterVM {

    @NotBlank
    private String phone;

    @Size(min = 6, max = 100)
    private String password;

    private String email;

    private String name;

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}

