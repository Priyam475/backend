package com.mercotrace.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mercotrace.domain.ChartOfAccount;
import com.mercotrace.domain.VoucherHeader;
import com.mercotrace.domain.VoucherLine;
import com.mercotrace.domain.enumeration.VoucherLifecycleStatus;
import com.mercotrace.domain.enumeration.VoucherType;
import com.mercotrace.repository.ChartOfAccountRepository;
import com.mercotrace.repository.VoucherHeaderRepository;
import com.mercotrace.repository.VoucherLineRepository;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.dto.VoucherHeaderCreateRequest;
import com.mercotrace.service.dto.VoucherHeaderDTO;
import com.mercotrace.service.dto.VoucherLineCreateDTO;
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

@ExtendWith(MockitoExtension.class)
class VoucherHeaderServiceImplTest {

    private static final long TRADER_ID = 101L;

    @Mock
    private VoucherHeaderRepository voucherHeaderRepository;

    @Mock
    private VoucherLineRepository voucherLineRepository;

    @Mock
    private ChartOfAccountRepository chartOfAccountRepository;

    @Mock
    private TraderContextService traderContextService;

    private VoucherHeaderServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new VoucherHeaderServiceImpl(
            voucherHeaderRepository,
            voucherLineRepository,
            chartOfAccountRepository,
            traderContextService,
            null
        );
    }

    @Test
    void getPageDelegatesToRepository() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        VoucherHeader header = new VoucherHeader();
        header.setId(1L);
        header.setTraderId(TRADER_ID);
        header.setVoucherType(VoucherType.JOURNAL);
        header.setVoucherNumber("VP/JV/001");
        header.setVoucherDate(LocalDate.now());
        header.setNarration("Test");
        header.setStatus(VoucherLifecycleStatus.DRAFT);
        header.setTotalDebit(BigDecimal.valueOf(100));
        header.setTotalCredit(BigDecimal.valueOf(100));
        header.setIsMigrated(false);
        when(voucherHeaderRepository.findAllByTraderIdAndFilters(
            eq(TRADER_ID), eq((VoucherType) null), eq((VoucherLifecycleStatus) null), eq((LocalDate) null), eq((LocalDate) null), eq((String) null), any()))
            .thenReturn(new PageImpl<>(List.of(header)));

        Page<VoucherHeaderDTO> page = service.getPage(
            PageRequest.of(0, 20), null, null, null, null, null);

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).getVoucherNumber()).isEqualTo("VP/JV/001");
        assertThat(page.getContent().get(0).getStatus()).isEqualTo(VoucherLifecycleStatus.DRAFT);
    }

    @Test
    void getByIdThrowsWhenNotFound() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        when(voucherHeaderRepository.findOneByIdAndTraderId(999L, TRADER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(999L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Voucher not found");
    }

    @Test
    void getByIdReturnsHeaderWithLines() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        VoucherHeader header = new VoucherHeader();
        header.setId(1L);
        header.setTraderId(TRADER_ID);
        header.setVoucherType(VoucherType.RECEIPT);
        header.setVoucherNumber("VP/RV/001");
        header.setVoucherDate(LocalDate.now());
        header.setNarration("Receipt");
        header.setStatus(VoucherLifecycleStatus.POSTED);
        header.setTotalDebit(BigDecimal.valueOf(5000));
        header.setTotalCredit(BigDecimal.valueOf(5000));
        header.setIsMigrated(false);
        when(voucherHeaderRepository.findOneByIdAndTraderId(1L, TRADER_ID)).thenReturn(Optional.of(header));
        VoucherLine line = new VoucherLine();
        line.setId(10L);
        line.setLedgerId(100L);
        line.setLedgerName("Cash");
        line.setDebit(BigDecimal.valueOf(5000));
        line.setCredit(BigDecimal.ZERO);
        when(voucherLineRepository.findAllByVoucherHeaderIdOrderById(1L)).thenReturn(List.of(line));

        VoucherHeaderDTO dto = service.getById(1L);

        assertThat(dto.getVoucherId()).isEqualTo("1");
        assertThat(dto.getVoucherNumber()).isEqualTo("VP/RV/001");
        assertThat(dto.getLines()).hasSize(1);
        assertThat(dto.getLines().get(0).getLedgerName()).isEqualTo("Cash");
        assertThat(dto.getLines().get(0).getDebit()).isEqualByComparingTo(BigDecimal.valueOf(5000));
    }

    @Test
    void createThrowsWhenNarrationBlank() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        VoucherHeaderCreateRequest request = new VoucherHeaderCreateRequest();
        request.setVoucherType(VoucherType.JOURNAL);
        request.setNarration("   ");
        request.setLines(List.of(lineReq(1L, BigDecimal.valueOf(100), BigDecimal.ZERO), lineReq(2L, BigDecimal.ZERO, BigDecimal.valueOf(100))));

        assertThatThrownBy(() -> service.create(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Narration is required");
    }

    @Test
    void createThrowsWhenNoLines() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        VoucherHeaderCreateRequest request = new VoucherHeaderCreateRequest();
        request.setVoucherType(VoucherType.JOURNAL);
        request.setNarration("Test");
        request.setLines(List.of());

        assertThatThrownBy(() -> service.create(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("At least one line");
    }

    @Test
    void createThrowsWhenLinesUnbalanced() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        VoucherHeaderCreateRequest request = new VoucherHeaderCreateRequest();
        request.setVoucherType(VoucherType.JOURNAL);
        request.setNarration("Test");
        request.setLines(List.of(
            lineReq(1L, BigDecimal.valueOf(100), BigDecimal.ZERO),
            lineReq(2L, BigDecimal.ZERO, BigDecimal.valueOf(50))
        ));

        assertThatThrownBy(() -> service.create(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("balanced");
    }

    @Test
    void createThrowsWhenLedgerNotFound() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        when(chartOfAccountRepository.findOneByTraderIdAndId(TRADER_ID, 1L)).thenReturn(Optional.empty());
        VoucherHeaderCreateRequest request = new VoucherHeaderCreateRequest();
        request.setVoucherType(VoucherType.JOURNAL);
        request.setNarration("Test");
        request.setLines(List.of(
            lineReq(1L, BigDecimal.valueOf(100), BigDecimal.ZERO),
            lineReq(2L, BigDecimal.ZERO, BigDecimal.valueOf(100))
        ));

        assertThatThrownBy(() -> service.create(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Ledger not found");
    }

    @Test
    void createPersistsHeaderAndLines() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        when(voucherHeaderRepository.countByTraderIdAndVoucherType(TRADER_ID, VoucherType.JOURNAL)).thenReturn(0L);
        when(voucherHeaderRepository.save(any(VoucherHeader.class))).thenAnswer(inv -> {
            VoucherHeader h = inv.getArgument(0);
            h.setId(1L);
            return h;
        });
        when(voucherLineRepository.save(any(VoucherLine.class))).thenAnswer(inv -> {
            VoucherLine l = inv.getArgument(0);
            l.setId(10L);
            return l;
        });
        ChartOfAccount ledger1 = new ChartOfAccount();
        ledger1.setId(1L);
        ledger1.setLedgerName("Cash");
        ChartOfAccount ledger2 = new ChartOfAccount();
        ledger2.setId(2L);
        ledger2.setLedgerName("Receivable");
        when(chartOfAccountRepository.findOneByTraderIdAndId(TRADER_ID, 1L)).thenReturn(Optional.of(ledger1));
        when(chartOfAccountRepository.findOneByTraderIdAndId(TRADER_ID, 2L)).thenReturn(Optional.of(ledger2));
        when(voucherHeaderRepository.findOneByIdAndTraderId(1L, TRADER_ID)).thenAnswer(inv -> {
            VoucherHeader h = new VoucherHeader();
            h.setId(1L);
            h.setTraderId(TRADER_ID);
            h.setVoucherType(VoucherType.JOURNAL);
            h.setVoucherNumber("VP/JV/001");
            h.setVoucherDate(LocalDate.now());
            h.setNarration("Test journal");
            h.setStatus(VoucherLifecycleStatus.DRAFT);
            h.setTotalDebit(BigDecimal.valueOf(100));
            h.setTotalCredit(BigDecimal.valueOf(100));
            h.setIsMigrated(false);
            return Optional.of(h);
        });
        when(voucherLineRepository.findAllByVoucherHeaderIdOrderById(1L)).thenReturn(List.of(
            createLine(10L, 1L, "Cash", BigDecimal.valueOf(100), BigDecimal.ZERO),
            createLine(11L, 2L, "Receivable", BigDecimal.ZERO, BigDecimal.valueOf(100))
        ));

        VoucherHeaderCreateRequest request = new VoucherHeaderCreateRequest();
        request.setVoucherType(VoucherType.JOURNAL);
        request.setNarration("Test journal");
        request.setLines(List.of(
            lineReq(1L, BigDecimal.valueOf(100), BigDecimal.ZERO),
            lineReq(2L, BigDecimal.ZERO, BigDecimal.valueOf(100))
        ));

        VoucherHeaderDTO result = service.create(request);

        assertThat(result.getVoucherId()).isEqualTo("1");
        assertThat(result.getVoucherNumber()).isEqualTo("VP/JV/001");
        assertThat(result.getStatus()).isEqualTo(VoucherLifecycleStatus.DRAFT);
        assertThat(result.getLines()).hasSize(2);
        verify(voucherHeaderRepository).save(any(VoucherHeader.class));
        verify(voucherLineRepository, times(2)).save(any(VoucherLine.class));
    }

    @Test
    void postThrowsWhenNotDraft() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        VoucherHeader header = new VoucherHeader();
        header.setId(1L);
        header.setStatus(VoucherLifecycleStatus.POSTED);
        when(voucherHeaderRepository.findOneByIdAndTraderId(1L, TRADER_ID)).thenReturn(Optional.of(header));

        assertThatThrownBy(() -> service.post(1L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Only DRAFT");
    }

    @Test
    void reverseThrowsWhenNotPosted() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        VoucherHeader header = new VoucherHeader();
        header.setId(1L);
        header.setStatus(VoucherLifecycleStatus.DRAFT);
        when(voucherHeaderRepository.findOneByIdAndTraderId(1L, TRADER_ID)).thenReturn(Optional.of(header));

        assertThatThrownBy(() -> service.reverse(1L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Only POSTED");
    }

    private static VoucherLineCreateDTO lineReq(Long ledgerId, BigDecimal debit, BigDecimal credit) {
        VoucherLineCreateDTO d = new VoucherLineCreateDTO();
        d.setLedgerId(ledgerId);
        d.setDebit(debit);
        d.setCredit(credit);
        return d;
    }

    private static VoucherLine createLine(Long id, Long ledgerId, String name, BigDecimal debit, BigDecimal credit) {
        VoucherLine l = new VoucherLine();
        l.setId(id);
        l.setLedgerId(ledgerId);
        l.setLedgerName(name);
        l.setDebit(debit);
        l.setCredit(credit);
        return l;
    }
}
