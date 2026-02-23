package com.mercotrace.repository;

import com.mercotrace.domain.Trader;
import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the Trader entity.
 */
@SuppressWarnings("unused")
@Repository
public interface TraderRepository extends JpaRepository<Trader, Long>, JpaSpecificationExecutor<Trader> {}
