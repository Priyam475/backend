package com.mercotrace.repository;

import com.mercotrace.domain.HamaliSlab;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HamaliSlabRepository extends JpaRepository<HamaliSlab, Long> {

    List<HamaliSlab> findAllByCommodityIdOrderByThresholdWeight(Long commodityId);

    void deleteByCommodityId(Long commodityId);
}
