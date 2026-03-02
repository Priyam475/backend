package com.mercotrace.service.impl;

import com.mercotrace.domain.*;
import com.mercotrace.repository.*;
import com.mercotrace.service.AuctionService;
import com.mercotrace.service.SettlementService;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.dto.AuctionResultDTO;
import com.mercotrace.service.dto.AuctionResultEntryDTO;
import com.mercotrace.service.dto.SettlementDTOs.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
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
 * Implementation of {@link SettlementService}. Builds seller list from auction results
 * and arrival/weighing data; CRUD for Sales Patti.
 */
@Service
@Transactional
public class SettlementServiceImpl implements SettlementService {

    private static final Logger LOG = LoggerFactory.getLogger(SettlementServiceImpl.class);
    private static final DateTimeFormatter PATTI_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final int MAX_RESULTS_FOR_SELLERS = 2000;

    private final TraderContextService traderContextService;
    private final LotRepository lotRepository;
    private final AuctionService auctionService;
    private final PattiRepository pattiRepository;
    private final WeighingSessionRepository weighingSessionRepository;
    private final SellerInVehicleRepository sellerInVehicleRepository;
    private final ContactRepository contactRepository;
    private final VehicleRepository vehicleRepository;
    private final CommodityRepository commodityRepository;

    public SettlementServiceImpl(
        TraderContextService traderContextService,
        LotRepository lotRepository,
        AuctionService auctionService,
        PattiRepository pattiRepository,
        WeighingSessionRepository weighingSessionRepository,
        SellerInVehicleRepository sellerInVehicleRepository,
        ContactRepository contactRepository,
        VehicleRepository vehicleRepository,
        CommodityRepository commodityRepository
    ) {
        this.traderContextService = traderContextService;
        this.lotRepository = lotRepository;
        this.auctionService = auctionService;
        this.pattiRepository = pattiRepository;
        this.weighingSessionRepository = weighingSessionRepository;
        this.sellerInVehicleRepository = sellerInVehicleRepository;
        this.contactRepository = contactRepository;
        this.vehicleRepository = vehicleRepository;
        this.commodityRepository = commodityRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SellerSettlementDTO> listSellers(Pageable pageable, String search) {
        Long traderId = traderContextService.getCurrentTraderId();
        List<Lot> traderLots = lotRepository.findAllByTraderId(traderId, Pageable.unpaged()).getContent();
        if (traderLots.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, 0);
        }
        List<Long> lotIds = traderLots.stream().map(Lot::getId).toList();
        Page<AuctionResultDTO> resultsPage = auctionService.listResultsByLotIds(
            lotIds,
            Pageable.ofSize(MAX_RESULTS_FOR_SELLERS)
        );
        List<AuctionResultDTO> results = resultsPage.getContent();
        if (results.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, 0);
        }

        Set<Long> sivIds = traderLots.stream().map(Lot::getSellerVehicleId).collect(Collectors.toSet());
        List<SellerInVehicle> sivs = sellerInVehicleRepository.findAllById(sivIds);
        Set<Long> contactIds = sivs.stream().map(SellerInVehicle::getContactId).collect(Collectors.toSet());
        Set<Long> vehicleIds = sivs.stream().map(SellerInVehicle::getVehicleId).collect(Collectors.toSet());
        Set<Long> commodityIds = traderLots.stream().map(Lot::getCommodityId).collect(Collectors.toSet());

        Map<Long, Contact> contactMap = contactRepository.findAllById(contactIds).stream().collect(Collectors.toMap(Contact::getId, c -> c));
        Map<Long, Vehicle> vehicleMap = vehicleRepository.findAllById(vehicleIds).stream().collect(Collectors.toMap(Vehicle::getId, v -> v));
        Map<Long, Commodity> commodityMap = commodityRepository.findAllById(commodityIds).stream().collect(Collectors.toMap(Commodity::getId, c -> c));
        Map<Long, Lot> lotMap = traderLots.stream().collect(Collectors.toMap(Lot::getId, l -> l));
        Map<Long, SellerInVehicle> sivMap = sivs.stream().collect(Collectors.toMap(SellerInVehicle::getId, s -> s));

        List<WeighingSession> weighingSessions = weighingSessionRepository.findAllByTraderIdOrderByCreatedDateDesc(
            traderId, Pageable.ofSize(MAX_RESULTS_FOR_SELLERS)).getContent();
        Map<Integer, BigDecimal> bidToWeight = weighingSessions.stream()
            .collect(Collectors.toMap(WeighingSession::getBidNumber, WeighingSession::getNetWeight, (a, b) -> a));

        Map<String, SellerSettlementDTO> sellerMap = new LinkedHashMap<>();
        for (AuctionResultDTO ar : results) {
            Lot lot = lotMap.get(ar.getLotId());
            if (lot == null) continue;
            SellerInVehicle siv = sivMap.get(lot.getSellerVehicleId());
            if (siv == null) continue;
            Contact contact = contactMap.get(siv.getContactId());
            Vehicle vehicle = vehicleMap.get(siv.getVehicleId());
            Commodity commodity = lot.getCommodityId() != null ? commodityMap.get(lot.getCommodityId()) : null;
            String sellerName = contact != null ? contact.getName() : "Unknown";
            String sellerMark = contact != null ? (contact.getMark() != null ? contact.getMark() : "") : "";
            String vehicleNumber = vehicle != null ? vehicle.getVehicleNumber() : "";
            String sellerIdKey = String.valueOf(lot.getSellerVehicleId());

            SellerSettlementDTO seller = sellerMap.computeIfAbsent(sellerIdKey, k -> {
                SellerSettlementDTO dto = new SellerSettlementDTO();
                dto.setSellerId(sellerIdKey);
                dto.setSellerName(sellerName);
                dto.setSellerMark(sellerMark);
                dto.setVehicleNumber(vehicleNumber);
                dto.setLots(new ArrayList<>());
                return dto;
            });

            String lotIdStr = String.valueOf(ar.getLotId());
            SettlementLotDTO lotDto = seller.getLots().stream().filter(l -> lotIdStr.equals(l.getLotId())).findFirst().orElse(null);
            if (lotDto == null) {
                lotDto = new SettlementLotDTO();
                lotDto.setLotId(lotIdStr);
                lotDto.setLotName(ar.getLotName() != null ? ar.getLotName() : "");
                lotDto.setCommodityName(commodity != null ? commodity.getCommodityName() : "");
                lotDto.setEntries(new ArrayList<>());
                seller.getLots().add(lotDto);
            }

            for (AuctionResultEntryDTO entry : ar.getEntries()) {
                SettlementEntryDTO se = new SettlementEntryDTO();
                se.setBidNumber(entry.getBidNumber());
                se.setBuyerMark(entry.getBuyerMark());
                se.setBuyerName(entry.getBuyerName());
                se.setRate(entry.getRate());
                se.setQuantity(entry.getQuantity());
                BigDecimal weight = bidToWeight.getOrDefault(entry.getBidNumber(), entry.getQuantity() != null ? BigDecimal.valueOf(entry.getQuantity() * 50) : BigDecimal.ZERO);
                se.setWeight(weight);
                lotDto.getEntries().add(se);
            }
        }

        List<SellerSettlementDTO> allSellers = new ArrayList<>(sellerMap.values());
        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase().trim();
            allSellers = allSellers.stream()
                .filter(s -> (s.getSellerName() != null && s.getSellerName().toLowerCase().contains(q))
                    || (s.getSellerMark() != null && s.getSellerMark().toLowerCase().contains(q))
                    || (s.getVehicleNumber() != null && s.getVehicleNumber().toLowerCase().contains(q)))
                .toList();
        }
        int total = allSellers.size();
        int from = (int) pageable.getOffset();
        int to = Math.min(from + pageable.getPageSize(), total);
        List<SellerSettlementDTO> pageContent = from < total ? allSellers.subList(from, to) : List.of();
        return new PageImpl<>(pageContent, pageable, total);
    }

    @Override
    @Transactional(readOnly = false)
    public PattiDTO createPatti(PattiSaveRequest request) {
        Long traderId = traderContextService.getCurrentTraderId();
        String pattiId = generateNextPattiId();
        Patti entity = new Patti();
        entity.setTraderId(traderId);
        entity.setPattiId(pattiId);
        entity.setSellerId(request.getSellerId());
        entity.setSellerName(request.getSellerName());
        entity.setGrossAmount(request.getGrossAmount());
        entity.setTotalDeductions(request.getTotalDeductions());
        entity.setNetPayable(request.getNetPayable());
        entity.setUseAverageWeight(Boolean.TRUE.equals(request.getUseAverageWeight()));
        entity = pattiRepository.save(entity);
        mapRequestDeductionsAndClustersToEntity(request, entity);
        pattiRepository.save(entity);
        return toPattiDTO(pattiRepository.findById(entity.getId()).orElseThrow());
    }

    private void mapRequestDeductionsAndClustersToEntity(PattiSaveRequest request, Patti entity) {
        int so = 0;
        for (RateClusterDTO rc : request.getRateClusters()) {
            PattiRateCluster c = new PattiRateCluster();
            c.setPatti(entity);
            c.setRate(rc.getRate());
            c.setTotalQuantity(rc.getTotalQuantity() != null ? rc.getTotalQuantity() : 0);
            c.setTotalWeight(rc.getTotalWeight() != null ? rc.getTotalWeight() : BigDecimal.ZERO);
            c.setAmount(rc.getAmount() != null ? rc.getAmount() : BigDecimal.ZERO);
            c.setSortOrder(so++);
            entity.getRateClusters().add(c);
        }
        so = 0;
        for (DeductionItemDTO d : request.getDeductions()) {
            PattiDeduction pd = new PattiDeduction();
            pd.setPatti(entity);
            pd.setDeductionKey(d.getKey());
            pd.setLabel(d.getLabel());
            pd.setAmount(d.getAmount() != null ? d.getAmount() : BigDecimal.ZERO);
            pd.setEditable(Boolean.TRUE.equals(d.getEditable()));
            pd.setAutoPulled(Boolean.TRUE.equals(d.getAutoPulled()));
            pd.setSortOrder(so++);
            entity.getDeductions().add(pd);
        }
    }

    private String generateNextPattiId() {
        String datePrefix = "PT-" + LocalDate.now(ZoneId.systemDefault()).format(PATTI_DATE) + "-";
        Optional<Patti> last = pattiRepository.findTopByPattiIdStartingWithOrderByIdDesc(datePrefix);
        int next = 1;
        if (last.isPresent()) {
            String id = last.get().getPattiId();
            if (id != null && id.length() > datePrefix.length()) {
                try {
                    next = Integer.parseInt(id.substring(datePrefix.length())) + 1;
                } catch (NumberFormatException e) {
                    LOG.warn("Could not parse patti counter from {}", id);
                }
            }
        }
        return datePrefix + String.format("%04d", next);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PattiDTO> getPattiById(Long id) {
        return pattiRepository.findById(id).map(this::toPattiDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PattiDTO> getPattiByPattiId(String pattiId) {
        return pattiRepository.findByPattiId(pattiId).map(this::toPattiDTO);
    }

    @Override
    @Transactional(readOnly = false)
    public Optional<PattiDTO> updatePatti(Long id, PattiSaveRequest request) {
        return pattiRepository.findById(id).map(patti -> {
            patti.setSellerName(request.getSellerName());
            patti.setGrossAmount(request.getGrossAmount());
            patti.setTotalDeductions(request.getTotalDeductions());
            patti.setNetPayable(request.getNetPayable());
            patti.setUseAverageWeight(Boolean.TRUE.equals(request.getUseAverageWeight()));
            patti.getRateClusters().clear();
            patti.getDeductions().clear();
            mapRequestDeductionsAndClustersToEntity(request, patti);
            return pattiRepository.save(patti);
        }).map(this::toPattiDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PattiDTO> listPattis(Pageable pageable) {
        Long traderId = traderContextService.getCurrentTraderId();
        return pattiRepository.findAllByTraderIdOrderByCreatedDateDesc(traderId, pageable).map(this::toPattiDTO);
    }

    private PattiDTO toPattiDTO(Patti e) {
        PattiDTO dto = new PattiDTO();
        dto.setId(e.getId());
        dto.setPattiId(e.getPattiId());
        dto.setSellerId(e.getSellerId());
        dto.setSellerName(e.getSellerName());
        dto.setGrossAmount(e.getGrossAmount());
        dto.setTotalDeductions(e.getTotalDeductions());
        dto.setNetPayable(e.getNetPayable());
        dto.setCreatedAt(e.getCreatedDate());
        dto.setUseAverageWeight(e.getUseAverageWeight());
        for (PattiRateCluster c : e.getRateClusters()) {
            RateClusterDTO rc = new RateClusterDTO();
            rc.setRate(c.getRate());
            rc.setTotalQuantity(c.getTotalQuantity());
            rc.setTotalWeight(c.getTotalWeight());
            rc.setAmount(c.getAmount());
            dto.getRateClusters().add(rc);
        }
        for (PattiDeduction d : e.getDeductions()) {
            DeductionItemDTO dd = new DeductionItemDTO();
            dd.setKey(d.getDeductionKey());
            dd.setLabel(d.getLabel());
            dd.setAmount(d.getAmount());
            dd.setEditable(d.getEditable());
            dd.setAutoPulled(d.getAutoPulled());
            dto.getDeductions().add(dd);
        }
        return dto;
    }
}
