package com.mercotrace.service.impl;

import com.mercotrace.domain.ArApDocument;
import com.mercotrace.domain.ChartOfAccount;
import com.mercotrace.domain.VoucherLine;
import com.mercotrace.domain.enumeration.ArApType;
import com.mercotrace.repository.ArApDocumentRepository;
import com.mercotrace.repository.ChartOfAccountRepository;
import com.mercotrace.repository.VoucherLineRepository;
import com.mercotrace.service.ReportsService;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.dto.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementation of {@link ReportsService}.
 * Uses existing accounting aggregates (ChartOfAccount, VoucherHeader/VoucherLine, ArApDocument).
 */
@Service
@Transactional(readOnly = true)
public class ReportsServiceImpl implements ReportsService {

    private static final Logger LOG = LoggerFactory.getLogger(ReportsServiceImpl.class);

    /** Trial balance cache per trader + voucher date range. */
    public static final String CACHE_TRIAL_BALANCE_BY_TRADER_AND_DATE_RANGE = "reportsTrialBalanceByTraderAndDateRange";

    /** Profit & loss cache per trader (uses current ledger balances). */
    public static final String CACHE_PL_BY_TRADER = "reportsProfitAndLossByTrader";

    /** Balance sheet cache per trader (uses current ledger balances). */
    public static final String CACHE_BALANCE_SHEET_BY_TRADER = "reportsBalanceSheetByTrader";

    /** AR/AP aging cache per trader + type. */
    public static final String CACHE_AGING_BY_TRADER_AND_TYPE = "reportsAgingByTraderAndType";

    /** Commodity profitability cache per trader + voucher date range. */
    public static final String CACHE_COMMODITY_PROFIT_BY_TRADER_AND_DATE_RANGE = "reportsCommodityProfitByTraderAndDateRange";

    private static final int PAGE_SIZE_LEDGER = 200;
    private static final int PAGE_SIZE_ARAP = 200;

    private final ChartOfAccountRepository chartOfAccountRepository;
    private final VoucherLineRepository voucherLineRepository;
    private final ArApDocumentRepository arApDocumentRepository;
    private final TraderContextService traderContextService;

    public ReportsServiceImpl(
        ChartOfAccountRepository chartOfAccountRepository,
        VoucherLineRepository voucherLineRepository,
        ArApDocumentRepository arApDocumentRepository,
        TraderContextService traderContextService
    ) {
        this.chartOfAccountRepository = chartOfAccountRepository;
        this.voucherLineRepository = voucherLineRepository;
        this.arApDocumentRepository = arApDocumentRepository;
        this.traderContextService = traderContextService;
    }

    @Override
    @Cacheable(
        cacheNames = CACHE_TRIAL_BALANCE_BY_TRADER_AND_DATE_RANGE,
        keyGenerator = "reportsKeyGenerator",
        unless = "#result == null || #result.isEmpty()"
    )
    public List<TrialBalanceRowDTO> getTrialBalance(LocalDate dateFrom, LocalDate dateTo) {
        LocalDate from = requireDate(dateFrom, "dateFrom");
        LocalDate to = requireDate(dateTo, "dateTo");
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("dateTo must be on or after dateFrom");
        }
        Long traderId = traderContextService.getCurrentTraderId();

        List<ChartOfAccount> ledgers = loadAllLedgers(traderId);
        List<VoucherLine> lines = voucherLineRepository.findAllByTraderIdAndVoucherDateBetween(traderId, from, to);

        Map<Long, List<VoucherLine>> linesByLedger = new HashMap<>();
        for (VoucherLine line : lines) {
            if (line.getLedgerId() == null) {
                continue;
            }
            linesByLedger.computeIfAbsent(line.getLedgerId(), k -> new ArrayList<>()).add(line);
        }

        List<TrialBalanceRowDTO> rows = new ArrayList<>();
        for (ChartOfAccount ledger : ledgers) {
            if ("CONTROL".equalsIgnoreCase(ledger.getClassification())) {
                continue;
            }
            List<VoucherLine> ledgerLines = linesByLedger.getOrDefault(ledger.getId(), List.of());
            BigDecimal totalDebit = BigDecimal.ZERO;
            BigDecimal totalCredit = BigDecimal.ZERO;
            for (VoucherLine l : ledgerLines) {
                totalDebit = totalDebit.add(safeAmount(l.getDebit()));
                totalCredit = totalCredit.add(safeAmount(l.getCredit()));
            }
            boolean isDebitNature =
                "ASSET".equalsIgnoreCase(ledger.getAccountingClass()) ||
                "EXPENSE".equalsIgnoreCase(ledger.getAccountingClass());
            BigDecimal opening = safeAmount(ledger.getOpeningBalance());
            BigDecimal closingBalance = isDebitNature
                ? opening.add(totalDebit).subtract(totalCredit)
                : opening.add(totalCredit).subtract(totalDebit);

            BigDecimal debit = BigDecimal.ZERO;
            BigDecimal credit = BigDecimal.ZERO;
            if (isDebitNature && closingBalance.compareTo(BigDecimal.ZERO) > 0) {
                debit = closingBalance;
            } else if (!isDebitNature && closingBalance.compareTo(BigDecimal.ZERO) > 0) {
                credit = closingBalance;
            } else if (!isDebitNature && closingBalance.compareTo(BigDecimal.ZERO) < 0) {
                debit = closingBalance.abs();
            } else if (isDebitNature && closingBalance.compareTo(BigDecimal.ZERO) < 0) {
                credit = closingBalance.abs();
            }
            if (debit.compareTo(BigDecimal.ZERO) <= 0 && credit.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            TrialBalanceRowDTO dto = new TrialBalanceRowDTO();
            dto.setLedgerId(ledger.getId() != null ? ledger.getId().toString() : null);
            dto.setLedgerName(ledger.getLedgerName());
            dto.setAccountingClass(ledger.getAccountingClass());
            dto.setDebit(debit);
            dto.setCredit(credit);
            rows.add(dto);
        }
        return rows;
    }

    @Override
    @Cacheable(
        cacheNames = CACHE_PL_BY_TRADER,
        keyGenerator = "reportsKeyGenerator",
        unless = "#result == null || #result.isEmpty()"
    )
    public List<PLRowDTO> getProfitAndLoss() {
        Long traderId = traderContextService.getCurrentTraderId();
        List<ChartOfAccount> ledgers = loadAllLedgers(traderId);
        List<PLRowDTO> rows = new ArrayList<>();
        for (ChartOfAccount ledger : ledgers) {
            String cls = ledger.getAccountingClass();
            if (!"INCOME".equalsIgnoreCase(cls) && !"EXPENSE".equalsIgnoreCase(cls)) {
                continue;
            }
            BigDecimal current = safeAmount(ledger.getCurrentBalance());
            if (current.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            PLRowDTO dto = new PLRowDTO();
            dto.setCategory(cls.toUpperCase());
            dto.setLedgerName(ledger.getLedgerName());
            dto.setAmount(current);
            rows.add(dto);
        }
        return rows;
    }

    @Override
    @Cacheable(
        cacheNames = CACHE_BALANCE_SHEET_BY_TRADER,
        keyGenerator = "reportsKeyGenerator",
        unless = "#result == null || #result.isEmpty()"
    )
    public List<BalanceSheetRowDTO> getBalanceSheet() {
        Long traderId = traderContextService.getCurrentTraderId();
        List<ChartOfAccount> ledgers = loadAllLedgers(traderId);
        List<BalanceSheetRowDTO> rows = new ArrayList<>();
        for (ChartOfAccount ledger : ledgers) {
            String cls = ledger.getAccountingClass();
            if (
                !"ASSET".equalsIgnoreCase(cls) &&
                !"LIABILITY".equalsIgnoreCase(cls) &&
                !"EQUITY".equalsIgnoreCase(cls)
            ) {
                continue;
            }
            if ("CONTROL".equalsIgnoreCase(ledger.getClassification())) {
                continue;
            }
            BigDecimal current = safeAmount(ledger.getCurrentBalance());
            if (current.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            BalanceSheetRowDTO dto = new BalanceSheetRowDTO();
            dto.setCategory(cls.toUpperCase());
            dto.setLedgerName(ledger.getLedgerName());
            dto.setAmount(current);
            rows.add(dto);
        }
        return rows;
    }

    @Override
    @Cacheable(
        cacheNames = CACHE_AGING_BY_TRADER_AND_TYPE,
        keyGenerator = "reportsKeyGenerator",
        unless = "#result == null || #result.isEmpty()"
    )
    public List<AgingBucketDTO> getAging(ArApType type) {
        if (type == null) {
            throw new IllegalArgumentException("type is required (AR or AP)");
        }
        Long traderId = traderContextService.getCurrentTraderId();
        Pageable pageable = PageRequest.of(0, PAGE_SIZE_ARAP);
        Page<ArApDocument> page = arApDocumentRepository.findAllByTraderIdAndTypeAndStatus(
            traderId,
            type,
            null,
            pageable
        );
        List<ArApDocument> all = new ArrayList<>(page.getContent());
        while (page.hasNext()) {
            pageable = page.nextPageable();
            page = arApDocumentRepository.findAllByTraderIdAndTypeAndStatus(
                traderId,
                type,
                null,
                pageable
            );
            all.addAll(page.getContent());
        }

        Map<String, AgingBucketDTO> byContact = new LinkedHashMap<>();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        for (ArApDocument d : all) {
            BigDecimal outstanding = safeAmount(d.getOutstandingBalance());
            if (outstanding.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            String contactName = d.getContact() != null && d.getContact().getName() != null
                ? d.getContact().getName()
                : "";
            AgingBucketDTO bucket = byContact.computeIfAbsent(contactName, k -> {
                AgingBucketDTO dto = new AgingBucketDTO();
                dto.setContactName(k);
                dto.setCurrent(BigDecimal.ZERO);
                dto.setDays30(BigDecimal.ZERO);
                dto.setDays60(BigDecimal.ZERO);
                dto.setDays90(BigDecimal.ZERO);
                dto.setOver90(BigDecimal.ZERO);
                dto.setTotal(BigDecimal.ZERO);
                return dto;
            });

            LocalDate docDate = d.getDocumentDate() != null ? d.getDocumentDate() : today;
            long days = java.time.temporal.ChronoUnit.DAYS.between(docDate, today);
            if (days <= 0) {
                bucket.setCurrent(bucket.getCurrent().add(outstanding));
            } else if (days <= 30) {
                bucket.setDays30(bucket.getDays30().add(outstanding));
            } else if (days <= 60) {
                bucket.setDays60(bucket.getDays60().add(outstanding));
            } else if (days <= 90) {
                bucket.setDays90(bucket.getDays90().add(outstanding));
            } else {
                bucket.setOver90(bucket.getOver90().add(outstanding));
            }
            bucket.setTotal(bucket.getTotal().add(outstanding));
        }
        return new ArrayList<>(byContact.values());
    }

    @Override
    @Cacheable(
        cacheNames = CACHE_COMMODITY_PROFIT_BY_TRADER_AND_DATE_RANGE,
        keyGenerator = "reportsKeyGenerator",
        unless = "#result == null || #result.isEmpty()"
    )
    public List<CommodityProfitRowDTO> getCommodityProfit(LocalDate dateFrom, LocalDate dateTo) {
        LocalDate from = requireDate(dateFrom, "dateFrom");
        LocalDate to = requireDate(dateTo, "dateTo");
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("dateTo must be on or after dateFrom");
        }
        Long traderId = traderContextService.getCurrentTraderId();
        List<VoucherLine> lines = voucherLineRepository.findAllByTraderIdAndVoucherDateBetween(traderId, from, to);
        if (lines.isEmpty()) {
            return List.of();
        }

        // Load ledgers once for accountingClass lookup.
        List<ChartOfAccount> ledgers = loadAllLedgers(traderId);
        Map<Long, String> ledgerClassById = new HashMap<>();
        for (ChartOfAccount ledger : ledgers) {
            if (ledger.getId() != null) {
                ledgerClassById.put(ledger.getId(), ledger.getAccountingClass());
            }
        }

        // Group voucher lines by voucher header id for later aggregation.
        Map<Long, List<VoucherLine>> linesByVoucher = new HashMap<>();
        for (VoucherLine line : lines) {
            if (line.getVoucherHeader() == null || line.getVoucherHeader().getId() == null) {
                continue;
            }
            Long vId = line.getVoucherHeader().getId();
            linesByVoucher.computeIfAbsent(vId, k -> new ArrayList<>()).add(line);
        }

        // Map commodity -> set of voucher ids.
        Map<String, Set<Long>> commodityVoucherIds = new LinkedHashMap<>();
        for (VoucherLine line : lines) {
            if (line.getCommodityName() == null || line.getVoucherHeader() == null || line.getVoucherHeader().getId() == null) {
                continue;
            }
            String name = line.getCommodityName();
            Long vId = line.getVoucherHeader().getId();
            commodityVoucherIds.computeIfAbsent(name, k -> new LinkedHashSet<>()).add(vId);
        }

        Map<String, CommodityProfitRowDTO> profitByCommodity = new LinkedHashMap<>();
        for (Map.Entry<String, Set<Long>> entry : commodityVoucherIds.entrySet()) {
            String commodityName = entry.getKey();
            CommodityProfitRowDTO dto = new CommodityProfitRowDTO();
            dto.setCommodityName(commodityName);
            dto.setIncome(BigDecimal.ZERO);
            dto.setExpenses(BigDecimal.ZERO);
            dto.setProfit(BigDecimal.ZERO);

            for (Long voucherId : entry.getValue()) {
                List<VoucherLine> voucherLines = linesByVoucher.getOrDefault(voucherId, List.of());
                for (VoucherLine l : voucherLines) {
                    String cls = ledgerClassById.get(l.getLedgerId());
                    if ("INCOME".equalsIgnoreCase(cls)) {
                        dto.setIncome(dto.getIncome().add(safeAmount(l.getCredit())));
                    } else if ("EXPENSE".equalsIgnoreCase(cls)) {
                        dto.setExpenses(dto.getExpenses().add(safeAmount(l.getDebit())));
                    }
                }
            }
            dto.setProfit(dto.getIncome().subtract(dto.getExpenses()));
            profitByCommodity.put(commodityName, dto);
        }
        return new ArrayList<>(profitByCommodity.values());
    }

    private List<ChartOfAccount> loadAllLedgers(Long traderId) {
        List<ChartOfAccount> ledgers = new ArrayList<>();
        Pageable pageable = PageRequest.of(0, PAGE_SIZE_LEDGER);
        Page<ChartOfAccount> page = chartOfAccountRepository.findAllByTraderId(traderId, pageable);
        ledgers.addAll(page.getContent());
        while (page.hasNext()) {
            pageable = page.nextPageable();
            page = chartOfAccountRepository.findAllByTraderId(traderId, pageable);
            ledgers.addAll(page.getContent());
        }
        return ledgers;
    }

    private static LocalDate requireDate(LocalDate value, String field) {
        if (value == null) {
            throw new IllegalArgumentException(field + " is required");
        }
        return value;
    }

    private static BigDecimal safeAmount(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}

