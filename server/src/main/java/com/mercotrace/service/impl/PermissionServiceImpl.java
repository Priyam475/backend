package com.mercotrace.service.impl;

import com.mercotrace.domain.Permission;
import com.mercotrace.repository.PermissionRepository;
import com.mercotrace.service.PermissionService;
import com.mercotrace.service.dto.PermissionDTO;
import com.mercotrace.service.mapper.PermissionMapper;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service Implementation for managing {@link com.mercotrace.domain.Permission}.
 */
@Service
@Transactional
public class PermissionServiceImpl implements PermissionService {

    private static final Logger LOG = LoggerFactory.getLogger(PermissionServiceImpl.class);

    private final PermissionRepository permissionRepository;

    private final PermissionMapper permissionMapper;

    public PermissionServiceImpl(PermissionRepository permissionRepository, PermissionMapper permissionMapper) {
        this.permissionRepository = permissionRepository;
        this.permissionMapper = permissionMapper;
    }

    @Override
    public PermissionDTO save(PermissionDTO permissionDTO) {
        LOG.debug("Request to save Permission : {}", permissionDTO);
        Permission permission = permissionMapper.toEntity(permissionDTO);
        permission = permissionRepository.save(permission);
        return permissionMapper.toDto(permission);
    }

    @Override
    public PermissionDTO update(PermissionDTO permissionDTO) {
        LOG.debug("Request to update Permission : {}", permissionDTO);
        Permission permission = permissionMapper.toEntity(permissionDTO);
        permission = permissionRepository.save(permission);
        return permissionMapper.toDto(permission);
    }

    @Override
    public Optional<PermissionDTO> partialUpdate(PermissionDTO permissionDTO) {
        LOG.debug("Request to partially update Permission : {}", permissionDTO);

        return permissionRepository
            .findById(permissionDTO.getId())
            .map(existingPermission -> {
                permissionMapper.partialUpdate(existingPermission, permissionDTO);

                return existingPermission;
            })
            .map(permissionRepository::save)
            .map(permissionMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PermissionDTO> findOne(Long id) {
        LOG.debug("Request to get Permission : {}", id);
        return permissionRepository.findById(id).map(permissionMapper::toDto);
    }

    @Override
    public void delete(Long id) {
        LOG.debug("Request to delete Permission : {}", id);
        permissionRepository.deleteById(id);
    }
}
