package com.mercotrace.config;

import com.mercotrace.service.otp.Fast2SmsOtpSender;
import com.mercotrace.service.otp.OtpSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OtpConfiguration {

    private static final Logger log = LoggerFactory.getLogger(OtpConfiguration.class);

    @Value("${otp.fast2sms.base-url:https://www.fast2sms.com/dev/bulkV2}")
    private String baseUrl;

    @Value("${otp.fast2sms.api-key:}")
    private String apiKey;

    @Value("${otp.fast2sms.sender-id:MERCO}")
    private String senderId;

    @Value("${otp.fast2sms.route:dlt}")
    private String route;

    @Value("${otp.fast2sms.message-id:170404}")
    private String messageId;

    @Value("${otp.fast2sms.flash:0}")
    private String flash;

    @Value("${otp.fast2sms.schedule-time:}")
    private String scheduleTime;

    @Bean
    public OtpSender otpSender() {
        if (apiKey == null || apiKey.isBlank()) {
            log.error(
                "Fast2SMS API key (otp.fast2sms.api-key) is not configured. OTP SMS sending will not work until it is set."
            );
        }

        return new Fast2SmsOtpSender(baseUrl, apiKey, senderId, route, messageId, flash, scheduleTime);
    }
}

