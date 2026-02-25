package com.mercotrace.repository;

import com.mercotrace.domain.DeductionRule;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeductionRuleRepository extends JpaRepository<DeductionRule, Long> {

    List<DeductionRule> findAllByCommodityIdOrderByMinWeight(Long commodityId);

    void deleteByCommodityId(Long commodityId);
}
