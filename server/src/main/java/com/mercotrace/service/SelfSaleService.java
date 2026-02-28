package com.mercotrace.service;

import com.mercotrace.service.dto.SelfSaleDTOs.ClosureDTO;
import com.mercotrace.service.dto.SelfSaleDTOs.CreateClosureRequestDTO;
import com.mercotrace.service.dto.SelfSaleDTOs.OpenLotDTO;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service for Self-Sale: open lots and create/list closures.
 */
public interface SelfSaleService {

    /**
     * Open lots for self-sale (from arrivals, excluding already closed). Optional search over lot name, seller, commodity, vehicle.
     */
    Page<OpenLotDTO> getOpenLots(Pageable pageable, String search);

    /**
     * Create a self-sale closure. Validates lot exists, belongs to trader, and is not already closed.
     */
    ClosureDTO createClosure(@Valid CreateClosureRequestDTO request);

    /**
     * Paginated list of closed self-sales for the current trader.
     */
    Page<ClosureDTO> getClosures(Pageable pageable);
}
