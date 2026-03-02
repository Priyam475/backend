package com.mercotrace.repository;

import com.mercotrace.domain.PattiDeduction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the {@link PattiDeduction} entity.
 */
@Repository
public interface PattiDeductionRepository extends JpaRepository<PattiDeduction, Long> {}