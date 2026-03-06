package com.mercotrace.repository;

import com.mercotrace.domain.OtpToken;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OtpTokenRepository extends JpaRepository<OtpToken, Long> {

    Optional<OtpToken> findTopByMobileAndExpiresAtGreaterThanAndConsumedAtIsNullOrderByCreatedAtDesc(
        String mobile,
        Instant now
    );

    long countByMobileAndCreatedAtAfter(String mobile, Instant cutoff);
}

