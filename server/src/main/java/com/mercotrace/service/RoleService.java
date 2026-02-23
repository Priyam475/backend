package com.mercotrace.service;

import com.mercotrace.service.dto.RoleDTO;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service Interface for managing {@link com.mercotrace.domain.Role}.
 */
public interface RoleService {
    /**
     * Save a role.
     *
     * @param roleDTO the entity to save.
     * @return the persisted entity.
     */
    RoleDTO save(RoleDTO roleDTO);

    /**
     * Updates a role.
     *
     * @param roleDTO the entity to update.
     * @return the persisted entity.
     */
    RoleDTO update(RoleDTO roleDTO);

    /**
     * Partially updates a role.
     *
     * @param roleDTO the entity to update partially.
     * @return the persisted entity.
     */
    Optional<RoleDTO> partialUpdate(RoleDTO roleDTO);

    /**
     * Get all the roles with eager load of many-to-many relationships.
     *
     * @param pageable the pagination information.
     * @return the list of entities.
     */
    Page<RoleDTO> findAllWithEagerRelationships(Pageable pageable);

    /**
     * Get the "id" role.
     *
     * @param id the id of the entity.
     * @return the entity.
     */
    Optional<RoleDTO> findOne(Long id);

    /**
     * Delete the "id" role.
     *
     * @param id the id of the entity.
     */
    void delete(Long id);

    /**
     * Assign permission(s) to role — Module 1 spec POST /roles/{id}/permissions.
     *
     * @param roleId        the role id.
     * @param permissionIds the permission ids to assign.
     * @return the updated role DTO.
     */
    RoleDTO addPermissionsToRole(Long roleId, Set<Long> permissionIds);

    /**
     * Remove permission from role — Module 1 spec DELETE /roles/{id}/permissions/{permId}.
     *
     * @param roleId       the role id.
     * @param permissionId the permission id to remove.
     */
    void removePermissionFromRole(Long roleId, Long permissionId);
}
