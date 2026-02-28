package com.mercotrace.service.mapper;

import com.mercotrace.domain.SelfSaleClosure;
import com.mercotrace.service.dto.SelfSaleDTOs.ClosureDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Mapper for {@link SelfSaleClosure} to {@link ClosureDTO}.
 * Display fields (lotName, commodityName, sellerName, quantity, amount) are set by the service from Lot/Contact/Commodity.
 */
@Mapper(componentModel = "spring")
public interface SelfSaleClosureMapper {

    @Mapping(target = "lotName", ignore = true)
    @Mapping(target = "commodityName", ignore = true)
    @Mapping(target = "sellerName", ignore = true)
    @Mapping(target = "quantity", ignore = true)
    @Mapping(target = "amount", ignore = true)
    @Mapping(source = "appliedRate", target = "rate")
    @Mapping(source = "businessMode", target = "mode")
    ClosureDTO toDto(SelfSaleClosure entity);
}
