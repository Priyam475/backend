package com.mercotrace.repository;

import com.mercotrace.domain.DailySerialAllocation;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DailySerialAllocationRepository extends JpaRepository<DailySerialAllocation, Long> {

    List<DailySerialAllocation> findAllByTraderIdAndSerialDateAndKeyType(
        Long traderId,
        LocalDate serialDate,
        String keyType
    );
}
