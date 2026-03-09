package com.mercotrace.repository;

import com.mercotrace.domain.ArApDocument;
import com.mercotrace.domain.enumeration.ArApStatus;
import com.mercotrace.domain.enumeration.ArApType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * JPA repository for AR/AP documents (aging reports).
 * Trader-scoped; filter by type and status.
 */
@Repository
public interface ArApDocumentRepository extends JpaRepository<ArApDocument, Long> {

    @Query(
        "SELECT d FROM ArApDocument d WHERE d.traderId = :traderId " +
        "AND (:type IS NULL OR d.type = :type) " +
        "AND (:status IS NULL OR d.status = :status)"
    )
    Page<ArApDocument> findAllByTraderIdAndTypeAndStatus(
        @Param("traderId") Long traderId,
        @Param("type") ArApType type,
        @Param("status") ArApStatus status,
        Pageable pageable
    );

    /**
     * Portal-scoped query: all AR/AP documents for a given contact across traders.
     */
    Page<ArApDocument> findAllByContact_Id(Long contactId, Pageable pageable);

    /**
     * Portal-scoped query: AP (payables/settlements) documents for a given contact across traders.
     */
    Page<ArApDocument> findAllByContact_IdAndType(Long contactId, ArApType type, Pageable pageable);
}

