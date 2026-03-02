package com.mercotrace.repository;

import com.mercotrace.domain.PattiRateCluster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the {@link PattiRateCluster} entity.
 */
@Repository
public interface PattiRateClusterRepository extends JpaRepository<PattiRateCluster, Long> {}