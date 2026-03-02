package com.mercotrace.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

import com.mercotrace.domain.ArApDocument;
import com.mercotrace.domain.ChartOfAccount;
import com.mercotrace.domain.VoucherHeader;
import com.mercotrace.domain.VoucherLine;
import com.mercotrace.domain.enumeration.ArApType;
import com.mercotrace.repository.ArApDocumentRepository;
import com.mercotrace.repository.ChartOfAccountRepository;
import com.mercotrace.repository.VoucherLineRepository;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.dto.AgingBucketDTO;
import com.mercotrace.service.dto.CommodityProfitRowDTO;
import com.mercotrace.service.dto.PLRowDTO;
import com.mercotrace.service.dto.TrialBalanceRowDTO;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.quality.Strictness;
import org.mockito.junit.jupiter.MockitoSettings;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

/**
 * Unit tests for {@link ReportsServiceImpl}.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ReportsServiceImplTest {

    private static final long TRADER_ID = 101L;

    @Mock
    private ChartOfAccountRepository chartOfAccountRepository;

    @Mock
    private VoucherLineRepository voucherLineRepository;

    @Mock
    private ArApDocumentRepository arApDocumentRepository;

    @Mock
    private TraderContextService traderContextService;

    private ReportsServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ReportsServiceImpl(chartOfAccountRepository, voucherLineRepository, arApDocumentRepository, traderContextService);
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
    }

    @Test
    void getTrialBalanceComputesDebitAndCreditCorrectly() {
        LocalDate from = LocalDate.of(2025, 1, 1);
        LocalDate to = LocalDate.of(2025, 1, 31);
        ChartOfAccount cash = new ChartOfAccount();
        cash.setId(1L);
        cash.setTraderId(TRADER_ID);
        cash.setLedgerName("Cash");
        cash.setAccountingClass("ASSET");
        cash.setClassification("CASH");
        cash.setOpeningBalance(BigDecimal.ZERO);

        ChartOfAccount income = new ChartOfAccount();
        income.setId(2L);
        income.setTraderId(TRADER_ID);
        income.setLedgerName("Sales");
        income.setAccountingClass("INCOME");
        income.setClassification("INCOME");
        income.setOpeningBalance(BigDecimal.ZERO);

        Page<ChartOfAccount> ledgerPage = new PageImpl<>(List.of(cash, income), PageRequest.of(0, 200), 2);
        when(chartOfAccountRepository.findAllByTraderId(eq(TRADER_ID), any())).thenReturn(ledgerPage);

        VoucherHeader header = new VoucherHeader();
        header.setId(10L);
        header.setTraderId(TRADER_ID);
        header.setVoucherDate(from);

        VoucherLine l1 = new VoucherLine();
        l1.setId(100L);
        l1.setVoucherHeader(header);
        l1.setLedgerId(1L);
        l1.setDebit(BigDecimal.valueOf(5000));
        l1.setCredit(BigDecimal.ZERO);

        VoucherLine l2 = new VoucherLine();
        l2.setId(101L);
        l2.setVoucherHeader(header);
        l2.setLedgerId(2L);
        l2.setDebit(BigDecimal.ZERO);
        l2.setCredit(BigDecimal.valueOf(5000));

        when(voucherLineRepository.findAllByTraderIdAndVoucherDateBetween(TRADER_ID, from, to))
            .thenReturn(List.of(l1, l2));

        List<TrialBalanceRowDTO> rows = service.getTrialBalance(from, to);

        assertThat(rows).hasSize(2);
        TrialBalanceRowDTO cashRow = rows.stream().filter(r -> "Cash".equals(r.getLedgerName())).findFirst().orElseThrow();
        TrialBalanceRowDTO incomeRow = rows.stream().filter(r -> "Sales".equals(r.getLedgerName())).findFirst().orElseThrow();
        assertThat(cashRow.getDebit()).isEqualByComparingTo(BigDecimal.valueOf(5000));
        assertThat(cashRow.getCredit()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(incomeRow.getCredit()).isEqualByComparingTo(BigDecimal.valueOf(5000));
    }

    @Test
    void getProfitAndLossUsesCurrentBalances() {
        ChartOfAccount income = new ChartOfAccount();
        income.setId(1L);
        income.setTraderId(TRADER_ID);
        income.setLedgerName("Commission Income");
        income.setAccountingClass("INCOME");
        income.setCurrentBalance(BigDecimal.valueOf(120000));

        ChartOfAccount expense = new ChartOfAccount();
        expense.setId(2L);
        expense.setTraderId(TRADER_ID);
        expense.setLedgerName("Coolie Expense");
        expense.setAccountingClass("EXPENSE");
        expense.setCurrentBalance(BigDecimal.valueOf(30000));

        Page<ChartOfAccount> ledgerPage = new PageImpl<>(List.of(income, expense), PageRequest.of(0, 200), 2);
        when(chartOfAccountRepository.findAllByTraderId(eq(TRADER_ID), any())).thenReturn(ledgerPage);

        List<PLRowDTO> rows = service.getProfitAndLoss();

        assertThat(rows).hasSize(2);
        assertThat(rows.stream().map(PLRowDTO::getCategory)).containsExactlyInAnyOrder("INCOME", "EXPENSE");
    }

    @Test
    void getAgingBucketsOutstandingByContact() {
        LocalDate docDate = LocalDate.now().minusDays(40);
        ArApDocument doc = new ArApDocument();
        doc.setId(1L);
        doc.setTraderId(TRADER_ID);
        com.mercotrace.domain.Contact contact = new com.mercotrace.domain.Contact();
        contact.setId(5L);
        contact.setName("Vijay Traders");
        doc.setContact(contact);
        doc.setLedgerId(100L);
        doc.setType(com.mercotrace.domain.enumeration.ArApType.AR);
        doc.setOriginalAmount(BigDecimal.valueOf(50000));
        doc.setOutstandingBalance(BigDecimal.valueOf(20000));
        doc.setDocumentDate(docDate);

        Page<ArApDocument> page = new PageImpl<>(List.of(doc), PageRequest.of(0, 200), 1);
        when(arApDocumentRepository.findAllByTraderIdAndTypeAndStatus(eq(TRADER_ID), eq(ArApType.AR), eq(null), any()))
            .thenReturn(page);

        List<AgingBucketDTO> buckets = service.getAging(ArApType.AR);

        assertThat(buckets).hasSize(1);
        AgingBucketDTO bucket = buckets.get(0);
        assertThat(bucket.getContactName()).isEqualTo("Vijay Traders");
        assertThat(bucket.getDays60().add(bucket.getDays30()).add(bucket.getDays90()).add(bucket.getOver90()).add(bucket.getCurrent()))
            .isEqualByComparingTo(bucket.getTotal());
    }

    @Test
    void getCommodityProfitAggregatesIncomeAndExpense() {
        LocalDate from = LocalDate.of(2025, 1, 1);
        LocalDate to = LocalDate.of(2025, 1, 31);

        ChartOfAccount income = new ChartOfAccount();
        income.setId(1L);
        income.setAccountingClass("INCOME");

        ChartOfAccount expense = new ChartOfAccount();
        expense.setId(2L);
        expense.setAccountingClass("EXPENSE");

        Page<ChartOfAccount> ledgerPage = new PageImpl<>(List.of(income, expense), PageRequest.of(0, 200), 2);
        when(chartOfAccountRepository.findAllByTraderId(eq(TRADER_ID), any())).thenReturn(ledgerPage);

        VoucherHeader header = new VoucherHeader();
        header.setId(10L);

        VoucherLine incomeLine = new VoucherLine();
        incomeLine.setVoucherHeader(header);
        incomeLine.setLedgerId(1L);
        incomeLine.setCommodityName("Onion");
        incomeLine.setDebit(BigDecimal.ZERO);
        incomeLine.setCredit(BigDecimal.valueOf(100000));

        VoucherLine expenseLine = new VoucherLine();
        expenseLine.setVoucherHeader(header);
        expenseLine.setLedgerId(2L);
        expenseLine.setCommodityName("Onion");
        expenseLine.setDebit(BigDecimal.valueOf(60000));
        expenseLine.setCredit(BigDecimal.ZERO);

        when(voucherLineRepository.findAllByTraderIdAndVoucherDateBetween(TRADER_ID, from, to))
            .thenReturn(List.of(incomeLine, expenseLine));

        List<CommodityProfitRowDTO> rows = service.getCommodityProfit(from, to);

        assertThat(rows).hasSize(1);
        CommodityProfitRowDTO row = rows.get(0);
        assertThat(row.getCommodityName()).isEqualTo("Onion");
        assertThat(row.getIncome()).isEqualByComparingTo(BigDecimal.valueOf(100000));
        assertThat(row.getExpenses()).isEqualByComparingTo(BigDecimal.valueOf(60000));
        assertThat(row.getProfit()).isEqualByComparingTo(BigDecimal.valueOf(40000));
    }

    @Test
    void getTrialBalanceValidatesDateRange() {
        LocalDate from = LocalDate.of(2025, 2, 1);
        LocalDate to = LocalDate.of(2025, 1, 31);
        assertThatThrownBy(() -> service.getTrialBalance(from, to))
            .isInstanceOf(IllegalArgumentException.class);
    }
}

