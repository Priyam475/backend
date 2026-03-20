package com.mercotrace.service.impl;

import com.mercotrace.domain.ChartOfAccount;
import com.mercotrace.domain.VoucherHeader;
import com.mercotrace.domain.VoucherLine;
import com.mercotrace.domain.enumeration.VoucherLifecycleStatus;
import com.mercotrace.domain.enumeration.VoucherType;
import com.mercotrace.repository.ChartOfAccountRepository;
import com.mercotrace.repository.VoucherHeaderRepository;
import com.mercotrace.repository.VoucherLineRepository;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.VoucherHeaderService;
import com.mercotrace.service.dto.VoucherHeaderCreateRequest;
import com.mercotrace.service.dto.VoucherHeaderDTO;
import com.mercotrace.service.dto.VoucherLineCreateDTO;
import com.mercotrace.service.dto.VoucherLineDTO;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class VoucherHeaderServiceImpl implements VoucherHeaderService {

    private static final Logger LOG = LoggerFactory.getLogger(VoucherHeaderServiceImpl.class);

    private static final String VOUCHER_NUMBER_PREFIX = "VP/";

    private static final java.util.Map<VoucherType, String> TYPE_PREFIX = new java.util.HashMap<>();
    static {
        TYPE_PREFIX.put(VoucherType.RECEIPT, "RV");
        TYPE_PREFIX.put(VoucherType.PAYMENT, "PV");
        TYPE_PREFIX.put(VoucherType.JOURNAL, "JV");
        TYPE_PREFIX.put(VoucherType.CONTRA, "CV");
        TYPE_PREFIX.put(VoucherType.ADVANCE, "AV");
        TYPE_PREFIX.put(VoucherType.WRITE_OFF, "WO");
        TYPE_PREFIX.put(VoucherType.SALES_BILL, "SB");
        TYPE_PREFIX.put(VoucherType.SALES_SETTLEMENT, "SS");
    }

    private final VoucherHeaderRepository voucherHeaderRepository;
    private final VoucherLineRepository voucherLineRepository;
    private final ChartOfAccountRepository chartOfAccountRepository;
    private final TraderContextService traderContextService;
    /** Cleared after voucher post/reverse updates ledgers outside {@link ChartOfAccountServiceImpl} (avoids stale COA list / AR-AP cards). */
    private final CacheManager cacheManager;

    public VoucherHeaderServiceImpl(
        VoucherHeaderRepository voucherHeaderRepository,
        VoucherLineRepository voucherLineRepository,
        ChartOfAccountRepository chartOfAccountRepository,
        TraderContextService traderContextService,
        @Autowired(required = false) CacheManager cacheManager
    ) {
        this.voucherHeaderRepository = voucherHeaderRepository;
        this.voucherLineRepository = voucherLineRepository;
        this.chartOfAccountRepository = chartOfAccountRepository;
        this.traderContextService = traderContextService;
        this.cacheManager = cacheManager;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<VoucherHeaderDTO> getPage(Pageable pageable, VoucherType voucherType, VoucherLifecycleStatus status,
            LocalDate dateFrom, LocalDate dateTo, String search) {
        Long traderId = traderContextService.getCurrentTraderId();
        String s = (search != null && !search.isBlank()) ? search.trim() : null;
        return voucherHeaderRepository.findAllByTraderIdAndFilters(traderId, voucherType, status, dateFrom, dateTo, s, pageable)
            .map(this::toHeaderDto);
    }

    @Override
    @Transactional(readOnly = true)
    public VoucherHeaderDTO getById(Long id) {
        Long traderId = traderContextService.getCurrentTraderId();
        VoucherHeader header = voucherHeaderRepository.findOneByIdAndTraderId(id, traderId)
            .orElseThrow(() -> new IllegalArgumentException("Voucher not found: " + id));
        VoucherHeaderDTO dto = toHeaderDto(header);
        List<VoucherLine> lines = voucherLineRepository.findAllByVoucherHeaderIdOrderById(id);
        List<VoucherLineDTO> lineDtos = new ArrayList<>();
        for (VoucherLine line : lines) {
            lineDtos.add(toLineDto(line, String.valueOf(header.getId())));
        }
        dto.setLines(lineDtos);
        return dto;
    }

    @Override
    public VoucherHeaderDTO create(VoucherHeaderCreateRequest request) {
        Long traderId = traderContextService.getCurrentTraderId();
        String narration = request.getNarration() != null ? request.getNarration().trim() : "";
        if (narration.isEmpty()) {
            throw new IllegalArgumentException("Narration is required");
        }
        List<VoucherLineCreateDTO> lineReqs = request.getLines();
        if (lineReqs == null || lineReqs.isEmpty()) {
            throw new IllegalArgumentException("At least one line is required");
        }

        BigDecimal totalDebit = BigDecimal.ZERO;
        BigDecimal totalCredit = BigDecimal.ZERO;
        for (VoucherLineCreateDTO l : lineReqs) {
            BigDecimal d = l.getDebit() != null ? l.getDebit() : BigDecimal.ZERO;
            BigDecimal c = l.getCredit() != null ? l.getCredit() : BigDecimal.ZERO;
            if (d.compareTo(BigDecimal.ZERO) < 0 || c.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Debit and credit must be non-negative");
            }
            totalDebit = totalDebit.add(d);
            totalCredit = totalCredit.add(c);
        }
        // Normalize to 2 decimal places for comparison only (floating-point/JSON deserialization safety).
        BigDecimal normDebit = totalDebit.setScale(2, RoundingMode.HALF_UP);
        BigDecimal normCredit = totalCredit.setScale(2, RoundingMode.HALF_UP);
        if (normDebit.compareTo(BigDecimal.ZERO) <= 0 || normCredit.compareTo(normDebit) != 0) {
            throw new IllegalArgumentException("Lines must be balanced (total debit = total credit, both > 0)");
        }

        VoucherHeader header = new VoucherHeader();
        header.setTraderId(traderId);
        header.setVoucherType(request.getVoucherType());
        header.setVoucherNumber(generateVoucherNumber(traderId, request.getVoucherType()));
        header.setVoucherDate(request.getVoucherDate() != null ? request.getVoucherDate() : LocalDate.now());
        header.setNarration(narration);
        header.setStatus(VoucherLifecycleStatus.DRAFT);
        header.setTotalDebit(totalDebit);
        header.setTotalCredit(totalCredit);
        header.setIsMigrated(false);
        header = voucherHeaderRepository.save(header);

        for (VoucherLineCreateDTO l : lineReqs) {
            BigDecimal d = l.getDebit() != null ? l.getDebit() : BigDecimal.ZERO;
            BigDecimal c = l.getCredit() != null ? l.getCredit() : BigDecimal.ZERO;
            if (d.compareTo(BigDecimal.ZERO) == 0 && c.compareTo(BigDecimal.ZERO) == 0) continue;
            Long ledgerId = l.getLedgerId();
            if (ledgerId == null) throw new IllegalArgumentException("Ledger is required for each line");
            ChartOfAccount ledger = chartOfAccountRepository.findOneByTraderIdAndId(traderId, ledgerId)
                .orElseThrow(() -> new IllegalArgumentException("Ledger not found: " + ledgerId));
            VoucherLine line = new VoucherLine();
            line.setVoucherHeader(header);
            line.setLedgerId(ledgerId);
            line.setLedgerName(ledger.getLedgerName());
            line.setDebit(d);
            line.setCredit(c);
            voucherLineRepository.save(line);
        }

        LOG.debug("Created voucher header: id={}, voucherNumber={}", header.getId(), header.getVoucherNumber());
        return getById(header.getId());
    }

    @Override
    public VoucherHeaderDTO post(Long id) {
        Long traderId = traderContextService.getCurrentTraderId();
        VoucherHeader header = voucherHeaderRepository.findOneByIdAndTraderId(id, traderId)
            .orElseThrow(() -> new IllegalArgumentException("Voucher not found: " + id));
        if (header.getStatus() != VoucherLifecycleStatus.DRAFT) {
            throw new IllegalArgumentException("Only DRAFT vouchers can be posted");
        }
        List<VoucherLine> lines = voucherLineRepository.findAllByVoucherHeaderIdOrderById(id);
        Set<Long> coaTouched = new HashSet<>();
        for (VoucherLine line : lines) {
            ChartOfAccount ledger = chartOfAccountRepository.findOneByTraderIdAndId(traderId, line.getLedgerId())
                .orElse(null);
            if (ledger != null) {
                BigDecimal delta = line.getDebit().subtract(line.getCredit());
                ledger.setCurrentBalance(ledger.getCurrentBalance().add(delta));
                chartOfAccountRepository.save(ledger);
                if (ledger.getId() != null) {
                    coaTouched.add(ledger.getId());
                }
            }
        }
        header.setStatus(VoucherLifecycleStatus.POSTED);
        header.setPostedAt(Instant.now());
        voucherHeaderRepository.save(header);
        coaTouched.addAll(syncArApControlBalancesToSubledgers(traderId));
        evictCoaCaches(coaTouched);
        LOG.debug("Posted voucher: id={}", id);
        return getById(id);
    }

    @Override
    public VoucherHeaderDTO reverse(Long id) {
        Long traderId = traderContextService.getCurrentTraderId();
        VoucherHeader header = voucherHeaderRepository.findOneByIdAndTraderId(id, traderId)
            .orElseThrow(() -> new IllegalArgumentException("Voucher not found: " + id));
        if (header.getStatus() != VoucherLifecycleStatus.POSTED) {
            throw new IllegalArgumentException("Only POSTED vouchers can be reversed");
        }
        List<VoucherLine> lines = voucherLineRepository.findAllByVoucherHeaderIdOrderById(id);
        Set<Long> coaTouched = new HashSet<>();
        for (VoucherLine line : lines) {
            ChartOfAccount ledger = chartOfAccountRepository.findOneByTraderIdAndId(traderId, line.getLedgerId())
                .orElse(null);
            if (ledger != null) {
                BigDecimal delta = line.getDebit().subtract(line.getCredit());
                ledger.setCurrentBalance(ledger.getCurrentBalance().subtract(delta));
                chartOfAccountRepository.save(ledger);
                if (ledger.getId() != null) {
                    coaTouched.add(ledger.getId());
                }
            }
        }
        header.setStatus(VoucherLifecycleStatus.REVERSED);
        header.setReversedAt(Instant.now());
        voucherHeaderRepository.save(header);
        coaTouched.addAll(syncArApControlBalancesToSubledgers(traderId));
        evictCoaCaches(coaTouched);
        LOG.debug("Reversed voucher: id={}", id);
        return getById(id);
    }

    /**
     * AR Control / AP Control stored balances are not on voucher lines (posting hits subledgers only). Keep control {@code currentBalance}
     * equal to the sum of RECEIVABLE / PAYABLE subledgers so Chart of Accounts reconciliation matches SRS Part 6 §4.1.
     *
     * @return ids of control ledgers that were updated (for cache eviction)
     */
    private Set<Long> syncArApControlBalancesToSubledgers(Long traderId) {
        Set<Long> updatedControlIds = new HashSet<>();
        chartOfAccountRepository
            .findFirstByTraderIdAndClassificationAndLedgerNameContainingIgnoreCase(traderId, "CONTROL", "accounts receivable")
            .ifPresent(control -> {
                BigDecimal sum = chartOfAccountRepository.sumCurrentBalanceReceivableSubledgers(traderId);
                if (sum == null) sum = BigDecimal.ZERO;
                control.setCurrentBalance(sum);
                chartOfAccountRepository.save(control);
                if (control.getId() != null) {
                    updatedControlIds.add(control.getId());
                }
            });
        chartOfAccountRepository
            .findFirstByTraderIdAndClassificationAndLedgerNameContainingIgnoreCase(traderId, "CONTROL", "accounts payable")
            .ifPresent(control -> {
                BigDecimal sum = chartOfAccountRepository.sumCurrentBalancePayableSubledgers(traderId);
                if (sum == null) sum = BigDecimal.ZERO;
                control.setCurrentBalance(sum);
                chartOfAccountRepository.save(control);
                if (control.getId() != null) {
                    updatedControlIds.add(control.getId());
                }
            });
        return updatedControlIds;
    }

    private void evictCoaCaches(Set<Long> ledgerIds) {
        if (cacheManager == null) {
            return;
        }
        Cache page = cacheManager.getCache(ChartOfAccountServiceImpl.CACHE_COA_PAGE_BY_TRADER);
        if (page != null) {
            page.clear();
        }
        Cache byId = cacheManager.getCache(ChartOfAccountServiceImpl.CACHE_COA_BY_ID);
        if (byId != null) {
            for (Long ledgerId : ledgerIds) {
                if (ledgerId != null) {
                    byId.evict(ledgerId);
                }
            }
        }
    }

    private String generateVoucherNumber(Long traderId, VoucherType type) {
        String prefix = TYPE_PREFIX.getOrDefault(type, "JV");
        long count = voucherHeaderRepository.countByTraderIdAndVoucherType(traderId, type);
        int next = (int) count + 1;
        return VOUCHER_NUMBER_PREFIX + prefix + "/" + String.format("%03d", next);
    }

    private VoucherHeaderDTO toHeaderDto(VoucherHeader h) {
        VoucherHeaderDTO d = new VoucherHeaderDTO();
        d.setVoucherId(h.getId() != null ? h.getId().toString() : null);
        d.setTraderId(h.getTraderId() != null ? h.getTraderId().toString() : null);
        d.setVoucherType(h.getVoucherType());
        d.setVoucherNumber(h.getVoucherNumber());
        d.setVoucherDate(h.getVoucherDate());
        d.setNarration(h.getNarration());
        d.setStatus(h.getStatus());
        d.setTotalDebit(h.getTotalDebit());
        d.setTotalCredit(h.getTotalCredit());
        d.setIsMigrated(h.getIsMigrated());
        d.setCreatedAt(h.getCreatedDate());
        d.setCreatedBy(h.getCreatedBy());
        d.setPostedAt(h.getPostedAt());
        d.setReversedAt(h.getReversedAt());
        return d;
    }

    private VoucherLineDTO toLineDto(VoucherLine line, String voucherIdStr) {
        VoucherLineDTO d = new VoucherLineDTO();
        d.setLineId(line.getId() != null ? line.getId().toString() : null);
        d.setVoucherId(voucherIdStr);
        d.setLedgerId(line.getLedgerId() != null ? line.getLedgerId().toString() : null);
        d.setLedgerName(line.getLedgerName());
        d.setDebit(line.getDebit());
        d.setCredit(line.getCredit());
        if (line.getCommodityId() != null) d.setCommodityId(line.getCommodityId().toString());
        d.setCommodityName(line.getCommodityName());
        d.setQuantity(line.getQuantity());
        d.setRate(line.getRate());
        if (line.getLotId() != null) d.setLotId(line.getLotId().toString());
        return d;
    }
}
