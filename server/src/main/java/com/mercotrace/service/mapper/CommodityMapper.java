package com.mercotrace.service.mapper;

import com.mercotrace.domain.Commodity;
import com.mercotrace.service.dto.CommodityDTO;
import org.mapstruct.*;

/**
 * Mapper for the entity {@link Commodity} and its DTO {@link CommodityDTO}.
 */
@Mapper(componentModel = "spring")
public interface CommodityMapper extends EntityMapper<CommodityDTO, Commodity> {}
