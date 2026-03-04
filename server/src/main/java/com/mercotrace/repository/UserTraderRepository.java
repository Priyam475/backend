package com.mercotrace.repository;

import com.mercotrace.domain.UserTrader;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserTraderRepository extends JpaRepository<UserTrader, Long> {

    Optional<UserTrader> findFirstByUserIdAndPrimaryMappingTrue(Long userId);

    Optional<UserTrader> findFirstByTraderIdAndPrimaryMappingTrue(Long traderId);

    List<UserTrader> findAllByRoleInTraderAndPrimaryMappingTrue(String roleInTrader);
}

