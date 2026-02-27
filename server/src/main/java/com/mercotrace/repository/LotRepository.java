package com.mercotrace.repository;

import com.mercotrace.domain.Lot;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LotRepository extends JpaRepository<Lot, Long> {

    List<Lot> findAllBySellerVehicleIdIn(Iterable<Long> sellerVehicleIds);

    Page<Lot> findAllByLotNameContainingIgnoreCase(String lotName, Pageable pageable);
}

