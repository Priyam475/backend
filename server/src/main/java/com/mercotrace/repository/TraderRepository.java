package com.mercotrace.repository;

import com.mercotrace.domain.Trader;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the Trader entity.
 */
@SuppressWarnings("unused")
@Repository
public interface TraderRepository extends JpaRepository<Trader, Long>, JpaSpecificationExecutor<Trader> {

    Optional<Trader> findOneByMobile(String mobile);

    /** Direct update to bypass L2 cache (avoids serialization mismatch after schema change). */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Trader t SET t.active = :active WHERE t.id = :id")
    int setActiveById(@Param("id") Long id, @Param("active") boolean active);
}
