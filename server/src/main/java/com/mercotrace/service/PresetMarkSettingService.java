package com.mercotrace.service;

import com.mercotrace.domain.PresetMarkSetting;
import com.mercotrace.service.dto.PresetMarkSettingDTO;
import java.util.List;

/**
 * Service for Preset Mark Settings (trader-scoped auction margin presets).
 */
public interface PresetMarkSettingService {

    List<PresetMarkSettingDTO> findAllByTrader(Long traderId);

    PresetMarkSettingDTO create(Long traderId, PresetMarkSettingDTO dto);

    PresetMarkSettingDTO update(Long traderId, Long id, PresetMarkSettingDTO dto);

    void delete(Long traderId, Long id);
}
