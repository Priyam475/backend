package com.mercotrace.service.otp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class MockOtpSender implements OtpSender {

    private static final Logger log = LoggerFactory.getLogger(MockOtpSender.class);

    @Override
    public void sendOtp(String mobile, String code) {
        log.info("Mock OTP sender - mobile: {}, code: {}", mobile, code);
    }
}

