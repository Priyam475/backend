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
     * Delete the "id" commodity (soft delete: sets active = false).
     *
     * @param id the id of the entity.
     */
    void delete(Long id);

    /**
     * Restore a soft-deleted commodity (sets active = true).
     *
     * @param id the id of the entity.
     * @return the restored entity, or empty if not found.
     */
    Optional<CommodityDTO> restore(Long id);

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

    /**
     * Get a commodity by trader and name (case-insensitive). Returns active or inactive.
     * Used so the client can get the id to restore when create fails with "name exists but inactive".
     *
     * @param traderId the owning trader id.
     * @param name the commodity name.
     * @return the commodity if found.
     */
    Optional<CommodityDTO> findOneByTraderIdAndName(Long traderId, String name);
}
