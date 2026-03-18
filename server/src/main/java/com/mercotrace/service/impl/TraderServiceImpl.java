package com.mercotrace.service.impl;

import com.mercotrace.domain.Trader;
import com.mercotrace.repository.TraderRepository;
import com.mercotrace.service.TraderPermanentDeleteService;
import com.mercotrace.service.TraderService;
import com.mercotrace.service.dto.TraderDTO;
import com.mercotrace.service.mapper.TraderMapper;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service Implementation for managing {@link com.mercotrace.domain.Trader}.
 */
@Service
@Transactional
public class TraderServiceImpl implements TraderService {

    private static final Logger LOG = LoggerFactory.getLogger(TraderServiceImpl.class);

    private final TraderRepository traderRepository;
    private final TraderMapper traderMapper;
    private final TraderPermanentDeleteService traderPermanentDeleteService;

    public TraderServiceImpl(
        TraderRepository traderRepository,
        TraderMapper traderMapper,
        TraderPermanentDeleteService traderPermanentDeleteService
    ) {
        this.traderRepository = traderRepository;
        this.traderMapper = traderMapper;
        this.traderPermanentDeleteService = traderPermanentDeleteService;
    }

    @Override
    public TraderDTO save(TraderDTO traderDTO) {
        LOG.debug("Request to save Trader : {}", traderDTO);
        Trader trader = traderMapper.toEntity(traderDTO);
        trader = traderRepository.save(trader);
        return traderMapper.toDto(trader);
    }

    @Override
    public TraderDTO update(TraderDTO traderDTO) {
        LOG.debug("Request to update Trader : {}", traderDTO);
        Trader trader = traderMapper.toEntity(traderDTO);
        trader = traderRepository.save(trader);
        return traderMapper.toDto(trader);
    }

    @Override
    public Optional<TraderDTO> partialUpdate(TraderDTO traderDTO) {
        LOG.debug("Request to partially update Trader : {}", traderDTO);

        return traderRepository
            .findById(traderDTO.getId())
            .map(existingTrader -> {
                traderMapper.partialUpdate(existingTrader, traderDTO);

                return existingTrader;
            })
            .map(traderRepository::save)
            .map(traderMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<TraderDTO> findOne(Long id) {
        LOG.debug("Request to get Trader : {}", id);
        return traderRepository.findById(id).map(traderMapper::toDto);
    }

    @Override
    public void delete(Long id) {
        LOG.debug("Request to soft-delete Trader : {}", id);
        traderRepository.findById(id).ifPresent(trader -> {
            trader.setActive(false);
            traderRepository.save(trader);
        });
    }

    @Override
    public TraderDTO setActive(Long id, boolean active) {
        LOG.debug("Request to set Trader {} active={} (direct update to avoid L2 cache)", id, active);
        int updated = traderRepository.setActiveById(id, active);
        if (updated == 0) {
            throw new jakarta.persistence.EntityNotFoundException("Trader not found: " + id);
        }
        return traderRepository.findById(id).map(traderMapper::toDto)
            .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Trader not found: " + id));
    }

    @Override
    public void setActiveDirect(Long id, boolean active) {
        LOG.debug("Request to set Trader {} active={} (direct update)", id, active);
        int updated = traderRepository.setActiveById(id, active);
        if (updated == 0) {
            throw new jakarta.persistence.EntityNotFoundException("Trader not found: " + id);
        }
    }

    @Override
    public void permanentDelete(Long id) {
        LOG.debug("Request to permanent delete Trader : {}", id);
        traderPermanentDeleteService.permanentDelete(id);
    }
}
