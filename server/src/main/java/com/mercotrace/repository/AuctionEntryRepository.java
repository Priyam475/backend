package com.mercotrace.repository;

import com.mercotrace.domain.AuctionEntry;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the {@link com.mercotrace.domain.AuctionEntry} entity.
 */
@Repository
public interface AuctionEntryRepository extends JpaRepository<AuctionEntry, Long> {

    List<AuctionEntry> findAllByAuctionId(Long auctionId);

    List<AuctionEntry> findAllByAuctionIdIn(Iterable<Long> auctionIds);

    Optional<AuctionEntry> findFirstByBidNumber(Integer bidNumber);

    Page<AuctionEntry> findAllByCreatedAtBetween(Instant from, Instant to, Pageable pageable);
}

