package com.mercotrace.service;

import com.mercotrace.service.dto.CommodityDTO;
import java.util.List;
import java.util.Optional;

/**
 * Service Interface for managing {@link com.mercotrace.domain.Commodity}.
 */
public interface CommodityService {

    /**
     * Save a commodity (create).
     *
     * @param commodityDTO the entity to save.
     * @return the persisted entity.
     */
    CommodityDTO save(CommodityDTO commodityDTO);

    /**
     * Updates a commodity.
     *
     * @param commodityDTO the entity to update.
     * @return the persisted entity.
     */
    CommodityDTO update(CommodityDTO commodityDTO);

    /**
     * Partially updates a commodity.
     *
     * @param commodityDTO the entity to update partially.
     * @return the persisted entity.
     */
    Optional<CommodityDTO> partialUpdate(CommodityDTO commodityDTO);

    /**
     * Get the "id" commodity.
     *
     * @param id the id of the entity.
     * @return the entity.
     */
    Optional<CommodityDTO> findOne(Long id);

    /**
     * Delete the "id" commodity.
     *
     * @param id the id of the entity.
     */
    void delete(Long id);

    /**
     * Get all commodities (used by frontend list).
     *
     * @return list of all commodities.
     */
    List<CommodityDTO> findAll();

    /**
     * Get all commodities for a trader.
     *
     * @param traderId the owning trader id.
     * @return list of commodities.
     */
    List<CommodityDTO> findAllByTrader(Long traderId);
}
