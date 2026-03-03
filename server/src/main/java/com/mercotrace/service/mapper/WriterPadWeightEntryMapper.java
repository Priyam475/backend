package com.mercotrace.service.mapper;

import com.mercotrace.domain.WriterPadWeightEntry;
import com.mercotrace.service.dto.WriterPadDTOs.WriterPadWeightEntryDTO;
import org.mapstruct.Mapper;

/**
 * Mapper for {@link WriterPadWeightEntry} and {@link WriterPadWeightEntryDTO}.
 */
@Mapper(componentModel = "spring")
public interface WriterPadWeightEntryMapper extends EntityMapper<WriterPadWeightEntryDTO, WriterPadWeightEntry> {}

