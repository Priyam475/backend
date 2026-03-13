package com.mercotrace.service;

import com.mercotrace.domain.*;
import com.mercotrace.domain.enumeration.FreightMethod;
import com.mercotrace.domain.enumeration.VoucherStatus;
import com.mercotrace.repository.*;
import com.mercotrace.service.dto.ArrivalDTOs.ArrivalRequestDTO;
import com.mercotrace.service.dto.ArrivalDTOs.ArrivalSellerDTO;
import com.mercotrace.service.dto.ArrivalDTOs.ArrivalLotDTO;
import com.mercotrace.service.dto.ArrivalDTOs.ArrivalSummaryDTO;
import com.mercotrace.service.dto.ArrivalDTOs.ArrivalDetailDTO;
import com.mercotrace.service.dto.ArrivalDTOs.ArrivalSellerDetailDTO;
import com.mercotrace.service.dto.ArrivalDTOs.ArrivalLotDetailDTO;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for the Arrivals aggregate.
 */
@Service
@Transactional
public class ArrivalService {

    private static final Logger LOG = LoggerFactory.getLogger(ArrivalService.class);

    private final VehicleRepository vehicleRepository;
    private final VehicleWeightRepository vehicleWeightRepository;
    private final SellerInVehicleRepository sellerInVehicleRepository;
    private final LotRepository lotRepository;
    private final FreightCalculationRepository freightCalculationRepository;
    private final FreightDistributionRepository freightDistributionRepository;
    private final VoucherRepository voucherRepository;
    private final DailySerialRepository dailySerialRepository;
    private final CommodityRepository commodityRepository;
    private final ContactRepository contactRepository;
    private final TraderContextService traderContextService;

    public ArrivalService(
        VehicleRepository vehicleRepository,
        VehicleWeightRepository vehicleWeightRepository,
        SellerInVehicleRepository sellerInVehicleRepository,
        LotRepository lotRepository,
        FreightCalculationRepository freightCalculationRepository,
        FreightDistributionRepository freightDistributionRepository,
        VoucherRepository voucherRepository,
        DailySerialRepository dailySerialRepository,
        CommodityRepository commodityRepository,
        ContactRepository contactRepository,
        TraderContextService traderContextService
    ) {
        this.vehicleRepository = vehicleRepository;
        this.vehicleWeightRepository = vehicleWeightRepository;
        this.sellerInVehicleRepository = sellerInVehicleRepository;
        this.lotRepository = lotRepository;
        this.freightCalculationRepository = freightCalculationRepository;
        this.freightDistributionRepository = freightDistributionRepository;
        this.voucherRepository = voucherRepository;
        this.dailySerialRepository = dailySerialRepository;
        this.commodityRepository = commodityRepository;
        this.contactRepository = contactRepository;
        this.traderContextService = traderContextService;
    }

    /**
     * Create a new arrival with vehicle, weight, sellers, lots, and freight side effects.
     */
    public ArrivalSummaryDTO createArrival(@Valid ArrivalRequestDTO request) {
        validateRequest(request);

        Long traderId = resolveTraderId();

        Instant now = Instant.now();
        double netWeight = Math.max(0d, request.getLoadedWeight() - request.getEmptyWeight());
        double finalBillableWeight = Math.max(0d, netWeight - request.getDeductedWeight());

        Vehicle vehicle = new Vehicle();
        String vehicleNumber = normalizeVehicleNumber(request);
        vehicle.setTraderId(traderId);
        vehicle.setVehicleNumber(vehicleNumber);
        vehicle.setArrivalDatetime(now);
        vehicle.setCreatedAt(now);
        vehicle = vehicleRepository.save(vehicle);

        VehicleWeight weight = new VehicleWeight();
        weight.setVehicleId(vehicle.getId());
        weight.setLoadedWeight(request.getLoadedWeight());
        weight.setEmptyWeight(request.getEmptyWeight());
        weight.setDeductedWeight(request.getDeductedWeight());
        weight.setNetWeight(netWeight);
        weight.setRecordedAt(now);
        vehicleWeightRepository.save(weight);

        DailySerial dailySerial = getOrCreateDailySerial(traderId, LocalDate.now());
        int sellerSerial = dailySerial.getSellerSerial() != null ? dailySerial.getSellerSerial() : 0;

        List<SellerInVehicle> sellerLinks = new ArrayList<>();
        List<Lot> lots = new ArrayList<>();

        for (ArrivalSellerDTO sellerDTO : request.getSellers()) {
            // Ensure contact exists
            Long contactId = sellerDTO.getContactId();
            contactRepository.findById(contactId).orElseThrow(() ->
                new IllegalArgumentException("Seller contact not found: " + contactId)
            );

            SellerInVehicle sellerInVehicle = new SellerInVehicle();
            sellerInVehicle.setVehicleId(vehicle.getId());
            sellerInVehicle.setContactId(contactId);
            sellerInVehicle = sellerInVehicleRepository.save(sellerInVehicle);
            sellerLinks.add(sellerInVehicle);

            sellerSerial++;
            for (ArrivalLotDTO lotDTO : sellerDTO.getLots()) {
                Lot lot = new Lot();
                lot.setSellerVehicleId(sellerInVehicle.getId());
                lot.setCommodityId(resolveCommodityId(traderId, lotDTO.getCommodityName()));
                lot.setLotName(lotDTO.getLotName());
                lot.setBagCount(lotDTO.getBagCount());
                lot.setSellerSerialNo(sellerSerial);
                lot.setCreatedAt(now);
                lots.add(lot);
            }
        }

        if (!lots.isEmpty()) {
            lotRepository.saveAll(lots);
        }

        dailySerial.setSellerSerial(sellerSerial);
        if (dailySerial.getLotSerial() == null) {
            dailySerial.setLotSerial(0);
        }
        dailySerialRepository.save(dailySerial);

        double freightTotal = computeFreightTotal(request.getFreightMethod(), request.getFreightRate(), finalBillableWeight, lots, request.isNoRental());

        FreightCalculation freight = new FreightCalculation();
        freight.setVehicleId(vehicle.getId());
        freight.setMethod(request.getFreightMethod());
        freight.setRate(request.getFreightRate());
        freight.setTotalAmount(freightTotal);
        freight.setNoRental(request.isNoRental());
        freight.setAdvancePaid(request.getAdvancePaid());
        freight.setCreatedAt(now);
        freight = freightCalculationRepository.save(freight);

        if (!request.isNoRental() && freightTotal > 0d) {
            createVoucher(traderId, "FREIGHT", vehicle.getId(), freightTotal, now);
        }

        if (request.getAdvancePaid() != null && request.getAdvancePaid() > 0d) {
            createVoucher(traderId, "ADVANCE", vehicle.getId(), request.getAdvancePaid(), now);
        }

        if (request.getFreightMethod() == FreightMethod.DIVIDE_BY_WEIGHT && !lots.isEmpty() && freightTotal > 0d) {
            distributeFreight(freight, lots, freightTotal);
        }

        ArrivalSummaryDTO summary = new ArrivalSummaryDTO();
        summary.setVehicleId(vehicle.getId());
        summary.setVehicleNumber(vehicle.getVehicleNumber());
        summary.setSellerCount(sellerLinks.size());
        summary.setLotCount(lots.size());
        summary.setNetWeight(netWeight);
        summary.setFinalBillableWeight(finalBillableWeight);
        summary.setFreightTotal(freightTotal);
        summary.setFreightMethod(request.getFreightMethod());
        summary.setArrivalDatetime(vehicle.getArrivalDatetime());
        return summary;
    }

    @Transactional(readOnly = true)
    public Page<ArrivalSummaryDTO> listArrivals(Pageable pageable) {
        Long traderId = resolveTraderId();

        Page<Vehicle> vehiclePage = vehicleRepository.findAllByTraderIdOrderByArrivalDatetimeDesc(traderId, pageable);
        List<Vehicle> vehicles = vehiclePage.getContent();

        if (vehicles.isEmpty()) {
            return Page.empty(pageable);
        }

        List<Long> vehicleIds = vehicles.stream().map(Vehicle::getId).toList();

        List<VehicleWeight> weights = vehicleWeightRepository.findAllByVehicleIdIn(vehicleIds);
        List<FreightCalculation> freights = freightCalculationRepository.findAllByVehicleIdIn(vehicleIds);
        List<SellerInVehicle> sellers = sellerInVehicleRepository.findAllByVehicleIdIn(vehicleIds);
        List<Long> sellerVehicleIds = sellers.stream().map(SellerInVehicle::getId).toList();
        List<Lot> lots = sellerVehicleIds.isEmpty() ? List.of() : lotRepository.findAllBySellerVehicleIdIn(sellerVehicleIds);

        List<ArrivalSummaryDTO> content = vehicles.stream().map(v -> {
            Optional<VehicleWeight> weightOpt = weights.stream().filter(w -> w.getVehicleId().equals(v.getId())).findFirst();
            Optional<FreightCalculation> freightOpt = freights.stream().filter(f -> f.getVehicleId().equals(v.getId())).findFirst();

            double netWeight = weightOpt.map(VehicleWeight::getNetWeight).orElse(0d);
            double deducted = weightOpt.map(VehicleWeight::getDeductedWeight).orElse(0d);
            double finalBillable = Math.max(0d, netWeight - deducted);
            double freightTotal = freightOpt.map(FreightCalculation::getTotalAmount).orElse(0d);
            FreightMethod method = freightOpt.map(FreightCalculation::getMethod).orElse(null);

            int sellerCount = (int) sellers.stream().filter(sv -> sv.getVehicleId().equals(v.getId())).count();
            int lotCount = (int) lots.stream().filter(l -> {
                return sellers.stream().anyMatch(sv -> sv.getId().equals(l.getSellerVehicleId()) && sv.getVehicleId().equals(v.getId()));
            }).count();

            ArrivalSummaryDTO dto = new ArrivalSummaryDTO();
            dto.setVehicleId(v.getId());
            dto.setVehicleNumber(v.getVehicleNumber());
            dto.setSellerCount(sellerCount);
            dto.setLotCount(lotCount);
            dto.setNetWeight(netWeight);
            dto.setFinalBillableWeight(finalBillable);
            dto.setFreightTotal(freightTotal);
            dto.setFreightMethod(method);
            dto.setArrivalDatetime(v.getArrivalDatetime());
            return dto;
        }).toList();

        return new PageImpl<>(content, pageable, vehiclePage.getTotalElements());
    }

    /**
     * List arrivals with nested sellers and lots (id, lotName, sellerName) for UIs that need lot-level lookup (e.g. WeighingPage).
     */
    @Transactional(readOnly = true)
    public Page<ArrivalDetailDTO> listArrivalsDetail(Pageable pageable) {
        Long traderId = resolveTraderId();

        Page<Vehicle> vehiclePage = vehicleRepository.findAllByTraderIdOrderByArrivalDatetimeDesc(traderId, pageable);
        List<Vehicle> vehicles = vehiclePage.getContent();

        if (vehicles.isEmpty()) {
            return Page.empty(pageable);
        }

        List<Long> vehicleIds = vehicles.stream().map(Vehicle::getId).toList();
        List<SellerInVehicle> sellers = sellerInVehicleRepository.findAllByVehicleIdIn(vehicleIds);
        List<Long> sellerVehicleIds = sellers.stream().map(SellerInVehicle::getId).toList();
        List<Lot> lots = sellerVehicleIds.isEmpty() ? List.of() : lotRepository.findAllBySellerVehicleIdIn(sellerVehicleIds);
        List<Long> contactIds = sellers.stream().map(SellerInVehicle::getContactId).distinct().toList();
        List<Contact> contacts = contactIds.isEmpty() ? List.of() : contactRepository.findAllById(contactIds);

        java.util.Map<Long, Contact> contactById = contacts.stream()
            .collect(Collectors.toMap(Contact::getId, c -> c));

        List<ArrivalDetailDTO> content = vehicles.stream().map(v -> {
            ArrivalDetailDTO dto = new ArrivalDetailDTO();
            dto.setVehicleId(v.getId());
            dto.setVehicleNumber(v.getVehicleNumber());
            dto.setArrivalDatetime(v.getArrivalDatetime());

            List<SellerInVehicle> vehicleSellers = sellers.stream().filter(sv -> sv.getVehicleId().equals(v.getId())).toList();
            List<ArrivalSellerDetailDTO> sellerDetailList = new ArrayList<>();
            for (SellerInVehicle siv : vehicleSellers) {
                ArrivalSellerDetailDTO sellerDetail = new ArrivalSellerDetailDTO();
                Contact contact = contactById.get(siv.getContactId());
                sellerDetail.setSellerName(contact != null && contact.getName() != null ? contact.getName() : "");
                sellerDetail.setContactId(siv.getContactId());
                sellerDetail.setOrigin(contact != null && contact.getAddress() != null ? contact.getAddress() : "");
                List<Lot> sellerLots = lots.stream().filter(l -> l.getSellerVehicleId().equals(siv.getId())).toList();
                List<ArrivalLotDetailDTO> lotDetails = sellerLots.stream().map(lot -> {
                    ArrivalLotDetailDTO ld = new ArrivalLotDetailDTO();
                    ld.setId(lot.getId());
                    ld.setLotName(lot.getLotName());
                    return ld;
                }).toList();
                sellerDetail.setLots(lotDetails);
                sellerDetailList.add(sellerDetail);
            }
            dto.setSellers(sellerDetailList);
            return dto;
        }).toList();

        return new PageImpl<>(content, pageable, vehiclePage.getTotalElements());
    }

    private void validateRequest(ArrivalRequestDTO request) {
        if (request.getSellers() == null || request.getSellers().isEmpty()) {
            throw new IllegalArgumentException("At least one seller is required");
        }
        for (ArrivalSellerDTO seller : request.getSellers()) {
            if (seller.getLots() == null || seller.getLots().isEmpty()) {
                throw new IllegalArgumentException("Each seller must have at least one lot");
            }
            for (ArrivalLotDTO lot : seller.getLots()) {
                if (lot.getLotName() == null || lot.getLotName().isBlank()) {
                    throw new IllegalArgumentException("Lot name is required");
                }
                if (lot.getBagCount() <= 0) {
                    throw new IllegalArgumentException("Lot bag count must be greater than 0");
                }
            }
        }
        if (request.isMultiSeller()) {
            if (request.getVehicleNumber() == null || request.getVehicleNumber().isBlank()) {
                throw new IllegalArgumentException("Vehicle number is required for multi-seller arrivals");
            }
        }
    }

    private Long resolveTraderId() {
        return traderContextService.getCurrentTraderId();
    }

    private DailySerial getOrCreateDailySerial(Long traderId, LocalDate date) {
        return dailySerialRepository
            .findOneByTraderIdAndSerialDate(traderId, date)
            .orElseGet(() -> {
                DailySerial serial = new DailySerial();
                serial.setTraderId(traderId);
                serial.setSerialDate(date);
                serial.setSellerSerial(0);
                serial.setLotSerial(0);
                return dailySerialRepository.save(serial);
            });
    }

    private Long resolveCommodityId(Long traderId, String commodityName) {
        return commodityRepository
            .findOneByTraderIdAndCommodityNameIgnoreCase(traderId, commodityName)
            .map(Commodity::getId)
            .orElseThrow(() -> new IllegalArgumentException("Commodity not found: " + commodityName));
    }

    private double computeFreightTotal(
        FreightMethod method,
        Double rate,
        double finalBillableWeight,
        List<Lot> lots,
        boolean noRental
    ) {
        if (noRental) {
            return 0d;
        }
        double safeRate = rate != null ? rate : 0d;
        switch (method) {
            case BY_WEIGHT:
                return finalBillableWeight * safeRate;
            case BY_COUNT:
                int totalBags = lots.stream().mapToInt(l -> l.getBagCount() != null ? l.getBagCount() : 0).sum();
                return totalBags * safeRate;
            case LUMPSUM:
            case DIVIDE_BY_WEIGHT:
                return safeRate;
            default:
                return 0d;
        }
    }

    private void createVoucher(Long traderId, String referenceType, Long referenceId, double amount, Instant now) {
        Voucher voucher = new Voucher();
        voucher.setTraderId(traderId);
        voucher.setReferenceType(referenceType);
        voucher.setReferenceId(referenceId);
        voucher.setAmount(BigDecimal.valueOf(amount));
        voucher.setStatus(VoucherStatus.OPEN);
        voucher.setCreatedAt(now);
        voucherRepository.save(voucher);
    }

    private void distributeFreight(FreightCalculation freight, List<Lot> lots, double freightTotal) {
        int totalBags = lots.stream().mapToInt(l -> l.getBagCount() != null ? l.getBagCount() : 0).sum();
        if (totalBags <= 0) {
            return;
        }
        List<FreightDistribution> rows = new ArrayList<>();
        for (Lot lot : lots) {
            double share = (double) lot.getBagCount() / (double) totalBags;
            double amount = freightTotal * share;
            FreightDistribution fd = new FreightDistribution();
            fd.setFreightId(freight.getId());
            fd.setLotId(lot.getId());
            fd.setAllocatedAmount(amount);
            rows.add(fd);
        }
        freightDistributionRepository.saveAll(rows);
    }

    private String normalizeVehicleNumber(ArrivalRequestDTO request) {
        if (!request.isMultiSeller()) {
            String provided = request.getVehicleNumber();
            if (provided == null || provided.isBlank()) {
                return "SINGLE-SELLER";
            }
            return provided.trim().toUpperCase();
        }
        return request.getVehicleNumber() != null ? request.getVehicleNumber().trim().toUpperCase() : "";
    }
}

