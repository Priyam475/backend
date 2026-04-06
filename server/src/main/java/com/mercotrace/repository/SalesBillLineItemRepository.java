package com.mercotrace.repository;

import com.mercotrace.domain.SalesBillLineItem;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SalesBillLineItemRepository extends JpaRepository<SalesBillLineItem, Long> {

    /**
     * Sum persisted billing line weights per lot (commodity group line items), trader-scoped.
     * Used by Settlement Sales Pad net weight vs Arrivals.
     */
    @Query(
        "SELECT i.lotId, COALESCE(SUM(i.weight), 0) FROM SalesBillLineItem i " +
        "JOIN i.commodityGroup g JOIN g.salesBill b " +
        "WHERE b.traderId = :traderId AND i.lotId IS NOT NULL AND i.lotId IN :lotIds " +
        "GROUP BY i.lotId"
    )
    List<Object[]> sumWeightGroupedByLotId(@Param("traderId") Long traderId, @Param("lotIds") Collection<String> lotIds);

    /**
     * Distinct sales bill ids that bill any of the given lots (optional billing name filter).
     */
    @Query(
        "SELECT DISTINCT g.salesBill.id FROM SalesBillLineItem i " +
        "JOIN i.commodityGroup g " +
        "WHERE g.salesBill.traderId = :traderId AND i.lotId IS NOT NULL AND i.lotId IN :lotIds " +
        "AND (:nameFilter IS NULL OR LOWER(g.salesBill.billingName) LIKE LOWER(CONCAT('%', :nameFilter, '%')))"
    )
    List<Long> findDistinctBillIdsByTraderAndLots(
        @Param("traderId") Long traderId,
        @Param("lotIds") Collection<String> lotIds,
        @Param("nameFilter") String nameFilter
    );

    /**
     * Sum line amounts for the given lots on sales bills (optional billing name filter).
     */
    @Query(
        "SELECT COALESCE(SUM(i.amount), 0) FROM SalesBillLineItem i " +
        "JOIN i.commodityGroup g " +
        "WHERE g.salesBill.traderId = :traderId AND i.lotId IS NOT NULL AND i.lotId IN :lotIds " +
        "AND (:nameFilter IS NULL OR LOWER(g.salesBill.billingName) LIKE LOWER(CONCAT('%', :nameFilter, '%')))"
    )
    BigDecimal sumLineAmountByTraderLots(
        @Param("traderId") Long traderId,
        @Param("lotIds") Collection<String> lotIds,
        @Param("nameFilter") String nameFilter
    );
}
