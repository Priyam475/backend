package com.mercotrace.web.rest.vm;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * ViewModel for Module 1 OTP verification:
 * {
 *   "mobile": "9876543210",
 *   "otp": "1234"
 * }
 */
public class Module1OtpVerifyVM {

    @NotBlank
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid mobile number")
    private String mobile;

    @NotBlank
    @Size(min = 4, max = 4)
    @Pattern(regexp = "^\\d{4}$", message = "Invalid OTP format")
    private String otp;

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public String getOtp() {
        return otp;
    }

    public void setOtp(String otp) {
        this.otp = otp;
    }
}

