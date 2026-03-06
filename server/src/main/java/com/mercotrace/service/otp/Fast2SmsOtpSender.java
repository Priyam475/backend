package com.mercotrace.service.otp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

public class Fast2SmsOtpSender implements OtpSender {

    private static final Logger log = LoggerFactory.getLogger(Fast2SmsOtpSender.class);

    private final String baseUrl;
    private final String apiKey;
    private final String senderId;
    private final String route;
    private final String messageId;
    private final String flash;
    private final String scheduleTime;
    private final RestTemplate restTemplate;

    public Fast2SmsOtpSender(
        String baseUrl,
        String apiKey,
        String senderId,
        String route,
        String messageId,
        String flash,
        String scheduleTime
    ) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.senderId = senderId;
        this.route = route;
        this.messageId = messageId;
        this.flash = flash;
        this.scheduleTime = scheduleTime;
        this.restTemplate = new RestTemplate();
    }

    @Override
    public void sendOtp(String mobile, String code) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Fast2SMS API key is not configured; skipping OTP send for mobile {}", mobile);
            return;
        }

        try {
            UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl(baseUrl)
                .queryParam("authorization", apiKey)
                .queryParam("route", route)
                .queryParam("sender_id", senderId)
                .queryParam("message", messageId)
                .queryParam("variables_values", code)
                .queryParam("numbers", mobile)
                .queryParam("flash", flash);

            if (scheduleTime != null && !scheduleTime.isBlank()) {
                builder.queryParam("schedule_time", scheduleTime);
            }

            String url = builder.toUriString();
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                log.warn(
                    "Failed to send OTP via Fast2SMS to {}: HTTP status {}",
                    mobile,
                    response.getStatusCode().value()
                );
            }
        } catch (Exception ex) {
            log.warn("Failed to send OTP via Fast2SMS to {}: {}", mobile, ex.getMessage());
        }
    }
}

