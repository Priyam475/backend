package com.mercotrace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mercotrace.domain.ContactOtpToken;
import com.mercotrace.repository.ContactOtpTokenRepository;
import com.mercotrace.service.ContactOtpService.ContactOtpRateLimitExceededException;
import com.mercotrace.service.ContactOtpService.OtpValidationStatus;
import com.mercotrace.service.otp.OtpSender;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ContactOtpServiceTest {

    @Mock
    private ContactOtpTokenRepository tokenRepository;

    @Mock
    private OtpSender otpSender;

    @InjectMocks
    private ContactOtpService contactOtpService;

    @BeforeEach
    void configureProperties() {
        // make TTL and rate limits deterministic for tests
        org.springframework.test.util.ReflectionTestUtils.setField(contactOtpService, "ttlMinutes", 5L);
        org.springframework.test.util.ReflectionTestUtils.setField(contactOtpService, "maxAttemptsPerToken", 3);
        org.springframework.test.util.ReflectionTestUtils.setField(contactOtpService, "maxRequestsPerHour", 5);
    }

    @Test
    void generateOtpForMobile_createsToken_andSendsOtp_whenUnderRateLimit() {
        when(tokenRepository.countByMobileAndCreatedAtAfter(eq("9876543210"), any(Instant.class))).thenReturn(0L);

        contactOtpService.generateOtpForMobile("9876543210", "127.0.0.1");

        ArgumentCaptor<ContactOtpToken> tokenCaptor = ArgumentCaptor.forClass(ContactOtpToken.class);
        verify(tokenRepository).save(tokenCaptor.capture());
        ContactOtpToken saved = tokenCaptor.getValue();
        assertThat(saved.getMobile()).isEqualTo("9876543210");
        assertThat(saved.getCode()).hasSize(4);
        assertThat(saved.getAttempts()).isZero();
        assertThat(saved.getMaxAttempts()).isEqualTo(3);
        assertThat(saved.getExpiresAt()).isAfter(saved.getCreatedAt());
        assertThat(saved.getLastRequestIp()).isEqualTo("127.0.0.1");

        verify(otpSender).sendOtp("9876543210", saved.getCode());
    }

    @Test
    void generateOtpForMobile_exceedsRateLimit_throwsContactOtpRateLimitExceededException() {
        when(tokenRepository.countByMobileAndCreatedAtAfter(eq("9876543210"), any(Instant.class))).thenReturn(5L);

        assertThatThrownBy(() -> contactOtpService.generateOtpForMobile("9876543210", "127.0.0.1"))
            .isInstanceOf(ContactOtpRateLimitExceededException.class);

        verify(tokenRepository, never()).save(any(ContactOtpToken.class));
        verify(otpSender, never()).sendOtp(any(), any());
    }

    @Test
    void validateOtp_whenTokenNotFound_returnsNotFound() {
        when(tokenRepository.findTopByMobileAndExpiresAtGreaterThanAndConsumedAtIsNullOrderByCreatedAtDesc(eq("9876543210"), any(Instant.class)))
            .thenReturn(Optional.empty());

        OtpValidationStatus status = contactOtpService.validateOtp("9876543210", "1234");

        assertThat(status).isEqualTo(OtpValidationStatus.NOT_FOUND);
    }

    @Test
    void validateOtp_whenTokenExpired_marksConsumed_andReturnsExpired() {
        ContactOtpToken token = new ContactOtpToken();
        token.setId(1L);
        token.setMobile("9876543210");
        token.setCode("1234");
        token.setExpiresAt(Instant.now().minusSeconds(10));
        token.setCreatedAt(Instant.now().minusSeconds(60));
        token.setAttempts(0);
        token.setMaxAttempts(3);

        when(tokenRepository.findTopByMobileAndExpiresAtGreaterThanAndConsumedAtIsNullOrderByCreatedAtDesc(eq("9876543210"), any(Instant.class)))
            .thenReturn(Optional.of(token));

        OtpValidationStatus status = contactOtpService.validateOtp("9876543210", "1234");

        assertThat(status).isEqualTo(OtpValidationStatus.EXPIRED);
        assertThat(token.getConsumedAt()).isNotNull();
        verify(tokenRepository).save(token);
    }

    @Test
    void validateOtp_whenMaxAttemptsReachedBeforeValidation_marksConsumed_andReturnsTooManyAttempts() {
        ContactOtpToken token = new ContactOtpToken();
        token.setId(1L);
        token.setMobile("9876543210");
        token.setCode("1234");
        token.setExpiresAt(Instant.now().plusSeconds(300));
        token.setCreatedAt(Instant.now().minusSeconds(60));
        token.setAttempts(3);
        token.setMaxAttempts(3);

        when(tokenRepository.findTopByMobileAndExpiresAtGreaterThanAndConsumedAtIsNullOrderByCreatedAtDesc(eq("9876543210"), any(Instant.class)))
            .thenReturn(Optional.of(token));

        OtpValidationStatus status = contactOtpService.validateOtp("9876543210", "1234");

        assertThat(status).isEqualTo(OtpValidationStatus.TOO_MANY_ATTEMPTS);
        assertThat(token.getConsumedAt()).isNotNull();
        verify(tokenRepository).save(token);
    }

    @Test
    void validateOtp_withIncorrectCode_incrementsAttempts_andReturnsInvalidOrTooManyAttempts() {
        ContactOtpToken token = new ContactOtpToken();
        token.setId(1L);
        token.setMobile("9876543210");
        token.setCode("1234");
        token.setExpiresAt(Instant.now().plusSeconds(300));
        token.setCreatedAt(Instant.now().minusSeconds(60));
        token.setAttempts(0);
        token.setMaxAttempts(3);

        when(tokenRepository.findTopByMobileAndExpiresAtGreaterThanAndConsumedAtIsNullOrderByCreatedAtDesc(eq("9876543210"), any(Instant.class)))
            .thenReturn(Optional.of(token));

        OtpValidationStatus status = contactOtpService.validateOtp("9876543210", "0000");

        assertThat(status).isIn(OtpValidationStatus.INVALID, OtpValidationStatus.TOO_MANY_ATTEMPTS);
        assertThat(token.getAttempts()).isEqualTo(1);
        verify(tokenRepository).save(token);
    }

    @Test
    void validateOtp_withCorrectCode_setsConsumed_andReturnsValid() {
        ContactOtpToken token = new ContactOtpToken();
        token.setId(1L);
        token.setMobile("9876543210");
        token.setCode("1234");
        token.setExpiresAt(Instant.now().plusSeconds(300));
        token.setCreatedAt(Instant.now().minusSeconds(60));
        token.setAttempts(1);
        token.setMaxAttempts(3);

        when(tokenRepository.findTopByMobileAndExpiresAtGreaterThanAndConsumedAtIsNullOrderByCreatedAtDesc(eq("9876543210"), any(Instant.class)))
            .thenReturn(Optional.of(token));

        OtpValidationStatus status = contactOtpService.validateOtp("9876543210", "1234");

        assertThat(status).isEqualTo(OtpValidationStatus.VALID);
        assertThat(token.getConsumedAt()).isNotNull();
        verify(tokenRepository).save(token);
    }
}

