package com.mercotrace.config;

import com.mercotrace.service.otp.HttpOtpSender;
import com.mercotrace.service.otp.MockOtpSender;
import com.mercotrace.service.otp.OtpSender;
import com.mercotrace.service.otp.TwilioOtpSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OtpConfiguration {

    private static final Logger log = LoggerFactory.getLogger(OtpConfiguration.class);

    @Value("${otp.provider:mock}")
    private String provider;

    @Value("${otp.twilio.account-sid:}")
    private String twilioAccountSid;

    @Value("${otp.twilio.auth-token:}")
    private String twilioAuthToken;

    @Value("${otp.twilio.from-number:}")
    private String twilioFromNumber;

    @Value("${otp.http.url:}")
    private String httpUrl;

    @Value("${otp.http.token:}")
    private String httpToken;

    @Bean
    public OtpSender otpSender() {
        String normalized = provider == null ? "mock" : provider.trim().toLowerCase();
        switch (normalized) {
            case "twilio":
                if (twilioAccountSid == null || twilioAccountSid.isBlank()
                    || twilioAuthToken == null || twilioAuthToken.isBlank()
                    || twilioFromNumber == null || twilioFromNumber.isBlank()) {
                    log.warn("Twilio OTP provider selected but not fully configured. Falling back to mock provider.");
                    return new MockOtpSender();
                }
                return new TwilioOtpSender(twilioAccountSid, twilioAuthToken, twilioFromNumber);
            case "http":
                if (httpUrl == null || httpUrl.isBlank()) {
                    log.warn("HTTP OTP provider selected but url is not configured. Falling back to mock provider.");
                    return new MockOtpSender();
                }
                return new HttpOtpSender(httpUrl, httpToken);
            case "mock":
            default:
                if (!"mock".equals(normalized)) {
                    log.warn("Unknown OTP provider '{}', falling back to mock provider.", provider);
                }
                return new MockOtpSender();
        }
    }
}

