package com.mercotrace.web.rest.vm;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * ViewModel for Module 1 OTP request:
 * {
 *   "mobile": "9876543210"
 * }
 */
public class Module1OtpRequestVM {

    @NotBlank
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid mobile number")
    private String mobile;

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }
}

