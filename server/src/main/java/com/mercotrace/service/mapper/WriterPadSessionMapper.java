package com.mercotrace.service.mapper;

import com.mercotrace.domain.WriterPadSession;
import com.mercotrace.service.dto.WriterPadDTOs.WriterPadSessionDTO;
import org.mapstruct.Mapper;

/**
 * Mapper for {@link WriterPadSession} and {@link WriterPadSessionDTO}.
 */
@Mapper(componentModel = "spring")
public interface WriterPadSessionMapper extends EntityMapper<WriterPadSessionDTO, WriterPadSession> {}

