package com.mercotrace.web.rest.vm;

import jakarta.validation.constraints.NotBlank;

/**
 * ViewModel for contact OTP request:
 * {
 *   "identifier": "9876543210" | "user@example.com"
 * }
 *
 * Identifier can be either a phone number or an email address.
 */
public class ContactOtpRequestVM {

    @NotBlank
    private String identifier;

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }
}

