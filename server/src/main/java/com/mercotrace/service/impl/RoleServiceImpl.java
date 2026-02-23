package com.mercotrace.service.impl;

import com.mercotrace.domain.Permission;
import com.mercotrace.domain.Role;
import com.mercotrace.repository.PermissionRepository;
import com.mercotrace.repository.RoleRepository;
import com.mercotrace.service.RoleService;
import com.mercotrace.service.dto.RoleDTO;
import com.mercotrace.service.mapper.RoleMapper;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service Implementation for managing {@link com.mercotrace.domain.Role}.
 */
@Service
@Transactional
public class RoleServiceImpl implements RoleService {

    private static final Logger LOG = LoggerFactory.getLogger(RoleServiceImpl.class);

    private final RoleRepository roleRepository;

    private final RoleMapper roleMapper;

    private final PermissionRepository permissionRepository;

    public RoleServiceImpl(RoleRepository roleRepository, RoleMapper roleMapper, PermissionRepository permissionRepository) {
        this.roleRepository = roleRepository;
        this.roleMapper = roleMapper;
        this.permissionRepository = permissionRepository;
    }

    @Override
    public RoleDTO save(RoleDTO roleDTO) {
        LOG.debug("Request to save Role : {}", roleDTO);
        Role role = roleMapper.toEntity(roleDTO);
        role = roleRepository.save(role);
        return roleMapper.toDto(role);
    }

    @Override
    public RoleDTO update(RoleDTO roleDTO) {
        LOG.debug("Request to update Role : {}", roleDTO);
        Role role = roleMapper.toEntity(roleDTO);
        role = roleRepository.save(role);
        return roleMapper.toDto(role);
    }

    @Override
    public Optional<RoleDTO> partialUpdate(RoleDTO roleDTO) {
        LOG.debug("Request to partially update Role : {}", roleDTO);

        return roleRepository
            .findById(roleDTO.getId())
            .map(existingRole -> {
                roleMapper.partialUpdate(existingRole, roleDTO);

                return existingRole;
            })
            .map(roleRepository::save)
            .map(roleMapper::toDto);
    }

    public Page<RoleDTO> findAllWithEagerRelationships(Pageable pageable) {
        return roleRepository.findAllWithEagerRelationships(pageable).map(roleMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<RoleDTO> findOne(Long id) {
        LOG.debug("Request to get Role : {}", id);
        return roleRepository.findOneWithEagerRelationships(id).map(roleMapper::toDto);
    }

    @Override
    public void delete(Long id) {
        LOG.debug("Request to delete Role : {}", id);
        roleRepository.deleteById(id);
    }

    @Override
    @Transactional
    public RoleDTO addPermissionsToRole(Long roleId, Set<Long> permissionIds) {
        Role role = roleRepository.findOneWithEagerRelationships(roleId).orElseThrow();
        for (Long permId : permissionIds) {
            Permission p = permissionRepository.findById(permId).orElseThrow();
            role.getPermissions().add(p);
        }
        role = roleRepository.save(role);
        return roleMapper.toDto(role);
    }

    @Override
    @Transactional
    public void removePermissionFromRole(Long roleId, Long permissionId) {
        Role role = roleRepository.findOneWithEagerRelationships(roleId).orElseThrow();
        role.getPermissions().removeIf(p -> p.getId().equals(permissionId));
        roleRepository.save(role);
    }
}
