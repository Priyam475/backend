package com.mercotrace.repository;

import com.mercotrace.domain.StockPurchase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for StockPurchase. Scoped by trader; optional vendor filter by ID list.
 */
@Repository
public interface StockPurchaseRepository extends JpaRepository<StockPurchase, Long> {

    Page<StockPurchase> findAllByTraderIdAndIsDeletedFalse(Long traderId, Pageable pageable);

    @Query("SELECT sp FROM StockPurchase sp WHERE sp.traderId = :traderId AND sp.isDeleted = false AND sp.vendorId IN :vendorIds")
    Page<StockPurchase> findAllByTraderIdAndVendorIdInAndIsDeletedFalse(
        @Param("traderId") Long traderId,
        @Param("vendorIds") List<Long> vendorIds,
        Pageable pageable
    );

    /**
     * Portal-scoped query: all stock purchases where this contact is the vendor.
     */
    Page<StockPurchase> findAllByVendorIdAndIsDeletedFalse(Long vendorId, Pageable pageable);
}
