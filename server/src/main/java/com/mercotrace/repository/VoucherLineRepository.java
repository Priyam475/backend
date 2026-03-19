package com.mercotrace.repository;

import com.mercotrace.domain.VoucherLine;
import com.mercotrace.domain.enumeration.VoucherLifecycleStatus;
import com.mercotrace.domain.enumeration.VoucherType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * JPA repository for voucher lines (ledger debit/credit lines).
 */
@Repository
public interface VoucherLineRepository extends JpaRepository<VoucherLine, Long> {

    List<VoucherLine> findAllByVoucherHeaderIdOrderById(Long voucherHeaderId);

    /** Lines whose voucher is in date range, trader-scoped. For Financial Reports. */
    @Query(
        "SELECT vl FROM VoucherLine vl JOIN vl.voucherHeader v " +
        "WHERE v.traderId = :traderId AND v.voucherDate >= :dateFrom AND v.voucherDate <= :dateTo " +
        "ORDER BY v.voucherDate ASC, vl.id ASC"
    )
    List<VoucherLine> findAllByTraderIdAndVoucherDateBetween(
        @Param("traderId") Long traderId,
        @Param("dateFrom") LocalDate dateFrom,
        @Param("dateTo") LocalDate dateTo
    );

    @Query(
        "SELECT vl FROM VoucherLine vl JOIN vl.voucherHeader v " +
        "WHERE v.traderId = :traderId AND v.voucherDate >= :dateFrom AND v.voucherDate <= :dateTo " +
        "ORDER BY v.voucherDate ASC, vl.id ASC"
    )
    Page<VoucherLine> findPageByTraderIdAndVoucherDateBetween(
        @Param("traderId") Long traderId,
        @Param("dateFrom") LocalDate dateFrom,
        @Param("dateTo") LocalDate dateTo,
        Pageable pageable
    );

    /** Lines for a specific ledger in date range, trader-scoped. For Ledger View. */
    @Query(
        "SELECT vl FROM VoucherLine vl JOIN vl.voucherHeader v " +
        "WHERE v.traderId = :traderId AND vl.ledgerId = :ledgerId " +
        "AND v.voucherDate >= :dateFrom AND v.voucherDate <= :dateTo " +
        "ORDER BY v.voucherDate ASC, vl.id ASC"
    )
    List<VoucherLine> findAllByTraderIdAndLedgerIdAndVoucherDateBetween(
        @Param("traderId") Long traderId,
        @Param("ledgerId") Long ledgerId,
        @Param("dateFrom") LocalDate dateFrom,
        @Param("dateTo") LocalDate dateTo
    );

    /**
     * Sum credit amount for voucher lines in a ledger where voucher type is ADVANCE and status is not REVERSED.
     * Used for settlement cash advance from ledger (REQ-PUT-003).
     */
    @Query(
        "SELECT COALESCE(SUM(vl.credit), 0) FROM VoucherLine vl JOIN vl.voucherHeader v " +
        "WHERE vl.ledgerId = :ledgerId AND v.voucherType = :voucherType AND v.status <> :excludedStatus"
    )
    BigDecimal sumCreditByLedgerIdAndVoucherTypeExcludingStatus(
        @Param("ledgerId") Long ledgerId,
        @Param("voucherType") VoucherType voucherType,
        @Param("excludedStatus") VoucherLifecycleStatus excludedStatus
    );

    /**
     * Sum (debit - credit) for voucher lines in a ledger before a date (exclusive).
     * Used for dynamic opening balance computation (Phase 5).
     * Excludes REVERSED vouchers. Trader-scoped.
     */
    @Query(
        "SELECT COALESCE(SUM(vl.debit - vl.credit), 0) FROM VoucherLine vl JOIN vl.voucherHeader v " +
        "WHERE v.traderId = :traderId AND vl.ledgerId = :ledgerId " +
        "AND v.voucherDate < :asOfDateExclusive AND v.status <> :excludedStatus"
    )
    BigDecimal sumDebitMinusCreditByLedgerIdAndVoucherDateBefore(
        @Param("traderId") Long traderId,
        @Param("ledgerId") Long ledgerId,
        @Param("asOfDateExclusive") LocalDate asOfDateExclusive,
        @Param("excludedStatus") VoucherLifecycleStatus excludedStatus
    );

    /**
     * Lines for multiple ledgers in date range, trader-scoped. Excludes REVERSED vouchers.
     * Used for Contact Consolidated Ledger View (Phase 6).
     */
    @Query(
        "SELECT vl FROM VoucherLine vl JOIN vl.voucherHeader v " +
        "WHERE v.traderId = :traderId AND vl.ledgerId IN :ledgerIds " +
        "AND v.voucherDate >= :dateFrom AND v.voucherDate <= :dateTo " +
        "AND v.status <> :excludedStatus " +
        "ORDER BY v.voucherDate ASC, vl.id ASC"
    )
    List<VoucherLine> findAllByTraderIdAndLedgerIdInAndVoucherDateBetweenExcludingStatus(
        @Param("traderId") Long traderId,
        @Param("ledgerIds") List<Long> ledgerIds,
        @Param("dateFrom") LocalDate dateFrom,
        @Param("dateTo") LocalDate dateTo,
        @Param("excludedStatus") VoucherLifecycleStatus excludedStatus
    );
}
