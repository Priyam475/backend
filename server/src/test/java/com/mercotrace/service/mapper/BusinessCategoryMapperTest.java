package com.mercotrace.service.mapper;

import static com.mercotrace.domain.BusinessCategoryAsserts.*;
import static com.mercotrace.domain.BusinessCategoryTestSamples.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class BusinessCategoryMapperTest {

    private BusinessCategoryMapper businessCategoryMapper;

    @BeforeEach
    void setUp() {
        businessCategoryMapper = new BusinessCategoryMapperImpl();
    }

    @Test
    void shouldConvertToDtoAndBack() {
        var expected = getBusinessCategorySample1();
        var actual = businessCategoryMapper.toEntity(businessCategoryMapper.toDto(expected));
        assertBusinessCategoryAllPropertiesEquals(expected, actual);
    }
}
