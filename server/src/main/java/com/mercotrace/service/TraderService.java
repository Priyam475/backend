package com.mercotrace.service;

import com.mercotrace.service.dto.TraderDTO;
import java.util.Optional;

/**
 * Service Interface for managing {@link com.mercotrace.domain.Trader}.
 */
public interface TraderService {
    /**
     * Save a trader.
     *
     * @param traderDTO the entity to save.
     * @return the persisted entity.
     */
    TraderDTO save(TraderDTO traderDTO);

    /**
     * Updates a trader.
     *
     * @param traderDTO the entity to update.
     * @return the persisted entity.
     */
    TraderDTO update(TraderDTO traderDTO);

    /**
     * Partially updates a trader.
     *
     * @param traderDTO the entity to update partially.
     * @return the persisted entity.
     */
    Optional<TraderDTO> partialUpdate(TraderDTO traderDTO);

    /**
     * Get the "id" trader.
     *
     * @param id the id of the entity.
     * @return the entity.
     */
    Optional<TraderDTO> findOne(Long id);

    /**
     * Delete the "id" trader.
     *
     * @param id the id of the entity.
     */
    void delete(Long id);
}
