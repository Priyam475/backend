package com.mercotrace.service;

import com.mercotrace.service.dto.FullCommodityConfigDTO;

/**
 * Service for loading and saving full commodity configuration (config, deduction rules, hamali slabs, dynamic charges).
 */
public interface CommodityConfigService {

    /**
     * Get full config for a commodity. Returns empty config if none exists.
     */
    FullCommodityConfigDTO getFullConfig(Long commodityId);

    /**
     * Get full config for all commodities. Used by pages that need config for calculations (e.g. billing, weighing).
     */
    java.util.List<FullCommodityConfigDTO> getAllFullConfigs();

    /**
     * Save full config for a commodity. Replaces existing config, deduction rules, hamali slabs, and dynamic charges.
     */
    FullCommodityConfigDTO saveFullConfig(FullCommodityConfigDTO dto);
}
