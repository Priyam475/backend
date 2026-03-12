package com.mercotrace.admin.identity;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AdminUserRepository extends JpaRepository<AdminUser, Long> {

    @EntityGraph(attributePaths = "authorities")
    Optional<AdminUser> findOneWithAuthoritiesByLogin(String login);

    @EntityGraph(attributePaths = "authorities")
    Optional<AdminUser> findOneWithAuthoritiesByEmailIgnoreCase(String email);

    @EntityGraph(attributePaths = "roles")
    @Query("select distinct u from AdminUser u")
    List<AdminUser> findAllWithRoles();

    @EntityGraph(attributePaths = { "roles", "authorities" })
    @Query("select u from AdminUser u where u.id = :id")
    Optional<AdminUser> findOneWithRolesAndAuthoritiesById(@Param("id") Long id);

    @EntityGraph(attributePaths = { "roles", "authorities" })
    List<AdminUser> findAllByRoles_Id(Long roleId);

    Optional<AdminUser> findOneByLogin(String login);

    Optional<AdminUser> findOneByEmailIgnoreCase(String email);

    Optional<AdminUser> findOneByMobile(String mobile);
}

