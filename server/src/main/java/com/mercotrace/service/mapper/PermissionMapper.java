package com.mercotrace.service.mapper;

import com.mercotrace.domain.Permission;
import com.mercotrace.domain.Role;
import com.mercotrace.service.dto.PermissionDTO;
import com.mercotrace.service.dto.RoleDTO;
import java.util.Set;
import java.util.stream.Collectors;
import org.mapstruct.*;

/**
 * Mapper for the entity {@link Permission} and its DTO {@link PermissionDTO}.
 */
@Mapper(componentModel = "spring")
public interface PermissionMapper extends EntityMapper<PermissionDTO, Permission> {
    @Mapping(target = "roles", source = "roles", qualifiedByName = "roleIdSet")
    PermissionDTO toDto(Permission s);

    @Mapping(target = "roles", ignore = true)
    @Mapping(target = "removeRole", ignore = true)
    Permission toEntity(PermissionDTO permissionDTO);

    @Named("roleId")
    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "id", source = "id")
    RoleDTO toDtoRoleId(Role role);

    @Named("roleIdSet")
    default Set<RoleDTO> toDtoRoleIdSet(Set<Role> role) {
        return role.stream().map(this::toDtoRoleId).collect(Collectors.toSet());
    }
}
