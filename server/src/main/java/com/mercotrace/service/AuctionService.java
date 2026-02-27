package com.mercotrace.service;

import com.mercotrace.domain.Auction;
import com.mercotrace.domain.AuctionEntry;
import com.mercotrace.domain.Commodity;
import com.mercotrace.domain.Contact;
import com.mercotrace.domain.Lot;
import com.mercotrace.domain.SellerInVehicle;
import com.mercotrace.domain.Vehicle;
import com.mercotrace.domain.enumeration.AuctionPresetType;
import com.mercotrace.repository.AuctionEntryRepository;
import com.mercotrace.repository.AuctionRepository;
import com.mercotrace.repository.CommodityRepository;
import com.mercotrace.repository.ContactRepository;
import com.mercotrace.repository.LotRepository;
import com.mercotrace.repository.SellerInVehicleRepository;
import com.mercotrace.repository.VehicleRepository;
import com.mercotrace.service.dto.*;
import com.mercotrace.service.mapper.AuctionEntryMapper;
import jakarta.persistence.EntityNotFoundException;
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
 * Service layer for Auction (Sales Pad) operations.
 */
@Service
@Transactional
public class AuctionService {

    private static final Logger LOG = LoggerFactory.getLogger(AuctionService.class);

    private final AuctionRepository auctionRepository;
    private final AuctionEntryRepository auctionEntryRepository;
    private final LotRepository lotRepository;
    private final AuctionEntryMapper auctionEntryMapper;
    private final SellerInVehicleRepository sellerInVehicleRepository;
    private final VehicleRepository vehicleRepository;
    private final ContactRepository contactRepository;
    private final CommodityRepository commodityRepository;

    public AuctionService(
        AuctionRepository auctionRepository,
        AuctionEntryRepository auctionEntryRepository,
        LotRepository lotRepository,
        AuctionEntryMapper auctionEntryMapper,
        SellerInVehicleRepository sellerInVehicleRepository,
        VehicleRepository vehicleRepository,
        ContactRepository contactRepository,
        CommodityRepository commodityRepository
    ) {
        this.auctionRepository = auctionRepository;
        this.auctionEntryRepository = auctionEntryRepository;
        this.lotRepository = lotRepository;
        this.auctionEntryMapper = auctionEntryMapper;
        this.sellerInVehicleRepository = sellerInVehicleRepository;
        this.vehicleRepository = vehicleRepository;
        this.contactRepository = contactRepository;
        this.commodityRepository = commodityRepository;
    }

    /**
     * List lots with auction-derived status and optional search, for Sales Pad lot selector.
     */
    @Transactional(readOnly = true)
    public Page<LotSummaryDTO> listLotsWithStatus(Pageable pageable, String statusFilter, String q) {
        Page<Lot> lotPage = (q != null && !q.isBlank())
            ? lotRepository.findAllByLotNameContainingIgnoreCase(q.trim(), pageable)
            : lotRepository.findAll(pageable);
        List<Lot> lots = lotPage.getContent();
        if (lots.isEmpty()) {
            return Page.empty(pageable);
        }
        List<Long> lotIds = lots.stream().map(Lot::getId).toList();
        Set<Long> sellerVehicleIds = lots.stream().map(Lot::getSellerVehicleId).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> commodityIds = lots.stream().map(Lot::getCommodityId).filter(Objects::nonNull).collect(Collectors.toSet());

        Map<Long, SellerInVehicle> sivMap = sellerInVehicleRepository.findAllById(sellerVehicleIds).stream()
            .collect(Collectors.toMap(SellerInVehicle::getId, s -> s));
        Set<Long> vehicleIds = sivMap.values().stream().map(SellerInVehicle::getVehicleId).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> contactIds = sivMap.values().stream().map(SellerInVehicle::getContactId).filter(Objects::nonNull).collect(Collectors.toSet());

        Map<Long, Vehicle> vehicleMap = vehicleRepository.findAllById(vehicleIds).stream()
            .collect(Collectors.toMap(Vehicle::getId, v -> v));
        Map<Long, Contact> contactMap = contactRepository.findAllById(contactIds).stream()
            .collect(Collectors.toMap(Contact::getId, c -> c));
        Map<Long, Commodity> commodityMap = commodityRepository.findAllById(commodityIds).stream()
            .collect(Collectors.toMap(Commodity::getId, c -> c));

        List<Auction> auctions = auctionRepository.findAllByLotIdIn(lotIds);
        Set<Long> auctionIds = auctions.stream().map(Auction::getId).collect(Collectors.toSet());
        List<AuctionEntry> entries = auctionIds.isEmpty() ? List.of() : auctionEntryRepository.findAllByAuctionIdIn(auctionIds);

        Map<Long, List<Auction>> lotToAuctions = auctions.stream().collect(Collectors.groupingBy(Auction::getLotId));
        Map<Long, List<AuctionEntry>> auctionToEntries = entries.stream().collect(Collectors.groupingBy(AuctionEntry::getAuctionId));

        List<LotSummaryDTO> content = new ArrayList<>();
        for (Lot lot : lots) {
            LotSummaryDTO dto = toLotSummaryDTO(
                lot,
                sivMap.get(lot.getSellerVehicleId()),
                vehicleMap,
                contactMap,
                commodityMap.get(lot.getCommodityId()),
                lotToAuctions.getOrDefault(lot.getId(), List.of()),
                auctionToEntries
            );
            if (statusFilter == null || statusFilter.isBlank() || statusFilter.equalsIgnoreCase(dto.getStatus())) {
                content.add(dto);
            }
        }
        return new PageImpl<>(content, pageable, lotPage.getTotalElements());
    }

    private LotSummaryDTO toLotSummaryDTO(
        Lot lot,
        SellerInVehicle siv,
        Map<Long, Vehicle> vehicleMap,
        Map<Long, Contact> contactMap,
        Commodity commodity,
        List<Auction> lotAuctions,
        Map<Long, List<AuctionEntry>> auctionToEntries
    ) {
        LotSummaryDTO dto = new LotSummaryDTO();
        dto.setLotId(lot.getId());
        dto.setLotName(lot.getLotName());
        dto.setBagCount(lot.getBagCount());
        dto.setOriginalBagCount(lot.getBagCount());
        dto.setSellerVehicleId(lot.getSellerVehicleId());
        dto.setWasModified(false);

        if (siv != null) {
            Vehicle v = vehicleMap.get(siv.getVehicleId());
            Contact c = contactMap.get(siv.getContactId());
            dto.setVehicleNumber(v != null ? v.getVehicleNumber() : null);
            dto.setSellerName(c != null ? c.getName() : null);
            dto.setSellerMark(c != null ? c.getMark() : null);
        }
        dto.setCommodityName(commodity != null ? commodity.getCommodityName() : null);

        Optional<Auction> latestAuction = lotAuctions.stream()
            .max(Comparator.comparing(Auction::getAuctionDatetime, Comparator.nullsLast(Comparator.naturalOrder())));
        int soldBags = 0;
        if (latestAuction.isPresent()) {
            List<AuctionEntry> ent = auctionToEntries.getOrDefault(latestAuction.get().getId(), List.of());
            soldBags = ent.stream().mapToInt(e -> e.getQuantity() != null ? e.getQuantity() : 0).sum();
        }
        dto.setSoldBags(soldBags);

        int bagCount = lot.getBagCount() != null ? lot.getBagCount() : 0;
        int remaining = Math.max(0, bagCount - soldBags);
        String status;
        if (latestAuction.isEmpty() || auctionToEntries.getOrDefault(latestAuction.get().getId(), List.of()).isEmpty()) {
            status = "AVAILABLE";
        } else if (latestAuction.get().getCompletedAt() != null) {
            status = remaining == 0 ? "SOLD" : "PARTIAL";
        } else {
            status = remaining == 0 ? "SOLD" : "PENDING";
        }
        dto.setStatus(status);
        return dto;
    }

    /**
     * Get or start an auction session for a lot.
     */
    public AuctionSessionDTO getOrStartSession(Long lotId) {
        Lot lot = lotRepository.findById(lotId).orElseThrow(() -> new EntityNotFoundException("Lot not found: " + lotId));

        Auction auction = auctionRepository
            .findFirstByLotIdOrderByAuctionDatetimeDesc(lotId)
            .orElseGet(() -> {
                Auction a = new Auction();
                a.setLotId(lotId);
                a.setAuctionDatetime(Instant.now());
                a.setCreatedAt(Instant.now());
                // trader context can be integrated later; for now use null / default
                return auctionRepository.save(a);
            });

        List<AuctionEntry> entries = auctionEntryRepository.findAllByAuctionId(auction.getId());

        return buildSessionDTO(auction, lot, entries);
    }

    /**
     * Add a bid to the current auction for the lot.
     */
    public AuctionSessionDTO addBid(Long lotId, @Valid AuctionBidCreateRequest request) {
        Lot lot = lotRepository.findById(lotId).orElseThrow(() -> new EntityNotFoundException("Lot not found: " + lotId));
        Auction auction = auctionRepository
            .findFirstByLotIdOrderByAuctionDatetimeDesc(lotId)
            .orElseGet(() -> {
                Auction a = new Auction();
                a.setLotId(lotId);
                a.setAuctionDatetime(Instant.now());
                a.setCreatedAt(Instant.now());
                return auctionRepository.save(a);
            });

        List<AuctionEntry> existingEntries = auctionEntryRepository.findAllByAuctionId(auction.getId());

        int currentSold = existingEntries.stream().mapToInt(e -> e.getQuantity() != null ? e.getQuantity() : 0).sum();
        int requestedQty = request.getQuantity();
        int lotTotal = lot.getBagCount() != null ? lot.getBagCount() : 0;
        int newTotal = currentSold + requestedQty;

        if (newTotal > lotTotal && !request.isAllowLotIncrease()) {
            throw new AuctionConflictException("Adding this bid exceeds lot quantity", "quantity", currentSold, lotTotal, requestedQty, newTotal);
        }

        if (newTotal > lotTotal && request.isAllowLotIncrease()) {
            lot.setBagCount(newTotal);
            lotRepository.save(lot);
        }

        // Duplicate mark logic – merge when same mark and same rate and not self-sale
        AuctionEntry merged = null;
        if (!request.isSelfSale()) {
            merged =
                existingEntries
                    .stream()
                    .filter(e -> Boolean.FALSE.equals(e.getIsSelfSale()))
                    .filter(e -> e.getBuyerMark() != null && e.getBuyerMark().equals(request.getBuyerMark()))
                    .filter(e -> e.getBidRate() != null && e.getBidRate().compareTo(request.getRate()) == 0)
                    .findFirst()
                    .orElse(null);
        }

        if (merged != null) {
            int newQty = merged.getQuantity() + requestedQty;
            merged.setQuantity(newQty);
            merged.setAmount(merged.getBidRate().multiply(BigDecimal.valueOf(newQty)));
            merged.setLastModifiedDate(Instant.now());
            auctionEntryRepository.save(merged);
        } else {
            AuctionEntry entry = new AuctionEntry();
            entry.setAuctionId(auction.getId());
            entry.setBuyerId(request.getBuyerId());
            entry.setBuyerName(request.getBuyerName());
            entry.setBuyerMark(request.getBuyerMark());

            // Assign next bid number in a simple monotonic fashion per auction
            int nextBidNumber = existingEntries.stream().map(AuctionEntry::getBidNumber).max(Integer::compareTo).orElse(0) + 1;
            entry.setBidNumber(nextBidNumber);

            BigDecimal rate = request.getRate();
            BigDecimal preset = request.getPresetApplied() != null ? request.getPresetApplied() : BigDecimal.ZERO;
            AuctionPresetType type = request.getPresetType() != null ? request.getPresetType() : AuctionPresetType.PROFIT;
            BigDecimal extra = request.getExtraRate() != null ? request.getExtraRate() : BigDecimal.ZERO;

            entry.setBidRate(rate);
            entry.setPresetMargin(preset);
            entry.setPresetType(type);

            BigDecimal sellerRate = calcSellerRate(rate, preset, type);
            entry.setSellerRate(sellerRate);
            entry.setBuyerRate(rate.add(extra));

            entry.setQuantity(request.getQuantity());
            entry.setAmount(entry.getBuyerRate().multiply(BigDecimal.valueOf(request.getQuantity())));
            entry.setIsSelfSale(request.isSelfSale());
            entry.setIsScribble(request.isScribble());
            entry.setTokenAdvance(request.getTokenAdvance() != null ? request.getTokenAdvance() : BigDecimal.ZERO);
            entry.setExtraRate(extra);
            entry.setCreatedAt(Instant.now());

            auctionEntryRepository.save(entry);
        }

        List<AuctionEntry> refreshed = auctionEntryRepository.findAllByAuctionId(auction.getId());
        return buildSessionDTO(auction, lot, refreshed);
    }

    /**
     * Update editable fields on an existing bid.
     */
    public AuctionSessionDTO updateBid(Long lotId, Long bidId, AuctionBidUpdateRequest request) {
        Lot lot = lotRepository.findById(lotId).orElseThrow(() -> new EntityNotFoundException("Lot not found: " + lotId));
        AuctionEntry entry = auctionEntryRepository.findById(bidId).orElseThrow(() -> new EntityNotFoundException("Bid not found: " + bidId));
        Auction auction = auctionRepository
            .findById(entry.getAuctionId())
            .orElseThrow(() -> new EntityNotFoundException("Auction not found for bid: " + bidId));

        if (request.getTokenAdvance() != null) {
            entry.setTokenAdvance(request.getTokenAdvance());
        }
        if (request.getExtraRate() != null) {
            entry.setExtraRate(request.getExtraRate());
        }
        if (request.getPresetApplied() != null) {
            entry.setPresetMargin(request.getPresetApplied());
        }
        if (request.getPresetType() != null) {
            entry.setPresetType(request.getPresetType());
        }

        BigDecimal sellerRate = calcSellerRate(entry.getBidRate(), entry.getPresetMargin(), entry.getPresetType());
        entry.setSellerRate(sellerRate);
        entry.setBuyerRate(entry.getBidRate().add(entry.getExtraRate() != null ? entry.getExtraRate() : BigDecimal.ZERO));
        entry.setAmount(entry.getBuyerRate().multiply(BigDecimal.valueOf(entry.getQuantity())));
        entry.setLastModifiedDate(Instant.now());

        auctionEntryRepository.save(entry);
        List<AuctionEntry> refreshed = auctionEntryRepository.findAllByAuctionId(auction.getId());
        return buildSessionDTO(auction, lot, refreshed);
    }

    /**
     * Delete a bid from the auction session.
     */
    public AuctionSessionDTO deleteBid(Long lotId, Long bidId) {
        Lot lot = lotRepository.findById(lotId).orElseThrow(() -> new EntityNotFoundException("Lot not found: " + lotId));
        AuctionEntry entry = auctionEntryRepository.findById(bidId).orElseThrow(() -> new EntityNotFoundException("Bid not found: " + bidId));
        Auction auction = auctionRepository
            .findById(entry.getAuctionId())
            .orElseThrow(() -> new EntityNotFoundException("Auction not found for bid: " + bidId));

        auctionEntryRepository.delete(entry);
        List<AuctionEntry> refreshed = auctionEntryRepository.findAllByAuctionId(auction.getId());
        return buildSessionDTO(auction, lot, refreshed);
    }

    /**
     * Complete an auction for a lot and generate AuctionResultDTO.
     */
    public AuctionResultDTO completeAuction(Long lotId) {
        Lot lot = lotRepository.findById(lotId).orElseThrow(() -> new EntityNotFoundException("Lot not found: " + lotId));

        Auction auction = auctionRepository
            .findFirstByLotIdOrderByAuctionDatetimeDesc(lotId)
            .orElseThrow(() -> new EntityNotFoundException("No auction exists for lot: " + lotId));

        List<AuctionEntry> entries = auctionEntryRepository.findAllByAuctionId(auction.getId());
        if (entries.isEmpty()) {
            throw new AuctionConflictException("Cannot complete auction without bids", "entries", 0, 0, 0, 0);
        }

        int sold = entries.stream().mapToInt(e -> e.getQuantity() != null ? e.getQuantity() : 0).sum();
        int bagCount = lot.getBagCount() != null ? lot.getBagCount() : 0;
        if (sold < bagCount) {
            LOG.warn("Completing auction for lot {} with partial sale: sold={} bagCount={}", lotId, sold, bagCount);
        }

        auction.setCompletedAt(Instant.now());
        auctionRepository.save(auction);

        return buildResultDTO(auction, lot, entries);
    }

    @Transactional(readOnly = true)
    public Page<AuctionResultDTO> listResults(Pageable pageable) {
        Page<Auction> page = auctionRepository.findByCompletedAtIsNotNull(pageable);
        List<Auction> auctions = page.getContent();
        if (auctions.isEmpty()) {
            return Page.empty(pageable);
        }
        List<Long> auctionIds = auctions.stream().map(Auction::getId).toList();
        List<AuctionEntry> entries = auctionEntryRepository.findAllByAuctionIdIn(auctionIds);
        List<Lot> lots = lotRepository.findAllById(auctions.stream().map(Auction::getLotId).toList());

        List<AuctionResultDTO> content = auctions
            .stream()
            .map(a -> {
                Lot lot = lots.stream().filter(l -> l.getId().equals(a.getLotId())).findFirst().orElse(null);
                List<AuctionEntry> aEntries = entries.stream().filter(e -> e.getAuctionId().equals(a.getId())).toList();
                return buildResultDTO(a, lot, aEntries);
            })
            .collect(Collectors.toList());

        return new PageImpl<>(content, pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public Optional<AuctionResultDTO> getResultByLot(Long lotId) {
        Optional<Auction> auctionOpt = auctionRepository.findFirstByLotIdOrderByAuctionDatetimeDesc(lotId);
        if (auctionOpt.isEmpty()) {
            return Optional.empty();
        }
        Auction auction = auctionOpt.get();
        Lot lot = lotRepository.findById(lotId).orElse(null);
        List<AuctionEntry> entries = auctionEntryRepository.findAllByAuctionId(auction.getId());
        return Optional.of(buildResultDTO(auction, lot, entries));
    }

    @Transactional(readOnly = true)
    public Optional<AuctionResultDTO> getResultByBidNumber(Integer bidNumber) {
        Optional<AuctionEntry> entryOpt = auctionEntryRepository.findFirstByBidNumber(bidNumber);
        if (entryOpt.isEmpty()) {
            return Optional.empty();
        }
        AuctionEntry entry = entryOpt.get();
        Auction auction = auctionRepository
            .findById(entry.getAuctionId())
            .orElseThrow(() -> new EntityNotFoundException("Auction not found for bid: " + bidNumber));
        Lot lot = lotRepository.findById(auction.getLotId()).orElse(null);
        List<AuctionEntry> entries = auctionEntryRepository.findAllByAuctionId(auction.getId());
        return Optional.of(buildResultDTO(auction, lot, entries));
    }

    private AuctionSessionDTO buildSessionDTO(Auction auction, Lot lot, List<AuctionEntry> entries) {
        AuctionSessionDTO dto = new AuctionSessionDTO();
        dto.setAuctionId(auction.getId());

        LotSummaryDTO lotSummary = new LotSummaryDTO();
        lotSummary.setLotId(lot.getId());
        lotSummary.setLotName(lot.getLotName());
        lotSummary.setBagCount(lot.getBagCount());
        lotSummary.setOriginalBagCount(lot.getBagCount());
        lotSummary.setSellerVehicleId(lot.getSellerVehicleId());
        lotSummary.setCommodityName(null);
        lotSummary.setSellerName(null);
        lotSummary.setSellerMark(null);
        lotSummary.setVehicleNumber(null);
        lotSummary.setWasModified(false);

        int totalSold = entries.stream().mapToInt(e -> e.getQuantity() != null ? e.getQuantity() : 0).sum();
        int bagCount = lot.getBagCount() != null ? lot.getBagCount() : 0;
        int remaining = Math.max(0, bagCount - totalSold);
        int highestRate = entries
            .stream()
            .map(AuctionEntry::getBidRate)
            .filter(r -> r != null)
            .map(r -> r.intValue())
            .max(Integer::compareTo)
            .orElse(0);

        String status;
        if (entries.isEmpty()) {
            status = "AVAILABLE";
        } else if (remaining == 0) {
            status = "SOLD";
        } else {
            status = "PARTIAL";
        }

        dto.setLot(lotSummary);
        dto.setEntries(auctionEntryMapper.toDto(entries));
        dto.setTotalSoldBags(totalSold);
        dto.setRemainingBags(remaining);
        dto.setHighestBidRate(highestRate);
        dto.setStatus(status);

        return dto;
    }

    private AuctionResultDTO buildResultDTO(Auction auction, Lot lot, List<AuctionEntry> entries) {
        AuctionResultDTO dto = new AuctionResultDTO();
        dto.setAuctionId(auction.getId());
        dto.setLotId(auction.getLotId());
        if (lot != null) {
            dto.setLotName(lot.getLotName());
            dto.setSellerVehicleId(lot.getSellerVehicleId());
        }
        dto.setAuctionDatetime(auction.getAuctionDatetime());
        dto.setConductedBy(auction.getConductedBy());
        dto.setCompletedAt(auction.getCompletedAt());

        List<AuctionResultEntryDTO> resultEntries = entries
            .stream()
            .sorted(Comparator.comparingInt(AuctionEntry::getBidNumber))
            .map(e -> {
                AuctionResultEntryDTO re = new AuctionResultEntryDTO();
                re.setBidNumber(e.getBidNumber());
                re.setBuyerId(e.getBuyerId());
                re.setBuyerMark(e.getBuyerMark());
                re.setBuyerName(e.getBuyerName());
                re.setRate(e.getBidRate());
                re.setQuantity(e.getQuantity());
                re.setAmount(e.getAmount());
                re.setIsSelfSale(e.getIsSelfSale());
                re.setIsScribble(e.getIsScribble());
                re.setPresetApplied(e.getPresetMargin());
                re.setPresetType(e.getPresetType());
                return re;
            })
            .collect(Collectors.toList());

        dto.setEntries(resultEntries);
        return dto;
    }

    private BigDecimal calcSellerRate(BigDecimal bidRate, BigDecimal preset, AuctionPresetType type) {
        if (bidRate == null || preset == null) {
            return bidRate != null ? bidRate : BigDecimal.ZERO;
        }
        if (preset.compareTo(BigDecimal.ZERO) == 0) {
            return bidRate;
        }
        return type == AuctionPresetType.PROFIT ? bidRate.subtract(preset) : bidRate.add(preset);
    }

    public static class AuctionConflictException extends RuntimeException {

        private final String field;
        private final int currentTotal;
        private final int lotTotal;
        private final int attemptedQty;
        private final int newTotal;

        public AuctionConflictException(
            String message,
            String field,
            int currentTotal,
            int lotTotal,
            int attemptedQty,
            int newTotal
        ) {
            super(message);
            this.field = field;
            this.currentTotal = currentTotal;
            this.lotTotal = lotTotal;
            this.attemptedQty = attemptedQty;
            this.newTotal = newTotal;
        }

        public String getField() {
            return field;
        }

        public int getCurrentTotal() {
            return currentTotal;
        }

        public int getLotTotal() {
            return lotTotal;
        }

        public int getAttemptedQty() {
            return attemptedQty;
        }

        public int getNewTotal() {
            return newTotal;
        }
    }
}

