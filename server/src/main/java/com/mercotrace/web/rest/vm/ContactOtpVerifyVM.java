package com.mercotrace.web.rest.vm;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

/**
 * ViewModel for contact OTP verification:
 * {
 *   "identifier": "9876543210" | "user@example.com",
 *   "otp": "1234"
 * }
 */
public class ContactOtpVerifyVM {

    @NotBlank
    private String identifier;

    @NotBlank
    @Size(min = 4, max = 4)
    @Pattern(regexp = "^\\d{4}$", message = "Invalid OTP format")
    private String otp;

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }

    public String getOtp() {
        return otp;
    }

    public void setOtp(String otp) {
        this.otp = otp;
    }
}

