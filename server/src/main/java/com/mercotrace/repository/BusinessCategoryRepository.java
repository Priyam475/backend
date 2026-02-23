package com.mercotrace.repository;

import com.mercotrace.domain.BusinessCategory;
import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the BusinessCategory entity.
 */
@SuppressWarnings("unused")
@Repository
public interface BusinessCategoryRepository extends JpaRepository<BusinessCategory, Long>, JpaSpecificationExecutor<BusinessCategory> {}
