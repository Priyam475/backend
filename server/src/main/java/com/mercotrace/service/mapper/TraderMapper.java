package com.mercotrace.service.mapper;

import com.mercotrace.domain.Trader;
import com.mercotrace.service.dto.TraderDTO;
import org.mapstruct.*;

/**
 * Mapper for the entity {@link Trader} and its DTO {@link TraderDTO}.
 */
@Mapper(componentModel = "spring")
public interface TraderMapper extends EntityMapper<TraderDTO, Trader> {}
