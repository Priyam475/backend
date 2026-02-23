package com.mercotrace.service.mapper;

import com.mercotrace.domain.BusinessCategory;
import com.mercotrace.service.dto.BusinessCategoryDTO;
import org.mapstruct.*;

/**
 * Mapper for the entity {@link BusinessCategory} and its DTO {@link BusinessCategoryDTO}.
 */
@Mapper(componentModel = "spring")
public interface BusinessCategoryMapper extends EntityMapper<BusinessCategoryDTO, BusinessCategory> {}
