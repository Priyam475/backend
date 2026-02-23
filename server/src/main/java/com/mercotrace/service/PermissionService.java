package com.mercotrace.service;

import com.mercotrace.service.dto.PermissionDTO;
import java.util.Optional;

/**
 * Service Interface for managing {@link com.mercotrace.domain.Permission}.
 */
public interface PermissionService {
    /**
     * Save a permission.
     *
     * @param permissionDTO the entity to save.
     * @return the persisted entity.
     */
    PermissionDTO save(PermissionDTO permissionDTO);

    /**
     * Updates a permission.
     *
     * @param permissionDTO the entity to update.
     * @return the persisted entity.
     */
    PermissionDTO update(PermissionDTO permissionDTO);

    /**
     * Partially updates a permission.
     *
     * @param permissionDTO the entity to update partially.
     * @return the persisted entity.
     */
    Optional<PermissionDTO> partialUpdate(PermissionDTO permissionDTO);

    /**
     * Get the "id" permission.
     *
     * @param id the id of the entity.
     * @return the entity.
     */
    Optional<PermissionDTO> findOne(Long id);

    /**
     * Delete the "id" permission.
     *
     * @param id the id of the entity.
     */
    void delete(Long id);
}
