package com.mercotrace.service.impl;

import com.mercotrace.domain.Cdn;
import com.mercotrace.domain.CdnItem;
import com.mercotrace.domain.CdnTransfer;
import com.mercotrace.domain.Contact;
import com.mercotrace.domain.enumeration.CdnSource;
import com.mercotrace.domain.enumeration.CdnStatus;
import com.mercotrace.repository.CdnItemRepository;
import com.mercotrace.repository.CdnRepository;
import com.mercotrace.repository.CdnTransferRepository;
import com.mercotrace.repository.ContactRepository;
import com.mercotrace.service.CdnService;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.dto.CDNDTOs.CDNCreateDTO;
import com.mercotrace.service.dto.CDNDTOs.CDNLineItemDTO;
import com.mercotrace.service.dto.CDNDTOs.CDNLineItemInput;
import com.mercotrace.service.dto.CDNDTOs.CDNResponseDTO;
import com.mercotrace.service.dto.CDNDTOs.ReceiveByPINDTO;
import com.mercotrace.service.mapper.CdnMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * CDN service: create (generate cdn_number, PIN), list with search, get by id, receive by PIN.
 * REQ-CDN-009 to REQ-CDN-011: PIN one-time use, expiry 24h.
 */
@Service
@Transactional
public class CdnServiceImpl implements CdnService {

    private static final Logger LOG = LoggerFactory.getLogger(CdnServiceImpl.class);
    private static final int PIN_LENGTH = 6;
    private static final int PIN_EXPIRY_HOURS = 24;

    private final TraderContextService traderContextService;
    private final CdnRepository cdnRepository;
    private final CdnItemRepository cdnItemRepository;
    private final CdnTransferRepository cdnTransferRepository;
    private final ContactRepository contactRepository;
    private final CdnMapper cdnMapper;
    private final PasswordEncoder passwordEncoder;

    public CdnServiceImpl(
        TraderContextService traderContextService,
        CdnRepository cdnRepository,
        CdnItemRepository cdnItemRepository,
        CdnTransferRepository cdnTransferRepository,
        ContactRepository contactRepository,
        CdnMapper cdnMapper,
        PasswordEncoder passwordEncoder
    ) {
        this.traderContextService = traderContextService;
        this.cdnRepository = cdnRepository;
        this.cdnItemRepository = cdnItemRepository;
        this.cdnTransferRepository = cdnTransferRepository;
        this.contactRepository = contactRepository;
        this.cdnMapper = cdnMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @CacheEvict(cacheNames = "cdnListByTrader", allEntries = true)
    public CDNResponseDTO create(CDNCreateDTO request) {
        Long traderId = traderContextService.getCurrentTraderId();

        List<CDNLineItemInput> validItems = request.getItems().stream()
            .filter(i -> i.getLotName() != null && !i.getLotName().trim().isEmpty())
            .toList();
        if (validItems.isEmpty()) {
            throw new IllegalArgumentException("At least one item with lot name is required");
        }

        String cdnNumber = generateCdnNumber(traderId);
        CdnSource source = mapSource(request.getSource());
        Long receivingPartyId = request.getReceivingPartyId();
        String receivingPartyName = request.getReceivingParty();
        if (receivingPartyId != null) {
            Contact c = contactRepository.findById(receivingPartyId).orElse(null);
            if (c != null && c.getTraderId() != null && c.getTraderId().equals(traderId)) {
                receivingPartyName = c.getName();
            }
        } else if (receivingPartyName != null && !receivingPartyName.isBlank()) {
            final String nameToMatch = receivingPartyName.trim();
            Optional<Contact> found = contactRepository.findAllByTraderIdAndActiveTrue(traderId).stream()
                .filter(c -> nameToMatch.equalsIgnoreCase(c.getName()))
                .findFirst();
            if (found.isPresent()) {
                receivingPartyId = found.get().getId();
            }
        }

        Cdn cdn = new Cdn();
        cdn.setTraderId(traderId);
        cdn.setCdnNumber(cdnNumber);
        cdn.setCdnDate(Instant.now());
        cdn.setDispatchingPartyId(null);
        cdn.setDispatchingPartyName(null);
        cdn.setReceivingPartyId(receivingPartyId);
        cdn.setReceivingPartyName(receivingPartyName != null ? receivingPartyName.trim() : null);
        cdn.setSource(source);
        cdn.setTransporterName(request.getTransporter());
        cdn.setDriverName(request.getDriver());
        cdn.setFreightFormula(request.getFreightFormula());
        cdn.setAdvancePaid(request.getAdvancePaid() != null ? request.getAdvancePaid() : BigDecimal.ZERO);
        cdn.setRemarks(request.getRemarks());
        cdn.setStatus(CdnStatus.DISPATCHED);
        cdn.setIsDeleted(false);

        cdn = cdnRepository.save(cdn);

        for (CDNLineItemInput input : validItems) {
            CdnItem item = new CdnItem();
            item.setCdn(cdn);
            item.setLotName(input.getLotName().trim());
            item.setQuantity(input.getQuantity() != null ? input.getQuantity() : 0);
            item.setVariant(input.getVariant());
            item.setIsDeleted(false);
            cdnItemRepository.save(item);
        }

        String plainPin = generatePin();
        Instant pinExpiry = Instant.now().plusSeconds(PIN_EXPIRY_HOURS * 3600L);
        CdnTransfer transfer = new CdnTransfer();
        transfer.setCdn(cdn);
        transfer.setSenderTraderId(traderId);
        transfer.setPinHash(passwordEncoder.encode(plainPin));
        transfer.setPinExpiry(pinExpiry);
        transfer.setIsUsed(false);
        transfer.setIsDeleted(false);
        cdnTransferRepository.save(transfer);

        CDNResponseDTO dto = cdnMapper.toResponseDto(cdn);
        dto.setItems(cdnMapper.toLineItemDtos(cdnItemRepository.findAllByCdnIdAndIsDeletedFalse(cdn.getId())));
        dto.setDispatchingParty(cdn.getDispatchingPartyName());
        dto.setReceivingParty(cdn.getReceivingPartyName());
        dto.setPin(plainPin);
        dto.setPinUsed(false);
        dto.setPinExpiresAt(pinExpiry);
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public CDNResponseDTO getById(Long id) {
        Long traderId = traderContextService.getCurrentTraderId();
        Optional<Cdn> opt = cdnRepository.findByIdAndTraderIdAndIsDeletedFalse(id, traderId);
        if (opt.isEmpty()) return null;
        Cdn cdn = opt.get();
        return toFullDto(cdn);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "cdnListByTrader", keyGenerator = "cdnListByTraderKeyGenerator", unless = "#result == null || #result.empty")
    public Page<CDNResponseDTO> list(Pageable pageable, String search) {
        Long traderId = traderContextService.getCurrentTraderId();
        String q = search != null ? search.trim() : "";
        Page<Cdn> page = q.isEmpty()
            ? cdnRepository.findAllByTraderIdAndIsDeletedFalse(traderId, pageable)
            : cdnRepository.findAllByTraderIdAndSearchAndIsDeletedFalse(traderId, q, pageable);
        return page.map(this::toListDto);
    }

    @Override
    @CacheEvict(cacheNames = "cdnListByTrader", allEntries = true)
    public CDNResponseDTO receiveByPin(ReceiveByPINDTO request) {
        String rawPin = request.getPin().trim().toUpperCase();
        if (rawPin.length() != PIN_LENGTH) {
            throw new IllegalArgumentException("Invalid or expired PIN");
        }

        Long receiverTraderId = traderContextService.getCurrentTraderId();
        Instant now = Instant.now();

        List<CdnTransfer> candidates = cdnTransferRepository.findAllByNotUsedAndNotExpired(now);
        CdnTransfer match = null;
        for (CdnTransfer t : candidates) {
            if (passwordEncoder.matches(rawPin, t.getPinHash())) {
                match = t;
                break;
            }
        }
        if (match == null) {
            throw new IllegalArgumentException("Invalid or expired PIN");
        }

        Cdn cdn = match.getCdn();
        if (cdn.getIsDeleted()) {
            throw new IllegalArgumentException("Invalid or expired PIN");
        }
        if (cdn.getStatus() != CdnStatus.DISPATCHED) {
            throw new IllegalArgumentException("CDN already received or not available");
        }

        match.setIsUsed(true);
        match.setUsedAt(now);
        match.setReceiverTraderId(receiverTraderId);
        cdnTransferRepository.save(match);

        cdn.setStatus(CdnStatus.TRANSFERRED);
        cdnRepository.save(cdn);

        return toFullDto(cdn);
    }

    private String generateCdnNumber(Long traderId) {
        Integer max = cdnRepository.findMaxCdnSerialByTrader(traderId);
        int next = (max == null ? 0 : max) + 1;
        return "CDN-" + String.format("%04d", next);
    }

    private static String generatePin() {
        String s = UUID.randomUUID().toString().replace("-", "").toUpperCase();
        return s.substring(0, PIN_LENGTH);
    }

    private static CdnSource mapSource(String source) {
        if (source == null || source.isBlank()) return CdnSource.DIRECT;
        String u = source.trim().toUpperCase();
        if ("MANUAL".equals(u)) return CdnSource.DIRECT;
        try {
            return CdnSource.valueOf(u);
        } catch (IllegalArgumentException e) {
            return CdnSource.DIRECT;
        }
    }

    private CDNResponseDTO toFullDto(Cdn cdn) {
        CDNResponseDTO dto = cdnMapper.toResponseDto(cdn);
        dto.setItems(cdnMapper.toLineItemDtos(cdnItemRepository.findAllByCdnIdAndIsDeletedFalse(cdn.getId())));
        dto.setDispatchingParty(cdn.getDispatchingPartyName());
        dto.setReceivingParty(cdn.getReceivingPartyName());
        Optional<CdnTransfer> transferOpt = cdnTransferRepository.findFirstByCdnIdAndIsDeletedFalse(cdn.getId());
        transferOpt.ifPresent(t -> {
            dto.setPinUsed(t.getIsUsed());
            dto.setPinExpiresAt(t.getPinExpiry());
        });
        return dto;
    }

    private CDNResponseDTO toListDto(Cdn cdn) {
        CDNResponseDTO dto = cdnMapper.toResponseDto(cdn);
        dto.setItems(cdnMapper.toLineItemDtos(cdnItemRepository.findAllByCdnIdAndIsDeletedFalse(cdn.getId())));
        dto.setDispatchingParty(cdn.getDispatchingPartyName());
        dto.setReceivingParty(cdn.getReceivingPartyName());
        Optional<CdnTransfer> transferOpt = cdnTransferRepository.findFirstByCdnIdAndIsDeletedFalse(cdn.getId());
        if (transferOpt.isPresent() && !transferOpt.get().getIsUsed() && transferOpt.get().getPinExpiry().isAfter(Instant.now())) {
            dto.setPinUsed(false);
            dto.setPinExpiresAt(transferOpt.get().getPinExpiry());
        } else {
            dto.setPinUsed(true);
        }
        return dto;
    }
}
