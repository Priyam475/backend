package com.mercotrace.service.impl;

import com.mercotrace.domain.WriterPadSession;
import com.mercotrace.domain.WriterPadWeightEntry;
import com.mercotrace.repository.WriterPadSessionRepository;
import com.mercotrace.repository.WriterPadWeightEntryRepository;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.WriterPadService;
import com.mercotrace.service.dto.WriterPadDTOs.WriterPadSessionDTO;
import com.mercotrace.service.dto.WriterPadDTOs.WriterPadSessionWithLogDTO;
import com.mercotrace.service.dto.WriterPadDTOs.WriterPadWeightEntryDTO;
import com.mercotrace.service.mapper.WriterPadSessionMapper;
import com.mercotrace.service.mapper.WriterPadWeightEntryMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementation of {@link WriterPadService}.
 */
@Service
@Transactional
public class WriterPadServiceImpl implements WriterPadService {

    private static final Logger LOG = LoggerFactory.getLogger(WriterPadServiceImpl.class);

    private final WriterPadSessionRepository sessionRepository;
    private final WriterPadWeightEntryRepository weightEntryRepository;
    private final TraderContextService traderContextService;
    private final WriterPadSessionMapper sessionMapper;
    private final WriterPadWeightEntryMapper weightEntryMapper;

    public WriterPadServiceImpl(
        WriterPadSessionRepository sessionRepository,
        WriterPadWeightEntryRepository weightEntryRepository,
        TraderContextService traderContextService,
        WriterPadSessionMapper sessionMapper,
        WriterPadWeightEntryMapper weightEntryMapper
    ) {
        this.sessionRepository = sessionRepository;
        this.weightEntryRepository = weightEntryRepository;
        this.traderContextService = traderContextService;
        this.sessionMapper = sessionMapper;
        this.weightEntryMapper = weightEntryMapper;
    }

    @Override
    public WriterPadSessionDTO loadOrCreateSession(
        Long lotId,
        Integer bidNumber,
        String buyerMark,
        String buyerName,
        String lotName,
        Integer totalBags,
        String scaleId,
        String scaleName
    ) {
        Long traderId = traderContextService.getCurrentTraderId();
        Optional<WriterPadSession> existing = sessionRepository.findFirstByTraderIdAndLotIdAndBidNumberOrderByStartedAtDesc(
            traderId,
            lotId,
            bidNumber
        );
        WriterPadSession session = existing.orElseGet(() -> {
            WriterPadSession s = new WriterPadSession();
            s.setTraderId(traderId);
            s.setSessionKey(buildSessionKey(traderId, lotId, bidNumber));
            s.setLotId(lotId);
            s.setBidNumber(bidNumber);
            s.setBuyerMark(buyerMark);
            s.setBuyerName(buyerName);
            s.setLotName(lotName);
            s.setTotalBags(totalBags);
            s.setWeighedBags(0);
            s.setStartedAt(Instant.now());
            return s;
        });
        session.setScaleId(scaleId);
        session.setScaleName(scaleName);
        WriterPadSession saved = sessionRepository.save(session);
        return sessionMapper.toDto(saved);
    }

    @Override
    public WriterPadWeightEntryDTO attachWeight(Long sessionId, BigDecimal rawWeight, BigDecimal consideredWeight, String scaleId) {
        if (rawWeight == null || consideredWeight == null) {
            throw new IllegalArgumentException("Weights must be provided");
        }
        if (rawWeight.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Raw weight must be positive");
        }

        WriterPadSession session = sessionRepository
            .findById(sessionId)
            .orElseThrow(() -> new IllegalArgumentException("WriterPadSession not found: " + sessionId));

        WriterPadWeightEntry entry = new WriterPadWeightEntry();
        entry.setSessionId(session.getId());
        entry.setBidNumber(session.getBidNumber());
        entry.setBuyerMark(session.getBuyerMark());
        entry.setRawWeight(rawWeight);
        entry.setConsideredWeight(consideredWeight);
        entry.setScaleId(scaleId);
        entry.setWeighedAt(Instant.now());
        entry.setDeleted(false);

        WriterPadWeightEntry savedEntry = weightEntryRepository.save(entry);

        int currentBags = session.getWeighedBags() != null ? session.getWeighedBags() : 0;
        session.setWeighedBags(currentBags + 1);
        sessionRepository.save(session);

        return weightEntryMapper.toDto(savedEntry);
    }

    @Override
    public WriterPadWeightEntryDTO retagEntry(Long entryId, Integer targetBidNumber) {
        WriterPadWeightEntry entry = weightEntryRepository
            .findById(entryId)
            .orElseThrow(() -> new IllegalArgumentException("WriterPadWeightEntry not found: " + entryId));

        Long traderId = traderContextService.getCurrentTraderId();
        List<WriterPadSession> targetSessions = sessionRepository.findAllByTraderIdAndBidNumber(traderId, targetBidNumber);
        if (targetSessions.isEmpty()) {
            throw new IllegalArgumentException("Target WriterPadSession not found for bid: " + targetBidNumber);
        }
        WriterPadSession target = targetSessions.get(0);

        WriterPadSession source = sessionRepository
            .findById(entry.getSessionId())
            .orElseThrow(() -> new IllegalStateException("Source WriterPadSession not found for entry: " + entryId));

        int sourceBags = Math.max(0, (source.getWeighedBags() != null ? source.getWeighedBags() : 0) - 1);
        source.setWeighedBags(sourceBags);
        sessionRepository.save(source);

        int targetBags = (target.getWeighedBags() != null ? target.getWeighedBags() : 0) + 1;
        target.setWeighedBags(targetBags);
        sessionRepository.save(target);

        entry.setRetaggedFromBid(entry.getBidNumber());
        entry.setBidNumber(target.getBidNumber());
        entry.setBuyerMark(target.getBuyerMark());
        entry.setSessionId(target.getId());
        WriterPadWeightEntry saved = weightEntryRepository.save(entry);

        return weightEntryMapper.toDto(saved);
    }

    @Override
    public void endOfDayCleanup() {
        Long traderId = traderContextService.getCurrentTraderId();
        LOG.info("WriterPad end-of-day cleanup for trader {}", traderId);
        Page<WriterPadSession> page = sessionRepository.findAllByTraderIdOrderByStartedAtDesc(traderId, Pageable.unpaged());
        List<WriterPadSession> sessions = page.getContent();
        Instant now = Instant.now();
        for (WriterPadSession session : sessions) {
            session.setEndedAt(now);
            sessionRepository.save(session);
        }
        List<Long> sessionIds = sessions.stream().map(WriterPadSession::getId).toList();
        if (!sessionIds.isEmpty()) {
            List<WriterPadWeightEntry> entries = weightEntryRepository.findAllBySessionIdIn(sessionIds);
            for (WriterPadWeightEntry entry : entries) {
                entry.setDeleted(true);
                entry.setDeletedAt(now);
                weightEntryRepository.save(entry);
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<WriterPadSessionDTO> listSessions(Pageable pageable) {
        Long traderId = traderContextService.getCurrentTraderId();
        return sessionRepository.findAllByTraderIdOrderByStartedAtDesc(traderId, pageable).map(sessionMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<WriterPadSessionWithLogDTO> getSessionWithLog(Long sessionId, Pageable pageable) {
        return sessionRepository
            .findById(sessionId)
            .map(session -> {
                WriterPadSessionDTO sessionDto = sessionMapper.toDto(session);
                Page<WriterPadWeightEntry> page = weightEntryRepository.findAllBySessionIdAndDeletedFalseOrderByWeighedAtDesc(
                    session.getId(),
                    pageable
                );
                WriterPadSessionWithLogDTO dto = new WriterPadSessionWithLogDTO();
                dto.setSession(sessionDto);
                dto.setEntries(weightEntryMapper.toDto(page.getContent()));
                dto.setTotalEntries(page.getTotalElements());
                return dto;
            });
    }

    private String buildSessionKey(Long traderId, Long lotId, Integer bidNumber) {
        return traderId + "-" + lotId + "-" + bidNumber;
    }
}

