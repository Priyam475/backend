package com.mercotrace.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mercotrace.domain.BillNumberSequence;
import com.mercotrace.domain.SalesBill;
import com.mercotrace.domain.Trader;
import com.mercotrace.repository.BillNumberSequenceRepository;
import com.mercotrace.repository.SalesBillRepository;
import com.mercotrace.repository.TraderRepository;
import com.mercotrace.repository.VoucherRepository;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.dto.SalesBillDTOs.CommodityGroupDTO;
import com.mercotrace.service.dto.SalesBillDTOs.SalesBillCreateOrUpdateRequest;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SalesBillServiceImplTest {

    private static final long TRADER_ID = 101L;
    private static final String BILL_PREFIX = "GV";

    @Mock
    private TraderContextService traderContextService;
    @Mock
    private SalesBillRepository salesBillRepository;
    @Mock
    private TraderRepository traderRepository;
    @Mock
    private BillNumberSequenceRepository billNumberSequenceRepository;
    @Mock
    private VoucherRepository voucherRepository;

    private SalesBillServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new SalesBillServiceImpl(
            traderContextService,
            salesBillRepository,
            traderRepository,
            billNumberSequenceRepository,
            voucherRepository,
            new ObjectMapper()
        );
    }

    @Test
    void createAssignsBillNumberFromTraderPrefix() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        Trader trader = new Trader();
        trader.setId(TRADER_ID);
        trader.setBillPrefix(BILL_PREFIX);
        when(traderRepository.findById(TRADER_ID)).thenReturn(Optional.of(trader));

        BillNumberSequence seq = new BillNumberSequence();
        seq.setPrefix(BILL_PREFIX);
        seq.setNextValue(1L);
        when(billNumberSequenceRepository.findByPrefixForUpdate(BILL_PREFIX)).thenReturn(Optional.of(seq));
        when(salesBillRepository.save(any(SalesBill.class))).thenAnswer(inv -> {
            SalesBill b = inv.getArgument(0);
            b.setId(1L);
            return b;
        });

        SalesBillCreateOrUpdateRequest request = new SalesBillCreateOrUpdateRequest();
        request.setBuyerName("Buyer One");
        request.setBuyerMark("B1");
        request.setBillingName("Buyer One");
        request.setBillDate(Instant.now().toString());
        request.setGrandTotal(BigDecimal.valueOf(1000));
        CommodityGroupDTO group = new CommodityGroupDTO();
        group.setCommodityName("Wheat");
        group.setSubtotal(BigDecimal.valueOf(1000));
        group.setItems(List.of());
        request.setCommodityGroups(List.of(group));

        service.create(request);

        ArgumentCaptor<SalesBill> billCaptor = ArgumentCaptor.forClass(SalesBill.class);
        verify(salesBillRepository).save(billCaptor.capture());
        assertThat(billCaptor.getValue().getBillNumber()).isEqualTo("GV-00001");
    }

    @Test
    void getByIdThrowsWhenBillNotFound() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        when(salesBillRepository.findByIdWithGroupsAndVersions(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(999L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("not found");
    }
}
