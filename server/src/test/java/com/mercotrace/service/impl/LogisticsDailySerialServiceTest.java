package com.mercotrace.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mercotrace.domain.DailySerialAllocation;
import com.mercotrace.repository.DailySerialAllocationRepository;
import com.mercotrace.service.LogisticsDailySerialService;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.LogisticsDailySerialService.DailySerialsResponse;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LogisticsDailySerialServiceTest {

    private static final long TRADER_ID = 101L;

    @Mock
    private DailySerialAllocationRepository repository;

    @Mock
    private TraderContextService traderContextService;

    private LogisticsDailySerialService service;

    @BeforeEach
    void setUp() {
        service = new LogisticsDailySerialService(repository, traderContextService);
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
    }

    @Test
    void allocate_withNullLists_returnsEmptyMaps() {
        DailySerialsResponse response = service.allocate(null, null);

        assertThat(response.getSellerSerials()).isEmpty();
        assertThat(response.getLotNumbers()).isEmpty();
        verify(repository).findAllByTraderIdAndSerialDateAndKeyType(
            TRADER_ID,
            LocalDate.now(),
            "SELLER"
        );
        verify(repository).findAllByTraderIdAndSerialDateAndKeyType(
            TRADER_ID,
            LocalDate.now(),
            "LOT"
        );
    }

    @Test
    void allocate_assignsSerialsForNewSellersAndLotsStartingFromOne() {
        when(repository.findAllByTraderIdAndSerialDateAndKeyType(any(), any(), any())).thenReturn(List.of());

        List<String> sellerNames = List.of(" Seller A ", "Seller B", "Seller A", "", "   ");
        List<String> lotIds = List.of("1001", "1002", "1001");

        DailySerialsResponse response = service.allocate(sellerNames, lotIds);

        Map<String, Integer> sellerSerials = response.getSellerSerials();
        Map<String, Integer> lotNumbers = response.getLotNumbers();

        assertThat(sellerSerials).containsOnlyKeys("Seller A", "Seller B");
        assertThat(sellerSerials.get("Seller A")).isEqualTo(1);
        assertThat(sellerSerials.get("Seller B")).isEqualTo(2);

        assertThat(lotNumbers).containsOnlyKeys("1001", "1002");
        assertThat(lotNumbers.get("1001")).isEqualTo(1);
        assertThat(lotNumbers.get("1002")).isEqualTo(2);
    }

    @Test
    void allocate_reusesExistingSerialsAndAppendsNewOnes() {
        LocalDate today = LocalDate.now();

        DailySerialAllocation existingSeller = new DailySerialAllocation();
        existingSeller.setTraderId(TRADER_ID);
        existingSeller.setSerialDate(today);
        existingSeller.setKeyType("SELLER");
        existingSeller.setKeyValue("Existing Seller");
        existingSeller.setSerialNumber(5);

        DailySerialAllocation existingLot = new DailySerialAllocation();
        existingLot.setTraderId(TRADER_ID);
        existingLot.setSerialDate(today);
        existingLot.setKeyType("LOT");
        existingLot.setKeyValue("2001");
        existingLot.setSerialNumber(7);

        when(repository.findAllByTraderIdAndSerialDateAndKeyType(TRADER_ID, today, "SELLER"))
            .thenReturn(List.of(existingSeller));
        when(repository.findAllByTraderIdAndSerialDateAndKeyType(TRADER_ID, today, "LOT"))
            .thenReturn(List.of(existingLot));

        List<String> sellers = List.of("Existing Seller", "New Seller");
        List<String> lots = List.of("2001", "3001");

        DailySerialsResponse response = service.allocate(sellers, lots);

        assertThat(response.getSellerSerials().get("Existing Seller")).isEqualTo(5);
        assertThat(response.getSellerSerials().get("New Seller")).isEqualTo(6);
        assertThat(response.getLotNumbers().get("2001")).isEqualTo(7);
        assertThat(response.getLotNumbers().get("3001")).isEqualTo(8);
    }
}

