package com.mercotrace.web.rest;

import com.mercotrace.domain.Role;
import com.mercotrace.repository.RoleRepository;
import com.mercotrace.service.RoleQueryService;
import com.mercotrace.service.RoleService;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.criteria.RoleCriteria;
import com.mercotrace.service.dto.PermissionDTO;
import com.mercotrace.service.dto.RoleDTO;
import com.mercotrace.service.mapper.RoleMapper;
import com.mercotrace.web.rest.errors.BadRequestAlertException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import tech.jhipster.web.util.HeaderUtil;
import tech.jhipster.web.util.PaginationUtil;
import tech.jhipster.web.util.ResponseUtil;

/**
 * REST controller for managing {@link com.mercotrace.domain.Role}.
 */
@RestController
@RequestMapping("/api/roles")
public class RoleResource {

    private static final Logger LOG = LoggerFactory.getLogger(RoleResource.class);

    private static final String ENTITY_NAME = "role";

    @Value("${jhipster.clientApp.name}")
    private String applicationName;

    private final RoleService roleService;

    private final RoleRepository roleRepository;

    private final RoleQueryService roleQueryService;

    private final TraderContextService traderContextService;

    private final RoleMapper roleMapper;

    public RoleResource(
        RoleService roleService,
        RoleRepository roleRepository,
        RoleQueryService roleQueryService,
        TraderContextService traderContextService,
        RoleMapper roleMapper
    ) {
        this.roleService = roleService;
        this.roleRepository = roleRepository;
        this.roleQueryService = roleQueryService;
        this.traderContextService = traderContextService;
        this.roleMapper = roleMapper;
    }

    /**
     * {@code POST  /roles} : Create a new role.
     * When the current user has a trader context, the role is scoped to that trader.
     *
     * @param roleDTO the roleDTO to create.
     * @return the {@link ResponseEntity} with status {@code 201 (Created)} and with body the new roleDTO, or with status {@code 400 (Bad Request)} if the role has already an ID.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PostMapping("")
    public ResponseEntity<RoleDTO> createRole(@Valid @RequestBody RoleDTO roleDTO) throws URISyntaxException {
        LOG.debug("REST request to save Role : {}", roleDTO);
        if (roleDTO.getId() != null) {
            throw new BadRequestAlertException("A new role cannot already have an ID", ENTITY_NAME, "idexists");
        }
        traderContextService.getCurrentTraderIdOptional().ifPresent(roleDTO::setTraderId);
        roleDTO = roleService.save(roleDTO);
        return ResponseEntity.created(new URI("/api/roles/" + roleDTO.getId()))
            .headers(HeaderUtil.createEntityCreationAlert(applicationName, true, ENTITY_NAME, roleDTO.getId().toString()))
            .body(roleDTO);
    }

    /**
     * {@code PUT  /roles/:id} : Updates an existing role.
     *
     * @param id the id of the roleDTO to save.
     * @param roleDTO the roleDTO to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated roleDTO,
     * or with status {@code 400 (Bad Request)} if the roleDTO is not valid,
     * or with status {@code 500 (Internal Server Error)} if the roleDTO couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PutMapping("/{id}")
    public ResponseEntity<RoleDTO> updateRole(
        @PathVariable(value = "id", required = false) final Long id,
        @Valid @RequestBody RoleDTO roleDTO
    ) throws URISyntaxException {
        LOG.debug("REST request to update Role : {}, {}", id, roleDTO);
        if (roleDTO.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, roleDTO.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        if (!roleRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        Optional<Long> traderIdOpt = traderContextService.getCurrentTraderIdOptional();
        if (traderIdOpt.isPresent()) {
            Role existing = roleRepository.findById(id).orElseThrow();
            if (existing.getTraderId() == null || !existing.getTraderId().equals(traderIdOpt.get())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            roleDTO.setTraderId(traderIdOpt.get());
        }

        roleDTO = roleService.update(roleDTO);
        return ResponseEntity.ok()
            .headers(HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, roleDTO.getId().toString()))
            .body(roleDTO);
    }

    /**
     * {@code PATCH  /roles/:id} : Partial updates given fields of an existing role, field will ignore if it is null
     *
     * @param id the id of the roleDTO to save.
     * @param roleDTO the roleDTO to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated roleDTO,
     * or with status {@code 400 (Bad Request)} if the roleDTO is not valid,
     * or with status {@code 404 (Not Found)} if the roleDTO is not found,
     * or with status {@code 500 (Internal Server Error)} if the roleDTO couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PatchMapping(value = "/{id}", consumes = { "application/json", "application/merge-patch+json" })
    public ResponseEntity<RoleDTO> partialUpdateRole(
        @PathVariable(value = "id", required = false) final Long id,
        @NotNull @RequestBody RoleDTO roleDTO
    ) throws URISyntaxException {
        LOG.debug("REST request to partial update Role partially : {}, {}", id, roleDTO);
        if (roleDTO.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, roleDTO.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        if (!roleRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        Optional<Long> traderIdOpt = traderContextService.getCurrentTraderIdOptional();
        if (traderIdOpt.isPresent()) {
            Role existing = roleRepository.findById(id).orElseThrow();
            if (existing.getTraderId() == null || !existing.getTraderId().equals(traderIdOpt.get())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        Optional<RoleDTO> result = roleService.partialUpdate(roleDTO);

        return ResponseUtil.wrapOrNotFound(
            result,
            HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, roleDTO.getId().toString())
        );
    }

    /**
     * {@code GET  /roles} : get all the roles.
     * When the current user has a trader context, only roles for that trader are returned.
     *
     * @param pageable the pagination information.
     * @param criteria the criteria which the requested entities should match.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the list of roles in body.
     */
    @GetMapping("")
    public ResponseEntity<List<RoleDTO>> getAllRoles(
        RoleCriteria criteria,
        @org.springdoc.core.annotations.ParameterObject Pageable pageable
    ) {
        LOG.debug("REST request to get Roles by criteria: {}", criteria);

        Optional<Long> traderIdOpt = traderContextService.getCurrentTraderIdOptional();
        if (traderIdOpt.isPresent()) {
            // When called in a trader context, eagerly fetch permissions to avoid LazyInitializationException.
            List<Role> roles = roleRepository.fetchBagRelationships(roleRepository.findByTraderId(traderIdOpt.get()));
            List<RoleDTO> content = roles.stream().map(roleMapper::toDto).collect(Collectors.toList());
            return ResponseEntity.ok().body(content);
        }

        Page<RoleDTO> page = roleQueryService.findByCriteria(criteria, pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    /**
     * {@code GET  /roles/count} : count all the roles.
     * When the current user has a trader context, only roles for that trader are counted.
     *
     * @param criteria the criteria which the requested entities should match.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the count in body.
     */
    @GetMapping("/count")
    public ResponseEntity<Long> countRoles(RoleCriteria criteria) {
        LOG.debug("REST request to count Roles by criteria: {}", criteria);
        Optional<Long> traderIdOpt = traderContextService.getCurrentTraderIdOptional();
        if (traderIdOpt.isPresent()) {
            long count = roleRepository.findByTraderId(traderIdOpt.get()).size();
            return ResponseEntity.ok().body(count);
        }
        return ResponseEntity.ok().body(roleQueryService.countByCriteria(criteria));
    }

    /**
     * {@code GET  /roles/:id} : get the "id" role.
     * When the current user has a trader context, returns 403 if the role belongs to another trader.
     *
     * @param id the id of the roleDTO to retrieve.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the roleDTO, or with status {@code 404 (Not Found)} or {@code 403 (Forbidden)}.
     */
    @GetMapping("/{id}")
    public ResponseEntity<RoleDTO> getRole(@PathVariable("id") Long id) {
        LOG.debug("REST request to get Role : {}", id);
        Optional<Long> traderIdOpt = traderContextService.getCurrentTraderIdOptional();
        if (traderIdOpt.isPresent()) {
            Optional<Role> roleOpt = roleRepository.findById(id);
            if (roleOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            Role role = roleOpt.get();
            if (role.getTraderId() == null || !role.getTraderId().equals(traderIdOpt.get())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            return ResponseEntity.ok(roleMapper.toDto(role));
        }
        Optional<RoleDTO> roleDTO = roleService.findOne(id);
        return ResponseUtil.wrapOrNotFound(roleDTO);
    }

    /**
     * {@code DELETE  /roles/:id} : delete the "id" role.
     * When the current user has a trader context, returns 403 if the role belongs to another trader.
     *
     * @param id the id of the roleDTO to delete.
     * @return the {@link ResponseEntity} with status {@code 204 (NO_CONTENT)} or {@code 403 (Forbidden)}.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRole(@PathVariable("id") Long id) {
        LOG.debug("REST request to delete Role : {}", id);
        Optional<Long> traderIdOpt = traderContextService.getCurrentTraderIdOptional();
        if (traderIdOpt.isPresent()) {
            Optional<Role> roleOpt = roleRepository.findById(id);
            if (roleOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            Role role = roleOpt.get();
            if (role.getTraderId() == null || !role.getTraderId().equals(traderIdOpt.get())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        roleService.delete(id);
        return ResponseEntity.noContent()
            .headers(HeaderUtil.createEntityDeletionAlert(applicationName, true, ENTITY_NAME, id.toString()))
            .build();
    }

    /**
     * {@code GET  /roles/:id/permissions} : get permissions for role — Module 1 spec.
     * When the current user has a trader context, returns 403 if the role belongs to another trader.
     */
    @GetMapping("/{id}/permissions")
    public ResponseEntity<Set<PermissionDTO>> getRolePermissions(@PathVariable("id") Long id) {
        Optional<Long> traderIdOpt = traderContextService.getCurrentTraderIdOptional();
        if (traderIdOpt.isPresent()) {
            Optional<Role> roleOpt = roleRepository.findById(id);
            if (roleOpt.isEmpty()) return ResponseEntity.notFound().build();
            Role role = roleOpt.get();
            if (role.getTraderId() == null || !role.getTraderId().equals(traderIdOpt.get())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        return roleService
            .findOne(id)
            .map(RoleDTO::getPermissions)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * {@code POST  /roles/:id/permissions} : assign permissions to role — Module 1 spec. Body: array of permission ids.
     * When the current user has a trader context, returns 403 if the role belongs to another trader.
     */
    @PostMapping("/{id}/permissions")
    public ResponseEntity<RoleDTO> assignPermissionsToRole(
        @PathVariable("id") Long id,
        @RequestBody List<Long> permissionIds
    ) {
        if (!roleRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        Optional<Long> traderIdOpt = traderContextService.getCurrentTraderIdOptional();
        if (traderIdOpt.isPresent()) {
            Role role = roleRepository.findById(id).orElseThrow();
            if (role.getTraderId() == null || !role.getTraderId().equals(traderIdOpt.get())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        Set<Long> ids = permissionIds != null ? permissionIds.stream().filter(Objects::nonNull).collect(Collectors.toSet()) : Set.of();
        RoleDTO updated = roleService.addPermissionsToRole(id, ids);
        return ResponseEntity.ok(updated);
    }

    /**
     * {@code DELETE  /roles/:id/permissions/:permId} : remove permission from role — Module 1 spec.
     * When the current user has a trader context, returns 403 if the role belongs to another trader.
     */
    @DeleteMapping("/{id}/permissions/{permId}")
    public ResponseEntity<Void> removePermissionFromRole(@PathVariable("id") Long id, @PathVariable("permId") Long permId) {
        if (!roleRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        Optional<Long> traderIdOpt = traderContextService.getCurrentTraderIdOptional();
        if (traderIdOpt.isPresent()) {
            Role role = roleRepository.findById(id).orElseThrow();
            if (role.getTraderId() == null || !role.getTraderId().equals(traderIdOpt.get())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        roleService.removePermissionFromRole(id, permId);
        return ResponseEntity.noContent().build();
    }
}
