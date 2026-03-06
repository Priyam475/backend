package com.mercotrace.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mercotrace.domain.WeighingSession;
import com.mercotrace.repository.WeighingSessionRepository;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.WeighingSessionService;
import com.mercotrace.service.dto.BagWeightEntryDTO;
import com.mercotrace.service.dto.WeighingSessionCreateRequest;
import com.mercotrace.service.dto.WeighingSessionDTO;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementation of {@link WeighingSessionService}.
 */
@Service
@Transactional
public class WeighingSessionServiceImpl implements WeighingSessionService {

    private static final Logger LOG = LoggerFactory.getLogger(WeighingSessionServiceImpl.class);

    private final WeighingSessionRepository weighingSessionRepository;
    private final TraderContextService traderContextService;
    private final ObjectMapper objectMapper;

    public WeighingSessionServiceImpl(
        WeighingSessionRepository weighingSessionRepository,
        TraderContextService traderContextService,
        ObjectMapper objectMapper
    ) {
        this.weighingSessionRepository = weighingSessionRepository;
        this.traderContextService = traderContextService;
        this.objectMapper = objectMapper;
    }

    /** Cache name for getByBidNumber; evicted on create. */
    private static final String CACHE_WEIGHING_BY_BID = "weighingSessionByBid";

    @Override
    @Transactional(readOnly = false)
    @CacheEvict(cacheNames = CACHE_WEIGHING_BY_BID, keyGenerator = "weighingByBidKeyGenerator")
    public WeighingSessionDTO create(WeighingSessionCreateRequest request) {
        Long traderId = traderContextService.getCurrentTraderId();
        WeighingSession entity = new WeighingSession();
        entity.setTraderId(traderId);
        entity.setSessionId(request.getSessionId());
        entity.setLotId(request.getLotId());
        entity.setBidNumber(request.getBidNumber());
        entity.setBuyerMark(request.getBuyerMark());
        entity.setBuyerName(request.getBuyerName());
        entity.setSellerName(request.getSellerName());
        entity.setLotName(request.getLotName());
        entity.setTotalBags(request.getTotalBags());
        entity.setOriginalWeight(request.getOriginalWeight());
        entity.setNetWeight(request.getNetWeight());
        entity.setManualEntry(request.getManualEntry() != null ? request.getManualEntry() : false);
        entity.setDeductions(request.getDeductions() != null ? request.getDeductions() : BigDecimal.ZERO);
        entity.setGovtDeductionApplied(request.getGovtDeductionApplied() != null ? request.getGovtDeductionApplied() : false);
        entity.setRoundOffApplied(request.getRoundOffApplied() != null ? request.getRoundOffApplied() : false);
        if (request.getBagWeights() != null && !request.getBagWeights().isEmpty()) {
            try {
                entity.setBagWeightsJson(objectMapper.writeValueAsString(request.getBagWeights()));
            } catch (JsonProcessingException e) {
                LOG.warn("Failed to serialize bag_weights", e);
            }
        }
        entity = weighingSessionRepository.save(entity);
        return toDto(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<WeighingSessionDTO> list(Pageable pageable) {
        Long traderId = traderContextService.getCurrentTraderId();
        return weighingSessionRepository.findAllByTraderIdOrderByCreatedDateDesc(traderId, pageable)
            .map(this::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<WeighingSessionDTO> getById(Long id) {
        Long traderId = traderContextService.getCurrentTraderId();
        return weighingSessionRepository
            .findById(id)
            .filter(ws -> traderId.equals(ws.getTraderId()))
            .map(this::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CACHE_WEIGHING_BY_BID, keyGenerator = "weighingByBidKeyGenerator", unless = "#result == null || !#result.isPresent()")
    public Optional<WeighingSessionDTO> getByBidNumber(Integer bidNumber) {
        List<WeighingSession> list = weighingSessionRepository.findAllByBidNumber(bidNumber);
        Long traderId = traderContextService.getCurrentTraderId();
        return list.stream()
            .filter(ws -> traderId.equals(ws.getTraderId()))
            .findFirst()
            .map(this::toDto);
    }

    private WeighingSessionDTO toDto(WeighingSession e) {
        WeighingSessionDTO dto = new WeighingSessionDTO();
        dto.setId(e.getId());
        dto.setSessionId(e.getSessionId());
        dto.setLotId(e.getLotId());
        dto.setBidNumber(e.getBidNumber());
        dto.setBuyerMark(e.getBuyerMark());
        dto.setBuyerName(e.getBuyerName());
        dto.setSellerName(e.getSellerName());
        dto.setLotName(e.getLotName());
        dto.setTotalBags(e.getTotalBags());
        dto.setOriginalWeight(e.getOriginalWeight());
        dto.setNetWeight(e.getNetWeight());
        dto.setManualEntry(e.getManualEntry());
        dto.setDeductions(e.getDeductions());
        dto.setGovtDeductionApplied(e.getGovtDeductionApplied());
        dto.setRoundOffApplied(e.getRoundOffApplied());
        dto.setCreatedAt(e.getCreatedDate());
        if (e.getBagWeightsJson() != null && !e.getBagWeightsJson().isEmpty()) {
            try {
                @SuppressWarnings("unchecked")
                List<BagWeightEntryDTO> list = objectMapper.readValue(
                    e.getBagWeightsJson(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, BagWeightEntryDTO.class)
                );
                dto.setBagWeights(list);
            } catch (JsonProcessingException ex) {
                dto.setBagWeights(Collections.emptyList());
            }
        }
        return dto;
    }
}
