package com.mercotrace.service.impl;

import com.mercotrace.domain.VoucherLine;
import com.mercotrace.domain.enumeration.VoucherLifecycleStatus;
import com.mercotrace.repository.ChartOfAccountRepository;
import com.mercotrace.repository.ContactRepository;
import com.mercotrace.repository.VoucherLineRepository;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.VoucherLineService;
import com.mercotrace.service.dto.VoucherLineDTO;
import com.mercotrace.web.rest.errors.BadRequestAlertException;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class VoucherLineServiceImpl implements VoucherLineService {

    private final VoucherLineRepository voucherLineRepository;
    private final ChartOfAccountRepository chartOfAccountRepository;
    private final ContactRepository contactRepository;
    private final TraderContextService traderContextService;

    public VoucherLineServiceImpl(
        VoucherLineRepository voucherLineRepository,
        ChartOfAccountRepository chartOfAccountRepository,
        ContactRepository contactRepository,
        TraderContextService traderContextService
    ) {
        this.voucherLineRepository = voucherLineRepository;
        this.chartOfAccountRepository = chartOfAccountRepository;
        this.contactRepository = contactRepository;
        this.traderContextService = traderContextService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoucherLineDTO> getLinesByDateRange(LocalDate dateFrom, LocalDate dateTo) {
        Long traderId = traderContextService.getCurrentTraderId();
        return voucherLineRepository.findAllByTraderIdAndVoucherDateBetween(traderId, dateFrom, dateTo)
            .stream()
            .map(line -> toDto(line))
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<VoucherLineDTO> getLinesByDateRange(LocalDate dateFrom, LocalDate dateTo, Pageable pageable) {
        Long traderId = traderContextService.getCurrentTraderId();
        return voucherLineRepository.findPageByTraderIdAndVoucherDateBetween(traderId, dateFrom, dateTo, pageable)
            .map(this::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoucherLineDTO> getLinesByLedgerAndDateRange(Long ledgerId, LocalDate dateFrom, LocalDate dateTo) {
        Long traderId = traderContextService.getCurrentTraderId();
        if (chartOfAccountRepository.findOneByTraderIdAndId(traderId, ledgerId).isEmpty()) {
            throw new BadRequestAlertException("Ledger not found or access denied", "chartOfAccount", "ledgerNotFound");
        }
        return voucherLineRepository.findAllByTraderIdAndLedgerIdAndVoucherDateBetween(traderId, ledgerId, dateFrom, dateTo)
            .stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoucherLineDTO> getLinesByContactIdAndDateRange(Long contactId, LocalDate dateFrom, LocalDate dateTo) {
        Long traderId = traderContextService.getCurrentTraderId();
        if (contactRepository.findOneByTraderIdAndId(traderId, contactId).isEmpty()) {
            throw new BadRequestAlertException("Contact not found or access denied", "contact", "contactNotFound");
        }
        List<com.mercotrace.domain.ChartOfAccount> ledgers = chartOfAccountRepository.findAllByTraderIdAndContactId(traderId, contactId);
        if (ledgers.isEmpty()) {
            return List.of();
        }
        List<Long> ledgerIds = ledgers.stream().map(com.mercotrace.domain.ChartOfAccount::getId).collect(Collectors.toList());
        LocalDate effectiveFrom = dateFrom != null ? dateFrom : LocalDate.now().withDayOfYear(1);
        LocalDate effectiveTo = dateTo != null ? dateTo : LocalDate.now();
        return voucherLineRepository.findAllByTraderIdAndLedgerIdInAndVoucherDateBetweenExcludingStatus(
            traderId, ledgerIds, effectiveFrom, effectiveTo, VoucherLifecycleStatus.REVERSED
        ).stream().map(this::toDto).collect(Collectors.toList());
    }

    private VoucherLineDTO toDto(VoucherLine line) {
        VoucherLineDTO d = new VoucherLineDTO();
        d.setLineId(line.getId() != null ? line.getId().toString() : null);
        d.setVoucherId(line.getVoucherHeader() != null && line.getVoucherHeader().getId() != null
            ? line.getVoucherHeader().getId().toString() : null);
        d.setLedgerId(line.getLedgerId() != null ? line.getLedgerId().toString() : null);
        d.setLedgerName(line.getLedgerName());
        d.setDebit(line.getDebit());
        d.setCredit(line.getCredit());
        if (line.getCommodityId() != null) d.setCommodityId(line.getCommodityId().toString());
        d.setCommodityName(line.getCommodityName());
        d.setQuantity(line.getQuantity());
        d.setRate(line.getRate());
        if (line.getLotId() != null) d.setLotId(line.getLotId().toString());
        if (line.getVoucherHeader() != null) {
            d.setVoucherDate(line.getVoucherHeader().getVoucherDate());
            d.setVoucherNumber(line.getVoucherHeader().getVoucherNumber());
            d.setVoucherType(line.getVoucherHeader().getVoucherType() != null ? line.getVoucherHeader().getVoucherType().name() : null);
            d.setNarration(line.getVoucherHeader().getNarration());
            d.setStatus(line.getVoucherHeader().getStatus() != null ? line.getVoucherHeader().getStatus().name() : null);
        }
        return d;
    }
}
