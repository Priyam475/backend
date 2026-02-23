package com.mercotrace.service;

import com.mercotrace.service.dto.BusinessCategoryDTO;
import java.util.Optional;

/**
 * Service Interface for managing {@link com.mercotrace.domain.BusinessCategory}.
 */
public interface BusinessCategoryService {
    /**
     * Save a businessCategory.
     *
     * @param businessCategoryDTO the entity to save.
     * @return the persisted entity.
     */
    BusinessCategoryDTO save(BusinessCategoryDTO businessCategoryDTO);

    /**
     * Updates a businessCategory.
     *
     * @param businessCategoryDTO the entity to update.
     * @return the persisted entity.
     */
    BusinessCategoryDTO update(BusinessCategoryDTO businessCategoryDTO);

    /**
     * Partially updates a businessCategory.
     *
     * @param businessCategoryDTO the entity to update partially.
     * @return the persisted entity.
     */
    Optional<BusinessCategoryDTO> partialUpdate(BusinessCategoryDTO businessCategoryDTO);

    /**
     * Get the "id" businessCategory.
     *
     * @param id the id of the entity.
     * @return the entity.
     */
    Optional<BusinessCategoryDTO> findOne(Long id);

    /**
     * Delete the "id" businessCategory.
     *
     * @param id the id of the entity.
     */
    void delete(Long id);
}
