package com.mercotrace.service.impl;

import com.mercotrace.domain.PresetMarkSetting;
import com.mercotrace.repository.PresetMarkSettingRepository;
import com.mercotrace.service.PresetMarkSettingService;
import com.mercotrace.service.dto.PresetMarkSettingDTO;
import com.mercotrace.web.rest.errors.BadRequestAlertException;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class PresetMarkSettingServiceImpl implements PresetMarkSettingService {

    private final PresetMarkSettingRepository repository;

    public PresetMarkSettingServiceImpl(PresetMarkSettingRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PresetMarkSettingDTO> findAllByTrader(Long traderId) {
        return repository.findAllByTraderIdOrderByIdAsc(traderId).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    @Override
    public PresetMarkSettingDTO create(Long traderId, PresetMarkSettingDTO dto) {
        String mark = dto.getPredefinedMark().trim();
        if (repository.existsByTraderIdAndPredefinedMarkIgnoreCase(traderId, mark)) {
            throw new BadRequestAlertException("Predefined Mark already exists: " + mark, "presetMarkSetting", "duplicateMark");
        }
        PresetMarkSetting entity = new PresetMarkSetting();
        entity.setTraderId(traderId);
        entity.setPredefinedMark(mark);
        entity.setExtraAmount(dto.getExtraAmount());
        entity = repository.save(entity);
        return toDto(entity);
    }

    @Override
    public PresetMarkSettingDTO update(Long traderId, Long id, PresetMarkSettingDTO dto) {
        PresetMarkSetting entity = repository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("PresetMarkSetting not found: " + id));
        if (!entity.getTraderId().equals(traderId)) {
            throw new EntityNotFoundException("PresetMarkSetting not found: " + id);
        }
        String mark = dto.getPredefinedMark().trim();
        if (repository.existsByTraderIdAndPredefinedMarkIgnoreCaseAndIdNot(traderId, mark, id)) {
            throw new BadRequestAlertException("Predefined Mark already exists: " + mark, "presetMarkSetting", "duplicateMark");
        }
        entity.setPredefinedMark(mark);
        entity.setExtraAmount(dto.getExtraAmount());
        entity = repository.save(entity);
        return toDto(entity);
    }

    @Override
    public void delete(Long traderId, Long id) {
        PresetMarkSetting entity = repository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("PresetMarkSetting not found: " + id));
        if (!entity.getTraderId().equals(traderId)) {
            throw new EntityNotFoundException("PresetMarkSetting not found: " + id);
        }
        repository.delete(entity);
    }

    private PresetMarkSettingDTO toDto(PresetMarkSetting e) {
        PresetMarkSettingDTO dto = new PresetMarkSettingDTO();
        dto.setId(e.getId());
        dto.setPredefinedMark(e.getPredefinedMark());
        dto.setExtraAmount(e.getExtraAmount());
        return dto;
    }
}
