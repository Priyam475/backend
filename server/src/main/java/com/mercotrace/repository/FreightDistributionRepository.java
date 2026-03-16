package com.mercotrace.repository;

import com.mercotrace.domain.FreightDistribution;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FreightDistributionRepository extends JpaRepository<FreightDistribution, Long> {

    List<FreightDistribution> findAllByFreightId(Long freightId);

    void deleteByFreightId(Long freightId);
}

