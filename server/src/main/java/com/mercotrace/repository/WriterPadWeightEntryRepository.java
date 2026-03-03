package com.mercotrace.repository;

import com.mercotrace.domain.WriterPadWeightEntry;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the {@link WriterPadWeightEntry} entity.
 */
@Repository
public interface WriterPadWeightEntryRepository extends JpaRepository<WriterPadWeightEntry, Long> {

    Page<WriterPadWeightEntry> findAllBySessionIdAndDeletedFalseOrderByWeighedAtDesc(Long sessionId, Pageable pageable);

    List<WriterPadWeightEntry> findAllBySessionIdAndDeletedFalseOrderByWeighedAtDesc(Long sessionId);

    List<WriterPadWeightEntry> findAllByBidNumberAndDeletedFalseOrderByWeighedAtDesc(Integer bidNumber);

    List<WriterPadWeightEntry> findAllBySessionIdIn(Iterable<Long> sessionIds);
}

