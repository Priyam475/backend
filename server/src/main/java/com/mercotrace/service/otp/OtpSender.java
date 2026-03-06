package com.mercotrace.service.otp;

public interface OtpSender {
    void sendOtp(String mobile, String code);
}

