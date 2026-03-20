package com.mercotrace.service.mapper;

import com.mercotrace.domain.Contact;
import com.mercotrace.service.dto.ContactDTO;
import org.mapstruct.*;

/**
 * Mapper for the entity {@link Contact} and its DTO {@link ContactDTO}.
 */
@Mapper(componentModel = "spring")
public interface ContactMapper extends EntityMapper<ContactDTO, Contact> {

    @Mapping(target = "portalSignupLinked", ignore = true)
    @Override
    ContactDTO toDto(Contact entity);

}

