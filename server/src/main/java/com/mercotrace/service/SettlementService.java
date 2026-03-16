package com.mercotrace.service;

import com.mercotrace.service.dto.SettlementDTOs.*;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service for Settlement (Sales Patti): sellers list, patti CRUD.
 * Frontend contract: SettlementPage.tsx.
 */
public interface SettlementService {

    /**
     * List sellers available for settlement (from completed auctions, trader-scoped).
     * Enriched with arrival/weighing data. Paginated by seller.
     */
    Page<SellerSettlementDTO> listSellers(Pageable pageable, String search);

    /**
     * Create a new patti. Patti ID generated as PT-YYYYMMDD-NNNN (REQ-PUT-008).
     */
    PattiDTO createPatti(PattiSaveRequest request);

    /**
     * Get patti by database id.
     */
    Optional<PattiDTO> getPattiById(Long id);

    /**
     * Get patti by business key pattiId.
     */
    Optional<PattiDTO> getPattiByPattiId(String pattiId);

    /**
     * Update existing patti (e.g. deductions). Idempotent.
     */
    Optional<PattiDTO> updatePatti(Long id, PattiSaveRequest request);

    /**
     * List pattis for current trader. Paginated.
     */
    Page<PattiDTO> listPattis(Pageable pageable);

    /**
     * Compute seller-level charges (e.g. freight, advance) for a new Patti.
     * This replaces prototype localStorage-based voucher lookups.
     */
    SellerChargesDTO getSellerCharges(String sellerId);
}
