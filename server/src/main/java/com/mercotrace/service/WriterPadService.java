package com.mercotrace.service;

import com.mercotrace.service.dto.WriterPadDTOs.WriterPadSessionDTO;
import com.mercotrace.service.dto.WriterPadDTOs.WriterPadSessionWithLogDTO;
import com.mercotrace.service.dto.WriterPadDTOs.WriterPadWeightEntryDTO;
import java.math.BigDecimal;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service for Writer's Pad operational sessions and weight logs.
 */
public interface WriterPadService {

    /**
     * Load or create a writer pad session for the given lot/bid and buyer details.
     * Mirrors the BidCard creation flow in WritersPadPage.tsx.
     */
    WriterPadSessionDTO loadOrCreateSession(
        Long lotId,
        Integer bidNumber,
        String buyerMark,
        String buyerName,
        String lotName,
        Integer totalBags,
        String scaleId,
        String scaleName
    );

    /**
     * Attach a new weight entry to an existing session.
     * Mirrors attachWeight(card) in WritersPadPage.tsx.
     */
    WriterPadWeightEntryDTO attachWeight(Long sessionId, BigDecimal rawWeight, BigDecimal consideredWeight, String scaleId);

    /**
     * Retag a weight entry from its current bid to a new target bid within the trader context.
     * Mirrors confirmRetag in WritersPadPage.tsx.
     */
    WriterPadWeightEntryDTO retagEntry(Long entryId, Integer targetBidNumber);

    /**
     * End-of-day cleanup: clear sessions and weights for current trader.
     * Mirrors endOfDayCleanup in WritersPadPage.tsx but persists audit trail as logical deletes.
     */
    void endOfDayCleanup();

    /**
     * Paginated list of sessions for current trader (e.g. for future history views).
     */
    Page<WriterPadSessionDTO> listSessions(Pageable pageable);

    /**
     * Load a session plus a page of its recent weight log entries.
     */
    Optional<WriterPadSessionWithLogDTO> getSessionWithLog(Long sessionId, Pageable pageable);
}

