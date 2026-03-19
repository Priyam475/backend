package com.mercotrace.repository;

import com.mercotrace.domain.ChartOfAccount;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for ChartOfAccount (CoA ledger).
 */
@Repository
public interface ChartOfAccountRepository extends JpaRepository<ChartOfAccount, Long> {

    @Query(
        "SELECT c FROM ChartOfAccount c WHERE c.traderId = :traderId " +
        "AND (:search IS NULL OR :search = '' OR LOWER(c.ledgerName) LIKE LOWER(CONCAT(CONCAT('%', :search), '%'))) " +
        "AND (:accountingClass IS NULL OR :accountingClass = '' OR c.accountingClass = :accountingClass) " +
        "AND (:classification IS NULL OR :classification = '' OR c.classification = :classification)"
    )
    Page<ChartOfAccount> findAllByTraderIdAndFilters(
        @Param("traderId") Long traderId,
        @Param("search") String search,
        @Param("accountingClass") String accountingClass,
        @Param("classification") String classification,
        Pageable pageable
    );

    Page<ChartOfAccount> findAllByTraderId(Long traderId, Pageable pageable);

    Optional<ChartOfAccount> findOneByTraderIdAndId(Long traderId, Long id);

    Optional<ChartOfAccount> findOneByTraderIdAndLedgerNameIgnoreCase(Long traderId, String ledgerName);

    /** Find AR Control ledger (classification=CONTROL, name contains "accounts receivable"). Used when creating contact Receivable ledgers. */
    Optional<ChartOfAccount> findFirstByTraderIdAndClassificationAndLedgerNameContainingIgnoreCase(
        Long traderId, String classification, String namePart
    );

    /** Check if trader has any system ledger. Used for idempotent bootstrap. */
    boolean existsByTraderIdAndSystemTrue(Long traderId);

    /** Find Receivable ledger for a contact. Used for settlement cash advance from ledger. */
    Optional<ChartOfAccount> findFirstByTraderIdAndContactIdAndClassification(
        Long traderId, Long contactId, String classification
    );

    /** Find all ledgers linked to a contact. Used for Contact Consolidated Ledger View (Phase 6). */
    List<ChartOfAccount> findAllByTraderIdAndContactId(Long traderId, Long contactId);
}
