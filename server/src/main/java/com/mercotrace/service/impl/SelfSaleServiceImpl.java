package com.mercotrace.service.impl;

import com.mercotrace.domain.*;
import com.mercotrace.repository.*;
import com.mercotrace.service.SelfSaleService;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.dto.SelfSaleDTOs.ClosureDTO;
import com.mercotrace.service.dto.SelfSaleDTOs.CreateClosureRequestDTO;
import com.mercotrace.service.dto.SelfSaleDTOs.OpenLotDTO;
import com.mercotrace.service.mapper.SelfSaleClosureMapper;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementation of Self-Sale: open lots and create/list closures.
 */
@Service
@Transactional
public class SelfSaleServiceImpl implements SelfSaleService {

    private static final Logger LOG = LoggerFactory.getLogger(SelfSaleServiceImpl.class);

    private final TraderContextService traderContextService;
    private final SelfSaleClosureRepository selfSaleClosureRepository;
    private final LotRepository lotRepository;
    private final SellerInVehicleRepository sellerInVehicleRepository;
    private final VehicleRepository vehicleRepository;
    private final ContactRepository contactRepository;
    private final CommodityRepository commodityRepository;
    private final SelfSaleClosureMapper selfSaleClosureMapper;

    public SelfSaleServiceImpl(
        TraderContextService traderContextService,
        SelfSaleClosureRepository selfSaleClosureRepository,
        LotRepository lotRepository,
        SellerInVehicleRepository sellerInVehicleRepository,
        VehicleRepository vehicleRepository,
        ContactRepository contactRepository,
        CommodityRepository commodityRepository,
        SelfSaleClosureMapper selfSaleClosureMapper
    ) {
        this.traderContextService = traderContextService;
        this.selfSaleClosureRepository = selfSaleClosureRepository;
        this.lotRepository = lotRepository;
        this.sellerInVehicleRepository = sellerInVehicleRepository;
        this.vehicleRepository = vehicleRepository;
        this.contactRepository = contactRepository;
        this.commodityRepository = commodityRepository;
        this.selfSaleClosureMapper = selfSaleClosureMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OpenLotDTO> getOpenLots(Pageable pageable, String search) {
        Long traderId = traderContextService.getCurrentTraderId();
        Set<Long> closedLotIds = selfSaleClosureRepository.findClosedLotIdsByTraderId(traderId);

        Page<Lot> lotPage;
        String searchTrimmed = search != null ? search.trim() : "";
        if (closedLotIds.isEmpty()) {
            if (searchTrimmed.isEmpty()) {
                lotPage = lotRepository.findAllByTraderId(traderId, pageable);
            } else {
                lotPage = lotRepository.findAllByTraderIdAndLotNameContainingIgnoreCase(traderId, searchTrimmed, pageable);
            }
        } else {
            if (searchTrimmed.isEmpty()) {
                lotPage = lotRepository.findOpenLotsByTraderIdExcluding(traderId, closedLotIds, pageable);
            } else {
                lotPage = lotRepository.findOpenLotsByTraderIdExcludingWithSearch(traderId, closedLotIds, searchTrimmed, pageable);
            }
        }

        List<Lot> lots = lotPage.getContent();
        if (lots.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, lotPage.getTotalElements());
        }

        List<Long> sellerVehicleIds = lots.stream().map(Lot::getSellerVehicleId).distinct().toList();
        List<Long> commodityIds = lots.stream().map(Lot::getCommodityId).distinct().toList();

        List<SellerInVehicle> sivList = sellerInVehicleRepository.findAllById(sellerVehicleIds);
        List<Long> vehicleIds = sivList.stream().map(SellerInVehicle::getVehicleId).distinct().toList();
        List<Long> contactIds = sivList.stream().map(SellerInVehicle::getContactId).distinct().toList();

        Map<Long, SellerInVehicle> sivById = sivList.stream().collect(Collectors.toMap(SellerInVehicle::getId, siv -> siv));
        List<Vehicle> vehicles = vehicleRepository.findAllById(vehicleIds);
        List<Contact> contacts = contactRepository.findAllById(contactIds);
        List<Commodity> commodities = commodityRepository.findAllById(commodityIds);

        Map<Long, Vehicle> vehicleById = vehicles.stream().collect(Collectors.toMap(Vehicle::getId, v -> v));
        Map<Long, Contact> contactById = contacts.stream().collect(Collectors.toMap(Contact::getId, c -> c));
        Map<Long, Commodity> commodityById = commodities.stream().collect(Collectors.toMap(Commodity::getId, c -> c));

        List<OpenLotDTO> content = lots.stream().map(lot -> {
            OpenLotDTO dto = new OpenLotDTO();
            dto.setLotId(lot.getId());
            dto.setLotName(lot.getLotName() != null ? lot.getLotName() : "");
            dto.setBagCount(lot.getBagCount() != null ? lot.getBagCount() : 0);
            Commodity com = commodityById.get(lot.getCommodityId());
            dto.setCommodityName(com != null && com.getCommodityName() != null ? com.getCommodityName() : "");
            SellerInVehicle siv = sivById.get(lot.getSellerVehicleId());
            if (siv != null) {
                Contact c = contactById.get(siv.getContactId());
                dto.setSellerName(c != null && c.getName() != null ? c.getName() : "");
                dto.setSellerMark(c != null ? c.getMark() : null);
                Vehicle v = vehicleById.get(siv.getVehicleId());
                dto.setVehicleNumber(v != null && v.getVehicleNumber() != null ? v.getVehicleNumber() : "");
            } else {
                dto.setSellerName("");
                dto.setSellerMark(null);
                dto.setVehicleNumber("");
            }
            dto.setStatus("OPEN");
            return dto;
        }).toList();

        return new PageImpl<>(content, pageable, lotPage.getTotalElements());
    }

    @Override
    public ClosureDTO createClosure(@Valid CreateClosureRequestDTO request) {
        Long traderId = traderContextService.getCurrentTraderId();

        Lot lot = lotRepository.findById(request.getLotId())
            .orElseThrow(() -> new IllegalArgumentException("Lot not found: " + request.getLotId()));

        if (selfSaleClosureRepository.existsByLotIdAndTraderIdAndIsDeletedFalse(lot.getId(), traderId)) {
            throw new IllegalArgumentException("Lot is already closed as self-sale");
        }

        // Validate lot belongs to this trader (via SellerInVehicle -> Vehicle)
        SellerInVehicle siv = sellerInVehicleRepository.findById(lot.getSellerVehicleId())
            .orElseThrow(() -> new IllegalArgumentException("Lot seller-vehicle not found"));
        Vehicle vehicle = vehicleRepository.findById(siv.getVehicleId())
            .orElseThrow(() -> new IllegalArgumentException("Vehicle not found"));
        if (!Objects.equals(vehicle.getTraderId(), traderId)) {
            throw new IllegalArgumentException("Lot does not belong to current trader");
        }

        int quantity = lot.getBagCount() != null ? lot.getBagCount() : 0;
        BigDecimal rate = request.getRate() != null ? request.getRate() : BigDecimal.ZERO;
        BigDecimal amount = rate.multiply(BigDecimal.valueOf(quantity));

        SelfSaleClosure closure = new SelfSaleClosure();
        closure.setTraderId(traderId);
        closure.setLotId(lot.getId());
        closure.setAppliedRate(rate);
        closure.setBusinessMode(request.getMode());
        closure.setClosedAt(Instant.now());
        closure.setCreatedDate(Instant.now());

        closure = selfSaleClosureRepository.save(closure);

        ClosureDTO dto = selfSaleClosureMapper.toDto(closure);
        dto.setLotName(lot.getLotName());
        dto.setQuantity(quantity);
        dto.setAmount(amount);

        Contact contact = contactRepository.findById(siv.getContactId()).orElse(null);
        dto.setSellerName(contact != null && contact.getName() != null ? contact.getName() : "");
        Commodity commodity = commodityRepository.findById(lot.getCommodityId()).orElse(null);
        dto.setCommodityName(commodity != null && commodity.getCommodityName() != null ? commodity.getCommodityName() : "");

        LOG.debug("Created self-sale closure id={} lotId={}", closure.getId(), lot.getId());
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ClosureDTO> getClosures(Pageable pageable) {
        Long traderId = traderContextService.getCurrentTraderId();
        Page<SelfSaleClosure> page = selfSaleClosureRepository.findByTraderIdAndIsDeletedFalse(traderId, pageable);
        List<SelfSaleClosure> closures = page.getContent();

        if (closures.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, page.getTotalElements());
        }

        List<Long> lotIds = closures.stream().map(SelfSaleClosure::getLotId).distinct().toList();
        List<Lot> lots = lotRepository.findAllById(lotIds);
        Map<Long, Lot> lotById = lots.stream().collect(Collectors.toMap(Lot::getId, l -> l));

        List<Long> sellerVehicleIds = lots.stream().map(Lot::getSellerVehicleId).distinct().toList();
        List<Long> commodityIds = lots.stream().map(Lot::getCommodityId).distinct().toList();
        List<SellerInVehicle> sivList = sellerInVehicleRepository.findAllById(sellerVehicleIds);
        List<Long> contactIds = sivList.stream().map(SellerInVehicle::getContactId).distinct().toList();

        Map<Long, SellerInVehicle> sivById = sivList.stream().collect(Collectors.toMap(SellerInVehicle::getId, siv -> siv));
        List<Contact> contacts = contactRepository.findAllById(contactIds);
        List<Commodity> commodities = commodityRepository.findAllById(commodityIds);
        Map<Long, Contact> contactById = contacts.stream().collect(Collectors.toMap(Contact::getId, c -> c));
        Map<Long, Commodity> commodityById = commodities.stream().collect(Collectors.toMap(Commodity::getId, c -> c));

        List<ClosureDTO> content = closures.stream().map(closure -> {
            ClosureDTO dto = selfSaleClosureMapper.toDto(closure);
            Lot l = lotById.get(closure.getLotId());
            if (l != null) {
                dto.setLotName(l.getLotName());
                dto.setQuantity(l.getBagCount());
                dto.setAmount(closure.getAppliedRate().multiply(BigDecimal.valueOf(l.getBagCount() != null ? l.getBagCount() : 0)));
                SellerInVehicle siv = sivById.get(l.getSellerVehicleId());
                if (siv != null) {
                    Contact c = contactById.get(siv.getContactId());
                    dto.setSellerName(c != null ? c.getName() : "");
                }
                Commodity com = commodityById.get(l.getCommodityId());
                dto.setCommodityName(com != null ? com.getCommodityName() : "");
            }
            return dto;
        }).toList();

        return new PageImpl<>(content, pageable, page.getTotalElements());
    }
}
