package com.mercotrace.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mercotrace.domain.ChartOfAccount;
import com.mercotrace.domain.VoucherHeader;
import com.mercotrace.domain.VoucherLine;
import com.mercotrace.domain.enumeration.VoucherLifecycleStatus;
import com.mercotrace.domain.enumeration.VoucherType;
import com.mercotrace.repository.ChartOfAccountRepository;
import com.mercotrace.repository.ContactRepository;
import com.mercotrace.repository.VoucherLineRepository;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.dto.VoucherLineDTO;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

/**
 * Unit tests for {@link VoucherLineServiceImpl}.
 * Financial Reports module: voucher lines by date range for trial balance and commodity P&amp;L.
 */
@ExtendWith(MockitoExtension.class)
class VoucherLineServiceImplTest {

    private static final long TRADER_ID = 101L;

    @Mock
    private VoucherLineRepository voucherLineRepository;

    @Mock
    private ChartOfAccountRepository chartOfAccountRepository;

    @Mock
    private ContactRepository contactRepository;

    @Mock
    private TraderContextService traderContextService;

    private VoucherLineServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new VoucherLineServiceImpl(voucherLineRepository, chartOfAccountRepository, contactRepository, traderContextService);
    }

    @Test
    void getLinesByDateRangeDelegatesToRepositoryAndMapsToDto() {
        LocalDate from = LocalDate.of(2025, 1, 1);
        LocalDate to = LocalDate.of(2025, 1, 31);
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        VoucherHeader header = new VoucherHeader();
        header.setId(1L);
        header.setTraderId(TRADER_ID);
        header.setVoucherType(VoucherType.JOURNAL);
        header.setVoucherDate(from);
        VoucherLine line = new VoucherLine();
        line.setId(10L);
        line.setVoucherHeader(header);
        line.setLedgerId(100L);
        line.setLedgerName("Cash");
        line.setDebit(BigDecimal.valueOf(5000));
        line.setCredit(BigDecimal.ZERO);
        when(voucherLineRepository.findAllByTraderIdAndVoucherDateBetween(TRADER_ID, from, to))
            .thenReturn(List.of(line));

        List<VoucherLineDTO> result = service.getLinesByDateRange(from, to);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getLineId()).isEqualTo("10");
        assertThat(result.get(0).getVoucherId()).isEqualTo("1");
        assertThat(result.get(0).getLedgerId()).isEqualTo("100");
        assertThat(result.get(0).getLedgerName()).isEqualTo("Cash");
        assertThat(result.get(0).getDebit()).isEqualByComparingTo(BigDecimal.valueOf(5000));
        assertThat(result.get(0).getCredit()).isEqualByComparingTo(BigDecimal.ZERO);
        verify(voucherLineRepository).findAllByTraderIdAndVoucherDateBetween(eq(TRADER_ID), eq(from), eq(to));
    }

    @Test
    void getLinesByDateRangePaginatedDelegatesToRepositoryAndMapsToDto() {
        LocalDate from = LocalDate.of(2025, 2, 1);
        LocalDate to = LocalDate.of(2025, 2, 28);
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        VoucherHeader header = new VoucherHeader();
        header.setId(2L);
        header.setTraderId(TRADER_ID);
        VoucherLine line = new VoucherLine();
        line.setId(20L);
        line.setVoucherHeader(header);
        line.setLedgerId(200L);
        line.setLedgerName("Receivable");
        line.setDebit(BigDecimal.ZERO);
        line.setCredit(BigDecimal.valueOf(3000));
        PageRequest pageable = PageRequest.of(0, 50);
        when(voucherLineRepository.findPageByTraderIdAndVoucherDateBetween(TRADER_ID, from, to, pageable))
            .thenReturn(new PageImpl<>(List.of(line), pageable, 1));

        Page<VoucherLineDTO> page = service.getLinesByDateRange(from, to, pageable);

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).getLineId()).isEqualTo("20");
        assertThat(page.getContent().get(0).getLedgerName()).isEqualTo("Receivable");
        assertThat(page.getTotalElements()).isEqualTo(1);
        verify(voucherLineRepository).findPageByTraderIdAndVoucherDateBetween(eq(TRADER_ID), eq(from), eq(to), eq(pageable));
    }

    @Test
    void getLinesByDateRangeReturnsEmptyWhenNoLines() {
        LocalDate from = LocalDate.of(2025, 3, 1);
        LocalDate to = LocalDate.of(2025, 3, 31);
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        when(voucherLineRepository.findAllByTraderIdAndVoucherDateBetween(TRADER_ID, from, to))
            .thenReturn(List.of());

        List<VoucherLineDTO> result = service.getLinesByDateRange(from, to);

        assertThat(result).isEmpty();
    }

    @Test
    void getLinesByLedgerAndDateRangeDelegatesToRepositoryAndMapsToDto() {
        Long ledgerId = 50L;
        LocalDate from = LocalDate.of(2025, 1, 1);
        LocalDate to = LocalDate.of(2025, 1, 31);
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        ChartOfAccount ledger = new ChartOfAccount();
        ledger.setId(ledgerId);
        when(chartOfAccountRepository.findOneByTraderIdAndId(TRADER_ID, ledgerId)).thenReturn(Optional.of(ledger));
        VoucherHeader header = new VoucherHeader();
        header.setId(1L);
        header.setVoucherType(VoucherType.JOURNAL);
        header.setVoucherNumber("JV-001");
        header.setVoucherDate(from);
        header.setNarration("Test narration");
        header.setStatus(VoucherLifecycleStatus.POSTED);
        VoucherLine line = new VoucherLine();
        line.setId(10L);
        line.setVoucherHeader(header);
        line.setLedgerId(ledgerId);
        line.setLedgerName("Cash");
        line.setDebit(BigDecimal.valueOf(5000));
        line.setCredit(BigDecimal.ZERO);
        when(voucherLineRepository.findAllByTraderIdAndLedgerIdAndVoucherDateBetween(TRADER_ID, ledgerId, from, to))
            .thenReturn(List.of(line));

        List<VoucherLineDTO> result = service.getLinesByLedgerAndDateRange(ledgerId, from, to);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getLineId()).isEqualTo("10");
        assertThat(result.get(0).getVoucherDate()).isEqualTo(from);
        assertThat(result.get(0).getVoucherNumber()).isEqualTo("JV-001");
        assertThat(result.get(0).getVoucherType()).isEqualTo("JOURNAL");
        assertThat(result.get(0).getNarration()).isEqualTo("Test narration");
        assertThat(result.get(0).getStatus()).isEqualTo("POSTED");
        verify(voucherLineRepository).findAllByTraderIdAndLedgerIdAndVoucherDateBetween(eq(TRADER_ID), eq(ledgerId), eq(from), eq(to));
    }

    @Test
    void getLinesByLedgerAndDateRangeThrowsWhenLedgerNotFound() {
        Long ledgerId = 999L;
        LocalDate from = LocalDate.of(2025, 1, 1);
        LocalDate to = LocalDate.of(2025, 1, 31);
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        when(chartOfAccountRepository.findOneByTraderIdAndId(TRADER_ID, ledgerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getLinesByLedgerAndDateRange(ledgerId, from, to))
            .isInstanceOf(com.mercotrace.web.rest.errors.BadRequestAlertException.class)
            .hasMessageContaining("Ledger not found");
    }
}
