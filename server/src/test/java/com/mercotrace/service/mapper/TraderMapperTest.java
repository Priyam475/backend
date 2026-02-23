package com.mercotrace.service.mapper;

import static com.mercotrace.domain.TraderAsserts.*;
import static com.mercotrace.domain.TraderTestSamples.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TraderMapperTest {

    private TraderMapper traderMapper;

    @BeforeEach
    void setUp() {
        traderMapper = new TraderMapperImpl();
    }

    @Test
    void shouldConvertToDtoAndBack() {
        var expected = getTraderSample1();
        var actual = traderMapper.toEntity(traderMapper.toDto(expected));
        assertTraderAllPropertiesEquals(expected, actual);
    }
}
