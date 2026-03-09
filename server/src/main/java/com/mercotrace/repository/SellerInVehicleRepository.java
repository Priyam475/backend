package com.mercotrace.repository;

import com.mercotrace.domain.SellerInVehicle;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SellerInVehicleRepository extends JpaRepository<SellerInVehicle, Long> {

    List<SellerInVehicle> findAllByVehicleId(Long vehicleId);

    List<SellerInVehicle> findAllByVehicleIdIn(Iterable<Long> vehicleIds);

    /**
     * Portal-scoped query: all seller/broker rows where this contact participates.
     */
    List<SellerInVehicle> findAllByContactIdOrBrokerId(Long contactId, Long brokerId);
}

