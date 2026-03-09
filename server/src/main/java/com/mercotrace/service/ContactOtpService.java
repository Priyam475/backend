package com.mercotrace.service;

import com.mercotrace.domain.ContactOtpToken;
import com.mercotrace.repository.ContactOtpTokenRepository;
import com.mercotrace.service.otp.OtpSender;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Random;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * OTP service dedicated to Contact Portal authentication.
 * Uses a separate table from trader OTPs to keep flows isolated.
 */
@Service
@Transactional
public class ContactOtpService {

    public enum OtpValidationStatus {
        VALID,
        INVALID,
        EXPIRED,
        TOO_MANY_ATTEMPTS,
        NOT_FOUND
    }

    private static final Logger log = LoggerFactory.getLogger(ContactOtpService.class);

    private static final int OTP_LENGTH = 4;

    private final Random random = new Random();
    private final ContactOtpTokenRepository tokenRepository;
    private final OtpSender otpSender;

    @Value("${otp.max-attempts-per-token:5}")
    private int maxAttemptsPerToken;

    @Value("${otp.ttl-minutes:5}")
    private long ttlMinutes;

    @Value("${otp.rate-limit.max-per-hour:5}")
    private int maxRequestsPerHour;

    public ContactOtpService(ContactOtpTokenRepository tokenRepository, OtpSender otpSender) {
        this.tokenRepository = tokenRepository;
        this.otpSender = otpSender;
    }

    public void generateOtpForMobile(String mobile, String requestIp) {
        Objects.requireNonNull(mobile, "mobile must not be null");
        String normalizedMobile = normalize(mobile);
        enforceRateLimit(normalizedMobile);

        String code = String.format("%0" + OTP_LENGTH + "d", random.nextInt((int) Math.pow(10, OTP_LENGTH)));
        Instant now = Instant.now();
        Instant expiresAt = now.plus(Duration.ofMinutes(ttlMinutes));

        ContactOtpToken token = new ContactOtpToken();
        token.setMobile(normalizedMobile);
        token.setCode(code);
        token.setCreatedAt(now);
        token.setExpiresAt(expiresAt);
        token.setAttempts(0);
        token.setMaxAttempts(maxAttemptsPerToken);
        token.setLastRequestIp(requestIp);
        token.setConsumedAt(null);

        tokenRepository.save(token);

        otpSender.sendOtp(normalizedMobile, code);
        log.debug("Generated contact OTP token id={} for mobile={}", token.getId(), normalizedMobile);
    }

    public OtpValidationStatus validateOtp(String mobile, String otp) {
        Objects.requireNonNull(mobile, "mobile must not be null");
        Objects.requireNonNull(otp, "otp must not be null");

        String normalizedMobile = normalize(mobile);
        Instant now = Instant.now();

        return tokenRepository
            .findTopByMobileAndExpiresAtGreaterThanAndConsumedAtIsNullOrderByCreatedAtDesc(normalizedMobile, now)
            .map(token -> validateAgainstToken(token, otp, now))
            .orElse(OtpValidationStatus.NOT_FOUND);
    }

    private void enforceRateLimit(String normalizedMobile) {
        Instant cutoff = Instant.now().minus(Duration.ofHours(1));
        long recentCount = tokenRepository.countByMobileAndCreatedAtAfter(normalizedMobile, cutoff);
        if (recentCount >= maxRequestsPerHour) {
            throw new ContactOtpRateLimitExceededException("Too many OTP requests. Please try again later.");
        }
    }

    private OtpValidationStatus validateAgainstToken(ContactOtpToken token, String otp, Instant now) {
        if (now.isAfter(token.getExpiresAt())) {
            token.setConsumedAt(now);
            tokenRepository.save(token);
            return OtpValidationStatus.EXPIRED;
        }

        if (token.getAttempts() >= token.getMaxAttempts()) {
            token.setConsumedAt(now);
            tokenRepository.save(token);
            return OtpValidationStatus.TOO_MANY_ATTEMPTS;
        }

        token.setAttempts(token.getAttempts() + 1);

        if (!token.getCode().equals(otp)) {
            if (token.getAttempts() >= token.getMaxAttempts()) {
                token.setConsumedAt(now);
            }
            tokenRepository.save(token);
            return token.getAttempts() >= token.getMaxAttempts() ? OtpValidationStatus.TOO_MANY_ATTEMPTS : OtpValidationStatus.INVALID;
        }

        token.setConsumedAt(now);
        tokenRepository.save(token);
        return OtpValidationStatus.VALID;
    }

    private String normalize(String mobile) {
        return mobile.trim();
    }

    public static class ContactOtpRateLimitExceededException extends RuntimeException {
        public ContactOtpRateLimitExceededException(String message) {
            super(message);
        }
    }
}

