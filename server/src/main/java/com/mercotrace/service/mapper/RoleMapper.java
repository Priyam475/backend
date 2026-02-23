package com.mercotrace.service.mapper;

import com.mercotrace.domain.Permission;
import com.mercotrace.domain.Role;
import com.mercotrace.service.dto.PermissionDTO;
import com.mercotrace.service.dto.RoleDTO;
import java.util.Set;
import java.util.stream.Collectors;
import org.mapstruct.*;

/**
 * Mapper for the entity {@link Role} and its DTO {@link RoleDTO}.
 */
@Mapper(componentModel = "spring")
public interface RoleMapper extends EntityMapper<RoleDTO, Role> {
    @Mapping(target = "permissions", source = "permissions", qualifiedByName = "permissionIdSet")
    RoleDTO toDto(Role s);

    @Mapping(target = "removePermission", ignore = true)
    Role toEntity(RoleDTO roleDTO);

    @Named("permissionId")
    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "id", source = "id")
    PermissionDTO toDtoPermissionId(Permission permission);

    @Named("permissionIdSet")
    default Set<PermissionDTO> toDtoPermissionIdSet(Set<Permission> permission) {
        return permission.stream().map(this::toDtoPermissionId).collect(Collectors.toSet());
    }
}
