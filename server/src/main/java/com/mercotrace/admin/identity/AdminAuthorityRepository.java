package com.mercotrace.admin.identity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminAuthorityRepository extends JpaRepository<AdminAuthority, String> {}

