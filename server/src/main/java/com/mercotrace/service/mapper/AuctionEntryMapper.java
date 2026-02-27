package com.mercotrace.service.mapper;

import com.mercotrace.domain.AuctionEntry;
import com.mercotrace.service.dto.AuctionEntryDTO;
import org.mapstruct.Mapper;

/**
 * Mapper for {@link AuctionEntry} and {@link AuctionEntryDTO}.
 */
@Mapper(componentModel = "spring")
public interface AuctionEntryMapper extends EntityMapper<AuctionEntryDTO, AuctionEntry> {}

