package com.mercotrace.service.impl;

import com.mercotrace.domain.Commodity;
import com.mercotrace.repository.CommodityConfigRepository;
import com.mercotrace.repository.CommodityRepository;
import com.mercotrace.repository.DeductionRuleRepository;
import com.mercotrace.repository.DynamicChargeRepository;
import com.mercotrace.repository.HamaliSlabRepository;
import com.mercotrace.service.CommodityService;
import com.mercotrace.service.dto.CommodityDTO;
import com.mercotrace.service.mapper.CommodityMapper;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service Implementation for managing {@link com.mercotrace.domain.Commodity}.
 */
@Service
@Transactional
public class CommodityServiceImpl implements CommodityService {

    private static final Logger LOG = LoggerFactory.getLogger(CommodityServiceImpl.class);

    private final CommodityRepository commodityRepository;

    private final CommodityMapper commodityMapper;

    private final CommodityConfigRepository commodityConfigRepository;
    private final DeductionRuleRepository deductionRuleRepository;
    private final HamaliSlabRepository hamaliSlabRepository;
    private final DynamicChargeRepository dynamicChargeRepository;

    public CommodityServiceImpl(
        CommodityRepository commodityRepository,
        CommodityMapper commodityMapper,
        CommodityConfigRepository commodityConfigRepository,
        DeductionRuleRepository deductionRuleRepository,
        HamaliSlabRepository hamaliSlabRepository,
        DynamicChargeRepository dynamicChargeRepository
    ) {
        this.commodityRepository = commodityRepository;
        this.commodityMapper = commodityMapper;
        this.commodityConfigRepository = commodityConfigRepository;
        this.deductionRuleRepository = deductionRuleRepository;
        this.hamaliSlabRepository = hamaliSlabRepository;
        this.dynamicChargeRepository = dynamicChargeRepository;
    }

    @Override
    public CommodityDTO save(CommodityDTO commodityDTO) {
        LOG.debug("Request to save Commodity : {}", commodityDTO);

        if (commodityDTO.getCreatedAt() == null) {
            commodityDTO.setCreatedAt(Instant.now());
        }

        Commodity commodity = commodityMapper.toEntity(commodityDTO);
        commodity = commodityRepository.save(commodity);
        return commodityMapper.toDto(commodity);
    }

    @Override
    public CommodityDTO update(CommodityDTO commodityDTO) {
        LOG.debug("Request to update Commodity : {}", commodityDTO);
        Commodity commodity = commodityMapper.toEntity(commodityDTO);
        commodity = commodityRepository.save(commodity);
        return commodityMapper.toDto(commodity);
    }

    @Override
    public Optional<CommodityDTO> partialUpdate(CommodityDTO commodityDTO) {
        LOG.debug("Request to partially update Commodity : {}", commodityDTO);

        return commodityRepository
            .findById(commodityDTO.getId())
            .map(existingCommodity -> {
                commodityMapper.partialUpdate(existingCommodity, commodityDTO);
                return existingCommodity;
            })
            .map(commodityRepository::save)
            .map(commodityMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CommodityDTO> findOne(Long id) {
        LOG.debug("Request to get Commodity : {}", id);
        return commodityRepository.findById(id).map(commodityMapper::toDto);
    }

    @Override
    public void delete(Long id) {
        LOG.debug("Request to delete Commodity : {}", id);
        commodityConfigRepository.deleteByCommodityId(id);
        deductionRuleRepository.deleteByCommodityId(id);
        hamaliSlabRepository.deleteByCommodityId(id);
        dynamicChargeRepository.deleteByCommodityId(id);
        commodityRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommodityDTO> findAll() {
        LOG.debug("Request to get all Commodities");
        return commodityRepository
            .findAll()
            .stream()
            .map(commodityMapper::toDto)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommodityDTO> findAllByTrader(Long traderId) {
        LOG.debug("Request to get all Commodities for trader : {}", traderId);
        return commodityRepository
            .findAllByTraderId(traderId)
            .stream()
            .map(commodityMapper::toDto)
            .collect(Collectors.toList());
    }
}
