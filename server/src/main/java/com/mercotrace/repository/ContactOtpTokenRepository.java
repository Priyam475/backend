package com.mercotrace.repository;

import com.mercotrace.domain.ContactOtpToken;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ContactOtpTokenRepository extends JpaRepository<ContactOtpToken, Long> {

    Optional<ContactOtpToken> findTopByMobileAndExpiresAtGreaterThanAndConsumedAtIsNullOrderByCreatedAtDesc(
        String mobile,
        Instant now
    );

    long countByMobileAndCreatedAtAfter(String mobile, Instant cutoff);
}

