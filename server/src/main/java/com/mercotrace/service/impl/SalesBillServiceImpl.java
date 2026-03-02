package com.mercotrace.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mercotrace.domain.*;
import com.mercotrace.repository.*;
import com.mercotrace.service.SalesBillService;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.dto.SalesBillDTOs.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sales Bill service: bill number generation per prefix, versioning, voucher creation.
 */
@Service
@Transactional
public class SalesBillServiceImpl implements SalesBillService {

    private static final Logger LOG = LoggerFactory.getLogger(SalesBillServiceImpl.class);
    private static final String DEFAULT_BILL_PREFIX = "MT";

    private final TraderContextService traderContextService;
    private final SalesBillRepository salesBillRepository;
    private final TraderRepository traderRepository;
    private final BillNumberSequenceRepository billNumberSequenceRepository;
    private final VoucherRepository voucherRepository;
    private final ObjectMapper objectMapper;

    public SalesBillServiceImpl(
        TraderContextService traderContextService,
        SalesBillRepository salesBillRepository,
        TraderRepository traderRepository,
        BillNumberSequenceRepository billNumberSequenceRepository,
        VoucherRepository voucherRepository,
        ObjectMapper objectMapper
    ) {
        this.traderContextService = traderContextService;
        this.salesBillRepository = salesBillRepository;
        this.traderRepository = traderRepository;
        this.billNumberSequenceRepository = billNumberSequenceRepository;
        this.voucherRepository = voucherRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SalesBillDTO> getBills(Pageable pageable, String billNumber, String buyerName,
                                       Instant dateFrom, Instant dateTo) {
        Long traderId = traderContextService.getCurrentTraderId();
        String bn = (billNumber != null && !billNumber.isBlank()) ? billNumber.trim() : null;
        String bn2 = (buyerName != null && !buyerName.isBlank()) ? buyerName.trim() : null;
        if (bn == null && bn2 == null && dateFrom == null && dateTo == null) {
            return salesBillRepository.findAllByTraderId(traderId, pageable).map(this::toDto);
        }
        return salesBillRepository.findByTraderIdAndFilters(traderId, bn, bn2, dateFrom, dateTo, pageable)
            .map(this::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public SalesBillDTO getById(Long id) {
        Long traderId = traderContextService.getCurrentTraderId();
        SalesBill bill = salesBillRepository.findByIdWithGroupsAndVersions(id)
            .orElseThrow(() -> new IllegalArgumentException("Sales bill not found: " + id));
        if (!bill.getTraderId().equals(traderId)) {
            throw new IllegalArgumentException("Sales bill not found: " + id);
        }
        return toDto(bill);
    }

    @Override
    public SalesBillDTO create(SalesBillCreateOrUpdateRequest request) {
        Long traderId = traderContextService.getCurrentTraderId();
        String prefix = getBillPrefix(traderId);
        String billNumber = generateBillNumber(prefix);

        SalesBill bill = new SalesBill();
        mapRequestToEntity(request, bill);
        bill.setTraderId(traderId);
        bill.setBillNumber(billNumber);
        bill = salesBillRepository.save(bill);

        createVouchersIfNeeded(traderId, bill.getId(), bill.getBuyerCoolie(), bill.getOutboundFreight());
        return toDto(bill);
    }

    @Override
    public SalesBillDTO update(Long id, SalesBillCreateOrUpdateRequest request) {
        Long traderId = traderContextService.getCurrentTraderId();
        SalesBill bill = salesBillRepository.findByIdWithGroupsAndVersions(id)
            .orElseThrow(() -> new IllegalArgumentException("Sales bill not found: " + id));
        if (!bill.getTraderId().equals(traderId)) {
            throw new IllegalArgumentException("Sales bill not found: " + id);
        }

        // Version snapshot (current state before update)
        try {
            SalesBillDTO currentDto = toDto(bill);
            String snapshot = objectMapper.writeValueAsString(currentDto);
            SalesBillVersion version = new SalesBillVersion();
            version.setSalesBill(bill);
            version.setVersionNumber(bill.getVersions().size() + 1);
            version.setSavedAt(Instant.now());
            version.setSnapshotJson(snapshot);
            bill.getVersions().add(version);
        } catch (JsonProcessingException e) {
            LOG.warn("Could not serialize bill snapshot for version: {}", e.getMessage());
        }

        // Clear children and re-map (replace groups/items)
        bill.getCommodityGroups().clear();
        salesBillRepository.flush();
        mapRequestToEntity(request, bill);
        bill.setBillNumber(bill.getBillNumber() != null ? bill.getBillNumber() : request.getBillNumber());
        bill = salesBillRepository.save(bill);
        return toDto(bill);
    }

    private String getBillPrefix(Long traderId) {
        return traderRepository.findById(traderId)
            .map(t -> t.getBillPrefix() != null && !t.getBillPrefix().isBlank() ? t.getBillPrefix().trim() : DEFAULT_BILL_PREFIX)
            .orElse(DEFAULT_BILL_PREFIX);
    }

    private String generateBillNumber(String prefix) {
        String key = prefix != null && !prefix.isBlank() ? prefix.trim().toUpperCase() : DEFAULT_BILL_PREFIX;
        BillNumberSequence seq = billNumberSequenceRepository.findByPrefixForUpdate(key)
            .orElseGet(() -> {
                BillNumberSequence newSeq = new BillNumberSequence();
                newSeq.setPrefix(key);
                newSeq.setNextValue(1L);
                return newSeq;
            });
        long next = seq.getNextValue();
        seq.setNextValue(next + 1);
        billNumberSequenceRepository.save(seq);
        return key + "-" + String.format("%05d", next);
    }

    private void createVouchersIfNeeded(Long traderId, Long billId, BigDecimal buyerCoolie, BigDecimal outboundFreight) {
        Instant now = Instant.now();
        if (buyerCoolie != null && buyerCoolie.compareTo(BigDecimal.ZERO) > 0) {
            Voucher v = new Voucher();
            v.setTraderId(traderId);
            v.setReferenceType("BUYER_COOLIE");
            v.setReferenceId(billId);
            v.setAmount(buyerCoolie);
            v.setStatus(com.mercotrace.domain.enumeration.VoucherStatus.OPEN);
            v.setCreatedAt(now);
            voucherRepository.save(v);
        }
        if (outboundFreight != null && outboundFreight.compareTo(BigDecimal.ZERO) > 0) {
            Voucher v = new Voucher();
            v.setTraderId(traderId);
            v.setReferenceType("OUTBOUND_FREIGHT");
            v.setReferenceId(billId);
            v.setAmount(outboundFreight);
            v.setStatus(com.mercotrace.domain.enumeration.VoucherStatus.OPEN);
            v.setCreatedAt(now);
            voucherRepository.save(v);
        }
    }

    private void mapRequestToEntity(SalesBillCreateOrUpdateRequest request, SalesBill bill) {
        bill.setBuyerName(request.getBuyerName());
        bill.setBuyerMark(request.getBuyerMark());
        bill.setBillingName(request.getBillingName());
        bill.setBillDate(parseInstant(request.getBillDate()));
        bill.setBuyerCoolie(nullToZero(request.getBuyerCoolie()));
        bill.setOutboundFreight(nullToZero(request.getOutboundFreight()));
        bill.setOutboundVehicle(request.getOutboundVehicle());
        bill.setDiscount(nullToZero(request.getDiscount()));
        bill.setDiscountType(request.getDiscountType() != null ? request.getDiscountType() : "AMOUNT");
        bill.setManualRoundOff(nullToZero(request.getManualRoundOff()));
        bill.setGrandTotal(request.getGrandTotal() != null ? request.getGrandTotal() : BigDecimal.ZERO);
        bill.setBrokerageType(request.getBrokerageType() != null ? request.getBrokerageType() : "AMOUNT");
        bill.setBrokerageValue(nullToZero(request.getBrokerageValue()));
        bill.setGlobalOtherCharges(nullToZero(request.getGlobalOtherCharges()));
        bill.setPendingBalance(nullToZero(request.getPendingBalance()));

        int go = 0;
        for (CommodityGroupDTO g : request.getCommodityGroups()) {
            SalesBillCommodityGroup group = new SalesBillCommodityGroup();
            group.setSalesBill(bill);
            group.setCommodityName(g.getCommodityName());
            group.setHsnCode(g.getHsnCode());
            group.setCommissionPercent(nullToZero(g.getCommissionPercent()));
            group.setUserFeePercent(nullToZero(g.getUserFeePercent()));
            group.setSubtotal(g.getSubtotal() != null ? g.getSubtotal() : BigDecimal.ZERO);
            group.setCommissionAmount(nullToZero(g.getCommissionAmount()));
            group.setUserFeeAmount(nullToZero(g.getUserFeeAmount()));
            group.setTotalCharges(nullToZero(g.getTotalCharges()));
            group.setSortOrder(go++);
            bill.getCommodityGroups().add(group);
            int io = 0;
            for (BillLineItemDTO it : g.getItems()) {
                SalesBillLineItem item = new SalesBillLineItem();
                item.setCommodityGroup(group);
                item.setBidNumber(it.getBidNumber() != null ? it.getBidNumber() : 0);
                item.setLotName(it.getLotName());
                item.setSellerName(it.getSellerName());
                item.setQuantity(it.getQuantity() != null ? it.getQuantity() : 0);
                item.setWeight(it.getWeight() != null ? it.getWeight() : BigDecimal.ZERO);
                item.setBaseRate(it.getBaseRate() != null ? it.getBaseRate() : BigDecimal.ZERO);
                item.setBrokerage(nullToZero(it.getBrokerage()));
                item.setOtherCharges(nullToZero(it.getOtherCharges()));
                item.setNewRate(it.getNewRate() != null ? it.getNewRate() : BigDecimal.ZERO);
                item.setAmount(it.getAmount() != null ? it.getAmount() : BigDecimal.ZERO);
                item.setSortOrder(io++);
                group.getItems().add(item);
            }
        }
    }

    private SalesBillDTO toDto(SalesBill bill) {
        SalesBillDTO dto = new SalesBillDTO();
        dto.setBillId(String.valueOf(bill.getId()));
        dto.setBillNumber(bill.getBillNumber());
        dto.setBuyerName(bill.getBuyerName());
        dto.setBuyerMark(bill.getBuyerMark());
        dto.setBillingName(bill.getBillingName());
        dto.setBillDate(bill.getBillDate() != null ? bill.getBillDate().toString() : null);
        dto.setBuyerCoolie(bill.getBuyerCoolie());
        dto.setOutboundFreight(bill.getOutboundFreight());
        dto.setOutboundVehicle(bill.getOutboundVehicle());
        dto.setDiscount(bill.getDiscount());
        dto.setDiscountType(bill.getDiscountType());
        dto.setManualRoundOff(bill.getManualRoundOff());
        dto.setGrandTotal(bill.getGrandTotal());
        dto.setBrokerageType(bill.getBrokerageType());
        dto.setBrokerageValue(bill.getBrokerageValue());
        dto.setGlobalOtherCharges(bill.getGlobalOtherCharges());
        dto.setPendingBalance(bill.getPendingBalance());

        List<CommodityGroupDTO> groups = new ArrayList<>();
        for (SalesBillCommodityGroup g : bill.getCommodityGroups()) {
            CommodityGroupDTO gdto = new CommodityGroupDTO();
            gdto.setId(g.getId());
            gdto.setCommodityName(g.getCommodityName());
            gdto.setHsnCode(g.getHsnCode());
            gdto.setCommissionPercent(g.getCommissionPercent());
            gdto.setUserFeePercent(g.getUserFeePercent());
            gdto.setSubtotal(g.getSubtotal());
            gdto.setCommissionAmount(g.getCommissionAmount());
            gdto.setUserFeeAmount(g.getUserFeeAmount());
            gdto.setTotalCharges(g.getTotalCharges());
            List<BillLineItemDTO> items = new ArrayList<>();
            for (SalesBillLineItem it : g.getItems()) {
                BillLineItemDTO idto = new BillLineItemDTO();
                idto.setId(it.getId());
                idto.setBidNumber(it.getBidNumber());
                idto.setLotName(it.getLotName());
                idto.setSellerName(it.getSellerName());
                idto.setQuantity(it.getQuantity());
                idto.setWeight(it.getWeight());
                idto.setBaseRate(it.getBaseRate());
                idto.setBrokerage(it.getBrokerage());
                idto.setOtherCharges(it.getOtherCharges());
                idto.setNewRate(it.getNewRate());
                idto.setAmount(it.getAmount());
                items.add(idto);
            }
            gdto.setItems(items);
            groups.add(gdto);
        }
        dto.setCommodityGroups(groups);

        List<BillVersionDTO> versions = new ArrayList<>();
        for (SalesBillVersion v : bill.getVersions()) {
            BillVersionDTO vdto = new BillVersionDTO();
            vdto.setVersion(v.getVersionNumber());
            vdto.setSavedAt(v.getSavedAt() != null ? v.getSavedAt().toString() : null);
            if (v.getSnapshotJson() != null) {
                try {
                    vdto.setData(objectMapper.readValue(v.getSnapshotJson(), Object.class));
                } catch (JsonProcessingException e) {
                    vdto.setData(null);
                }
            }
            versions.add(vdto);
        }
        dto.setVersions(versions);
        return dto;
    }

    private static BigDecimal nullToZero(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private static Instant parseInstant(String s) {
        if (s == null || s.isBlank()) return Instant.now();
        try {
            return Instant.parse(s);
        } catch (DateTimeParseException e) {
            return Instant.now();
        }
    }
}
