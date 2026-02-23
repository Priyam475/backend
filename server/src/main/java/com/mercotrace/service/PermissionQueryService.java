package com.mercotrace.service;

import com.mercotrace.domain.*; // for static metamodels
import com.mercotrace.domain.Permission;
import com.mercotrace.repository.PermissionRepository;
import com.mercotrace.service.criteria.PermissionCriteria;
import com.mercotrace.service.dto.PermissionDTO;
import com.mercotrace.service.mapper.PermissionMapper;
import jakarta.persistence.criteria.JoinType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.jhipster.service.QueryService;

/**
 * Service for executing complex queries for {@link Permission} entities in the database.
 * The main input is a {@link PermissionCriteria} which gets converted to {@link Specification},
 * in a way that all the filters must apply.
 * It returns a {@link Page} of {@link PermissionDTO} which fulfills the criteria.
 */
@Service
@Transactional(readOnly = true)
public class PermissionQueryService extends QueryService<Permission> {

    private static final Logger LOG = LoggerFactory.getLogger(PermissionQueryService.class);

    private final PermissionRepository permissionRepository;

    private final PermissionMapper permissionMapper;

    public PermissionQueryService(PermissionRepository permissionRepository, PermissionMapper permissionMapper) {
        this.permissionRepository = permissionRepository;
        this.permissionMapper = permissionMapper;
    }

    /**
     * Return a {@link Page} of {@link PermissionDTO} which matches the criteria from the database.
     * @param criteria The object which holds all the filters, which the entities should match.
     * @param page The page, which should be returned.
     * @return the matching entities.
     */
    @Transactional(readOnly = true)
    public Page<PermissionDTO> findByCriteria(PermissionCriteria criteria, Pageable page) {
        LOG.debug("find by criteria : {}, page: {}", criteria, page);
        final Specification<Permission> specification = createSpecification(criteria);
        return permissionRepository.findAll(specification, page).map(permissionMapper::toDto);
    }

    /**
     * Return the number of matching entities in the database.
     * @param criteria The object which holds all the filters, which the entities should match.
     * @return the number of matching entities.
     */
    @Transactional(readOnly = true)
    public long countByCriteria(PermissionCriteria criteria) {
        LOG.debug("count by criteria : {}", criteria);
        final Specification<Permission> specification = createSpecification(criteria);
        return permissionRepository.count(specification);
    }

    /**
     * Function to convert {@link PermissionCriteria} to a {@link Specification}
     * @param criteria The object which holds all the filters, which the entities should match.
     * @return the matching {@link Specification} of the entity.
     */
    protected Specification<Permission> createSpecification(PermissionCriteria criteria) {
        Specification<Permission> specification = Specification.where(null);
        if (criteria != null) {
            // This has to be called first, because the distinct method returns null
            specification = Specification.allOf(
                Boolean.TRUE.equals(criteria.getDistinct()) ? distinct(criteria.getDistinct()) : null,
                buildRangeSpecification(criteria.getId(), Permission_.id),
                buildStringSpecification(criteria.getPermissionName(), Permission_.permissionName),
                buildRangeSpecification(criteria.getCreatedAt(), Permission_.createdAt),
                buildSpecification(criteria.getRoleId(), root -> root.join(Permission_.roles, JoinType.LEFT).get(Role_.id))
            );
        }
        return specification;
    }
}
