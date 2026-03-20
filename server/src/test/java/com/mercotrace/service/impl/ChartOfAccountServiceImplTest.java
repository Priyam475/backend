package com.mercotrace.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mercotrace.domain.ChartOfAccount;
import com.mercotrace.domain.enumeration.VoucherLifecycleStatus;
import com.mercotrace.repository.ChartOfAccountRepository;
import com.mercotrace.repository.ContactRepository;
import com.mercotrace.repository.VoucherLineRepository;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.dto.ChartOfAccountCreateRequest;
import com.mercotrace.service.dto.ChartOfAccountDTO;
import com.mercotrace.service.dto.ChartOfAccountUpdateRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class ChartOfAccountServiceImplTest {

    private static final long TRADER_ID = 101L;

    @Mock
    private ChartOfAccountRepository repository;

    @Mock
    private VoucherLineRepository voucherLineRepository;

    @Mock
    private ContactRepository contactRepository;

    @Mock
    private TraderContextService traderContextService;

    private ChartOfAccountServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ChartOfAccountServiceImpl(repository, voucherLineRepository, contactRepository, traderContextService);
    }

    @Test
    void getPageDelegatesToRepository() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        ChartOfAccount entity = new ChartOfAccount();
        entity.setId(1L);
        entity.setTraderId(TRADER_ID);
        entity.setLedgerName("Test");
        entity.setAccountingClass("ASSET");
        entity.setClassification("BANK");
        entity.setSystem(false);
        entity.setLocked(false);
        entity.setOpeningBalance(BigDecimal.ZERO);
        entity.setCurrentBalance(BigDecimal.ZERO);
        when(repository.findAllByTraderIdAndFilters(TRADER_ID, null, null, null, PageRequest.of(0, 10)))
            .thenReturn(new PageImpl<>(java.util.List.of(entity)));

        Page<ChartOfAccountDTO> page = service.getPage(PageRequest.of(0, 10), null, null, null);

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).getLedgerName()).isEqualTo("Test");
    }

    @Test
    void createThrowsWhenDuplicateName() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        ChartOfAccountCreateRequest request = new ChartOfAccountCreateRequest();
        request.setLedgerName("Existing");
        request.setClassification("EXPENSE");
        when(repository.findOneByTraderIdAndLedgerNameIgnoreCase(TRADER_ID, "Existing"))
            .thenReturn(Optional.of(new ChartOfAccount()));

        assertThatThrownBy(() -> service.create(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("already exists");
    }

    @Test
    void createMapsClassificationToAccountingClass() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        when(repository.findOneByTraderIdAndLedgerNameIgnoreCase(TRADER_ID, "New Ledger")).thenReturn(Optional.empty());
        when(repository.save(any(ChartOfAccount.class))).thenAnswer(inv -> {
            ChartOfAccount e = inv.getArgument(0);
            e.setId(1L);
            return e;
        });
        ChartOfAccountCreateRequest request = new ChartOfAccountCreateRequest();
        request.setLedgerName("New Ledger");
        request.setClassification("RECEIVABLE");
        request.setOpeningBalance(BigDecimal.ZERO);

        ChartOfAccountDTO result = service.create(request);

        assertThat(result.getAccountingClass()).isEqualTo("ASSET");
        assertThat(result.getClassification()).isEqualTo("RECEIVABLE");
        verify(repository).save(any(ChartOfAccount.class));
    }

    @Test
    void deleteThrowsWhenSystemLedger() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        ChartOfAccount entity = new ChartOfAccount();
        entity.setId(1L);
        entity.setSystem(true);
        when(repository.findOneByTraderIdAndId(TRADER_ID, 1L)).thenReturn(Optional.of(entity));

        assertThatThrownBy(() -> service.delete(1L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("cannot be deleted");
    }

    @Test
    void getOpeningBalanceReturnsStoredWhenAsOfDateNull() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        ChartOfAccount entity = new ChartOfAccount();
        entity.setId(1L);
        entity.setTraderId(TRADER_ID);
        entity.setOpeningBalance(new BigDecimal("100.00"));
        entity.setAccountingClass("ASSET");
        when(repository.findOneByTraderIdAndId(TRADER_ID, 1L)).thenReturn(Optional.of(entity));

        BigDecimal result = service.getOpeningBalance(1L, null);

        assertThat(result).isEqualByComparingTo("100.00");
    }

    @Test
    void getOpeningBalanceReturnsStoredPlusSumForAsset() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        ChartOfAccount entity = new ChartOfAccount();
        entity.setId(1L);
        entity.setTraderId(TRADER_ID);
        entity.setOpeningBalance(new BigDecimal("100.00"));
        entity.setAccountingClass("ASSET");
        when(repository.findOneByTraderIdAndId(TRADER_ID, 1L)).thenReturn(Optional.of(entity));
        when(voucherLineRepository.sumDebitMinusCreditByLedgerIdAndVoucherDateBefore(
            TRADER_ID, 1L, LocalDate.of(2025, 3, 1), VoucherLifecycleStatus.REVERSED
        )).thenReturn(new BigDecimal("50.00"));

        BigDecimal result = service.getOpeningBalance(1L, LocalDate.of(2025, 3, 1));

        assertThat(result).isEqualByComparingTo("150.00");
    }

    @Test
    void getOpeningBalanceReturnsStoredMinusSumForLiability() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        ChartOfAccount entity = new ChartOfAccount();
        entity.setId(1L);
        entity.setTraderId(TRADER_ID);
        entity.setOpeningBalance(new BigDecimal("200.00"));
        entity.setAccountingClass("LIABILITY");
        when(repository.findOneByTraderIdAndId(TRADER_ID, 1L)).thenReturn(Optional.of(entity));
        when(voucherLineRepository.sumDebitMinusCreditByLedgerIdAndVoucherDateBefore(
            TRADER_ID, 1L, LocalDate.of(2025, 3, 1), VoucherLifecycleStatus.REVERSED
        )).thenReturn(new BigDecimal("30.00"));

        BigDecimal result = service.getOpeningBalance(1L, LocalDate.of(2025, 3, 1));

        assertThat(result).isEqualByComparingTo("170.00");
    }
}
