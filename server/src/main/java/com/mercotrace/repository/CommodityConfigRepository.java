package com.mercotrace.repository;

import com.mercotrace.domain.CommodityConfig;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CommodityConfigRepository extends JpaRepository<CommodityConfig, Long> {

    Optional<CommodityConfig> findOneByCommodityId(Long commodityId);

    void deleteByCommodityId(Long commodityId);
}
