package com.mercotrace.repository;

import com.mercotrace.domain.SelfSaleClosure;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SelfSaleClosureRepository extends JpaRepository<SelfSaleClosure, Long> {

    /**
     * Paginated list of closures for a trader (excluding soft-deleted), sorted by closedAt desc by default.
     */
    Page<SelfSaleClosure> findByTraderIdAndIsDeletedFalse(Long traderId, Pageable pageable);

    /**
     * Lot IDs that are already closed as self-sale for this trader (to exclude from open lots).
     */
    @Query("SELECT s.lotId FROM SelfSaleClosure s WHERE s.traderId = :traderId AND s.isDeleted = false")
    Set<Long> findClosedLotIdsByTraderId(@Param("traderId") Long traderId);

    /**
     * Whether the lot has an active (non-deleted) self-sale closure for this trader.
     */
    boolean existsByLotIdAndTraderIdAndIsDeletedFalse(Long lotId, Long traderId);
}
