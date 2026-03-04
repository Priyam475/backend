package com.mercotrace.service.otp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestTemplate;

public class HttpOtpSender implements OtpSender {

    private static final Logger log = LoggerFactory.getLogger(HttpOtpSender.class);

    private final String url;
    private final String token;
    private final RestTemplate restTemplate;

    public HttpOtpSender(String url, String token) {
        this.url = url;
        this.token = token;
        this.restTemplate = new RestTemplate();
    }

    @Override
    public void sendOtp(String mobile, String code) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (token != null && !token.isBlank()) {
                headers.set("Authorization", "Bearer " + token);
            }
            String body = String.format("{\"mobile\":\"%s\",\"code\":\"%s\"}", mobile, code);
            HttpEntity<String> entity = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(url, entity, String.class);
        } catch (Exception ex) {
            log.warn("Failed to send OTP via HTTP provider to {}: {}", mobile, ex.getMessage());
        }
    }
}

