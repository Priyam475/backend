package com.mercotrace.repository;

import com.mercotrace.domain.BillNumberSequence;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BillNumberSequenceRepository extends JpaRepository<BillNumberSequence, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM BillNumberSequence b WHERE b.prefix = :prefix")
    Optional<BillNumberSequence> findByPrefixForUpdate(@Param("prefix") String prefix);
}
