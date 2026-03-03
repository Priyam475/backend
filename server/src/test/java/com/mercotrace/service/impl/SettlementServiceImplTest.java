package com.mercotrace.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mercotrace.domain.Patti;
import com.mercotrace.repository.PattiRepository;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.dto.SettlementDTOs.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SettlementServiceImplTest {

    private static final long TRADER_ID = 101L;

    @Mock
    private TraderContextService traderContextService;

    @Mock
    private PattiRepository pattiRepository;

    @InjectMocks
    private SettlementServiceImpl settlementService;

    private PattiSaveRequest saveRequest;

    @BeforeEach
    void setUp() {
        lenient().when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);

        saveRequest = new PattiSaveRequest();
        saveRequest.setSellerId("S1");
        saveRequest.setSellerName("Test Seller");
        saveRequest.setGrossAmount(new BigDecimal("10000"));
        saveRequest.setTotalDeductions(new BigDecimal("500"));
        saveRequest.setNetPayable(new BigDecimal("9500"));
        saveRequest.setUseAverageWeight(false);
        RateClusterDTO rc = new RateClusterDTO();
        rc.setRate(new BigDecimal("100"));
        rc.setTotalQuantity(50);
        rc.setTotalWeight(new BigDecimal("2500"));
        rc.setAmount(new BigDecimal("250000"));
        saveRequest.setRateClusters(List.of(rc));
        DeductionItemDTO d = new DeductionItemDTO();
        d.setKey("freight");
        d.setLabel("Freight");
        d.setAmount(new BigDecimal("500"));
        d.setEditable(true);
        d.setAutoPulled(false);
        saveRequest.setDeductions(List.of(d));
    }

    @Test
    void createPattiPersistsEntityWithGeneratedPattiId() {
        final Patti[] savedRef = new Patti[1];
        when(pattiRepository.findTopByPattiIdStartingWithOrderByIdDesc(any())).thenReturn(Optional.empty());
        when(pattiRepository.save(any(Patti.class))).thenAnswer(inv -> {
            Patti p = inv.getArgument(0);
            p.setId(1L);
            if (p.getPattiId() == null) p.setPattiId("PT-20250302-0001");
            savedRef[0] = p;
            return p;
        });
        when(pattiRepository.findById(1L)).thenAnswer(inv -> Optional.ofNullable(savedRef[0]));

        PattiDTO result = settlementService.createPatti(saveRequest);

        assertThat(result).isNotNull();
        assertThat(result.getPattiId()).startsWith("PT-");
        assertThat(result.getSellerName()).isEqualTo("Test Seller");
        assertThat(result.getGrossAmount()).isEqualByComparingTo("10000");
        assertThat(result.getNetPayable()).isEqualByComparingTo("9500");
        assertThat(savedRef[0].getTraderId()).isEqualTo(TRADER_ID);
        assertThat(savedRef[0].getSellerName()).isEqualTo("Test Seller");
        verify(pattiRepository, org.mockito.Mockito.atLeastOnce()).save(any(Patti.class));
    }

    @Test
    void getPattiByIdReturnsEmptyWhenNotFound() {
        when(pattiRepository.findById(999L)).thenReturn(Optional.empty());
        assertThat(settlementService.getPattiById(999L)).isEmpty();
    }
}
