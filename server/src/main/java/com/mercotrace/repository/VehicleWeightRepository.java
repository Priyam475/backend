package com.mercotrace.repository;

import com.mercotrace.domain.VehicleWeight;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VehicleWeightRepository extends JpaRepository<VehicleWeight, Long> {

    Optional<VehicleWeight> findOneByVehicleId(Long vehicleId);

    List<VehicleWeight> findAllByVehicleIdIn(Iterable<Long> vehicleIds);

    void deleteByVehicleId(Long vehicleId);
}

