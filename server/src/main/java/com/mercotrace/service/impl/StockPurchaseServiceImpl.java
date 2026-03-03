package com.mercotrace.service.impl;

import com.mercotrace.domain.*;
import com.mercotrace.repository.*;
import com.mercotrace.service.StockPurchaseService;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.dto.StockPurchaseDTOs.*;
import com.mercotrace.service.mapper.StockPurchaseChargeMapper;
import com.mercotrace.service.mapper.StockPurchaseItemMapper;
import com.mercotrace.service.mapper.StockPurchaseMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementation of Stock Purchase: list (paginated, vendor search) and create.
 */
@Service
@Transactional
public class StockPurchaseServiceImpl implements StockPurchaseService {

    private static final Logger LOG = LoggerFactory.getLogger(StockPurchaseServiceImpl.class);

    private final TraderContextService traderContextService;
    private final StockPurchaseRepository stockPurchaseRepository;
    private final ContactRepository contactRepository;
    private final CommodityRepository commodityRepository;
    private final StockPurchaseMapper stockPurchaseMapper;
    private final StockPurchaseItemMapper stockPurchaseItemMapper;
    private final StockPurchaseChargeMapper stockPurchaseChargeMapper;

    public StockPurchaseServiceImpl(
        TraderContextService traderContextService,
        StockPurchaseRepository stockPurchaseRepository,
        ContactRepository contactRepository,
        CommodityRepository commodityRepository,
        StockPurchaseMapper stockPurchaseMapper,
        StockPurchaseItemMapper stockPurchaseItemMapper,
        StockPurchaseChargeMapper stockPurchaseChargeMapper
    ) {
        this.traderContextService = traderContextService;
        this.stockPurchaseRepository = stockPurchaseRepository;
        this.contactRepository = contactRepository;
        this.commodityRepository = commodityRepository;
        this.stockPurchaseMapper = stockPurchaseMapper;
        this.stockPurchaseItemMapper = stockPurchaseItemMapper;
        this.stockPurchaseChargeMapper = stockPurchaseChargeMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StockPurchaseDTO> getPurchases(Pageable pageable, String vendorSearch) {
        Long traderId = traderContextService.getCurrentTraderId();
        Page<StockPurchase> page;
        String searchTrimmed = vendorSearch != null ? vendorSearch.trim() : "";
        if (searchTrimmed.isEmpty()) {
            page = stockPurchaseRepository.findAllByTraderIdAndIsDeletedFalse(traderId, pageable);
        } else {
            List<Contact> contacts = contactRepository.findAllByTraderIdAndNameContainingIgnoreCase(traderId, searchTrimmed);
            if (contacts.isEmpty()) {
                page = stockPurchaseRepository.findAllByTraderIdAndIsDeletedFalse(traderId, pageable);
            } else {
                List<Long> vendorIds = contacts.stream().map(Contact::getId).toList();
                page = stockPurchaseRepository.findAllByTraderIdAndVendorIdInAndIsDeletedFalse(traderId, vendorIds, pageable);
            }
        }
        return page.map(this::toDto);
    }

    @Override
    public StockPurchaseDTO create(CreateStockPurchaseRequestDTO request) {
        Long traderId = traderContextService.getCurrentTraderId();

        Contact vendor = contactRepository.findById(request.getVendorId())
            .orElseThrow(() -> new IllegalArgumentException("Vendor not found: " + request.getVendorId()));
        if (vendor.getTraderId() != null && !vendor.getTraderId().equals(traderId)) {
            throw new IllegalArgumentException("Vendor does not belong to current trader");
        }

        List<PurchaseLineItemInput> validItems = request.getItems().stream()
            .filter(i -> i.getAmount() != null && i.getAmount().compareTo(BigDecimal.ZERO) > 0)
            .toList();
        if (validItems.isEmpty()) {
            throw new IllegalArgumentException("At least one item with amount > 0 is required");
        }

        BigDecimal subtotal = validItems.stream().map(PurchaseLineItemInput::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCharges = request.getCharges() != null
            ? request.getCharges().stream().map(PurchaseChargeInput::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add)
            : BigDecimal.ZERO;

        StockPurchase purchase = new StockPurchase();
        purchase.setTraderId(traderId);
        purchase.setVendorId(request.getVendorId());
        purchase.setPurchaseDate(Instant.now());
        purchase.setTotalAmount(subtotal);
        purchase.setTotalCharges(totalCharges);
        purchase.setIsDeleted(false);

        for (PurchaseLineItemInput input : validItems) {
            Long commodityId = resolveCommodityId(traderId, input);
            StockPurchaseItem item = new StockPurchaseItem();
            item.setPurchase(purchase);
            item.setCommodityId(commodityId);
            item.setCommodityName(input.getCommodity() != null ? input.getCommodity().trim() : null);
            item.setQuantity(input.getQuantity());
            item.setRate(input.getRate());
            item.setAmount(input.getAmount());
            item.setAllocatedCharges(BigDecimal.ZERO);
            if (subtotal.compareTo(BigDecimal.ZERO) > 0 && totalCharges.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal allocated = input.getAmount().multiply(totalCharges).divide(subtotal, 2, RoundingMode.HALF_UP);
                item.setAllocatedCharges(allocated);
                if (input.getQuantity() != null && input.getQuantity() > 0) {
                    item.setEffectiveBaseRate(input.getAmount().add(allocated).divide(BigDecimal.valueOf(input.getQuantity()), 2, RoundingMode.HALF_UP));
                }
            }
            item.setIsDeleted(false);
            purchase.getItems().add(item);
        }

        if (request.getCharges() != null) {
            for (PurchaseChargeInput input : request.getCharges()) {
                if (input.getAmount() == null || input.getAmount().compareTo(BigDecimal.ZERO) == 0) continue;
                StockPurchaseCharge charge = new StockPurchaseCharge();
                charge.setPurchase(purchase);
                charge.setChargeName(input.getName() != null ? input.getName().trim() : "");
                charge.setChargeAmount(input.getAmount());
                charge.setIsDeleted(false);
                purchase.getCharges().add(charge);
            }
        }

        purchase = stockPurchaseRepository.save(purchase);
        return toDto(purchase);
    }

    @Override
    @Transactional(readOnly = true)
    public StockPurchaseDTO getById(Long id) {
        Long traderId = traderContextService.getCurrentTraderId();
        StockPurchase purchase = stockPurchaseRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Stock purchase not found: " + id));
        if (!purchase.getTraderId().equals(traderId)) {
            throw new IllegalArgumentException("Stock purchase not found: " + id);
        }
        return toDto(purchase);
    }

    private Long resolveCommodityId(Long traderId, PurchaseLineItemInput input) {
        if (input.getCommodityId() != null) {
            return commodityRepository.findById(input.getCommodityId())
                .filter(c -> traderId.equals(c.getTraderId()))
                .map(Commodity::getId)
                .orElseThrow(() -> new IllegalArgumentException("Commodity not found: " + input.getCommodityId()));
        }
        if (input.getCommodity() != null && !input.getCommodity().trim().isEmpty()) {
            return commodityRepository.findOneByTraderIdAndCommodityNameIgnoreCase(traderId, input.getCommodity().trim())
                .map(Commodity::getId)
                .orElseThrow(() -> new IllegalArgumentException("Commodity not found by name: " + input.getCommodity()));
        }
        throw new IllegalArgumentException("Each item must have commodityId or commodity name");
    }

    private StockPurchaseDTO toDto(StockPurchase purchase) {
        StockPurchaseDTO dto = stockPurchaseMapper.toDto(purchase);
        BigDecimal totalAmount = purchase.getTotalAmount() != null ? purchase.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal totalCharges = purchase.getTotalCharges() != null ? purchase.getTotalCharges() : BigDecimal.ZERO;
        dto.setGrandTotal(totalAmount.add(totalCharges));

        contactRepository.findById(purchase.getVendorId()).ifPresent(c -> dto.setVendorName(c.getName()));

        List<StockPurchaseItem> activeItems = purchase.getItems().stream()
            .filter(i -> !Boolean.TRUE.equals(i.getIsDeleted()))
            .toList();
        List<PurchaseLineItemDTO> itemDtos = activeItems.stream()
            .map(stockPurchaseItemMapper::toDto)
            .collect(Collectors.toCollection(ArrayList::new));
        dto.setItems(itemDtos);
        for (int i = 0; i < activeItems.size(); i++) {
            final int index = i;
            StockPurchaseItem it = activeItems.get(i);
            if (it.getCommodityName() == null || it.getCommodityName().isEmpty()) {
                commodityRepository.findById(it.getCommodityId())
                    .ifPresent(c -> itemDtos.get(index).setCommodity(c.getCommodityName()));
            }
        }

        dto.setCharges(purchase.getCharges().stream()
            .filter(c -> !Boolean.TRUE.equals(c.getIsDeleted()))
            .map(stockPurchaseChargeMapper::toDto)
            .collect(Collectors.toCollection(ArrayList::new)));

        List<String> lotNumbers = new ArrayList<>();
        BigDecimal st = totalAmount;
        BigDecimal tc = totalCharges;
        long ts = purchase.getCreatedDate() != null ? purchase.getCreatedDate().toEpochMilli() : System.currentTimeMillis();
        int idx = 1;
        for (StockPurchaseItem it : activeItems) {
            BigDecimal allocated = BigDecimal.ZERO;
            if (st != null && st.compareTo(BigDecimal.ZERO) > 0 && tc != null && tc.compareTo(BigDecimal.ZERO) > 0) {
                allocated = it.getAmount().multiply(tc).divide(st, 2, RoundingMode.HALF_UP);
            }
            BigDecimal effectiveRate = it.getQuantity() != null && it.getQuantity() > 0
                ? it.getAmount().add(allocated).divide(BigDecimal.valueOf(it.getQuantity()), 0, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
            lotNumbers.add("SP-" + ts + "-" + (idx++) + " {₹" + effectiveRate + "}");
        }
        dto.setLotNumbers(lotNumbers);

        return dto;
    }
}
