package com.mercotrace.repository;

import com.mercotrace.domain.FreightCalculation;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FreightCalculationRepository extends JpaRepository<FreightCalculation, Long> {

    Optional<FreightCalculation> findOneByVehicleId(Long vehicleId);

    List<FreightCalculation> findAllByVehicleIdIn(Iterable<Long> vehicleIds);

    void deleteByVehicleId(Long vehicleId);
}

