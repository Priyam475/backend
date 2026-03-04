package com.mercotrace.repository;

import com.mercotrace.domain.OtpToken;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface OtpTokenRepository extends JpaRepository<OtpToken, Long> {

    @Query(
        "select t from OtpToken t " +
        "where t.mobile = :mobile and t.expiresAt > :now and t.consumedAt is null " +
        "order by t.createdAt desc"
    )
    Optional<OtpToken> findLatestActiveByMobile(String mobile, Instant now);

    long countByMobileAndCreatedAtAfter(String mobile, Instant cutoff);
}

