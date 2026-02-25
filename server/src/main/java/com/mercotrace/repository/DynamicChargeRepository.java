package com.mercotrace.repository;

import com.mercotrace.domain.DynamicCharge;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DynamicChargeRepository extends JpaRepository<DynamicCharge, Long> {

    List<DynamicCharge> findAllByCommodityId(Long commodityId);

    void deleteByCommodityId(Long commodityId);
}
