package com.mercotrace.service.otp;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class TwilioOtpSender implements OtpSender {

    private static final Logger log = LoggerFactory.getLogger(TwilioOtpSender.class);

    private final String accountSid;
    private final String authToken;
    private final String fromNumber;

    public TwilioOtpSender(String accountSid, String authToken, String fromNumber) {
        this.accountSid = accountSid;
        this.authToken = authToken;
        this.fromNumber = fromNumber;
        try {
            Twilio.init(accountSid, authToken);
        } catch (Exception ex) {
            log.warn("Failed to initialize Twilio, OTP sending may not work: {}", ex.getMessage());
        }
    }

    @Override
    public void sendOtp(String mobile, String code) {
        try {
            Message.creator(new com.twilio.type.PhoneNumber(mobile), new com.twilio.type.PhoneNumber(fromNumber), "Your OTP is: " + code)
                .create();
        } catch (Exception ex) {
            log.warn("Failed to send OTP via Twilio to {}: {}", mobile, ex.getMessage());
        }
    }
}

