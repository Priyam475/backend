package com.mercotrace.repository;

import com.mercotrace.domain.UserRole;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the {@link UserRole} entity.
 */
@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Long> {

    List<UserRole> findByUserId(Long userId);

    List<UserRole> findByRoleId(Long roleId);

    /**
     * Fetch user-role mappings for a set of users, eagerly loading the associated {@link com.mercotrace.domain.Role}
     * and restricting to roles that belong to the given trader. This avoids LazyInitializationException and N+1
     * queries when building trader-scoped RBAC views.
     */
    @Query(
        "select ur from UserRole ur " +
        "join fetch ur.role r " +
        "where ur.user.id in :userIds and r.traderId = :traderId"
    )
    List<UserRole> findByUserIdInAndTraderId(@Param("userIds") List<Long> userIds, @Param("traderId") Long traderId);

    void deleteByUserId(Long userId);
}

