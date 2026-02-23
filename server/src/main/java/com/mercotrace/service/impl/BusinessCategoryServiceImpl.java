package com.mercotrace.service.impl;

import com.mercotrace.domain.BusinessCategory;
import com.mercotrace.repository.BusinessCategoryRepository;
import com.mercotrace.service.BusinessCategoryService;
import com.mercotrace.service.dto.BusinessCategoryDTO;
import com.mercotrace.service.mapper.BusinessCategoryMapper;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service Implementation for managing {@link com.mercotrace.domain.BusinessCategory}.
 */
@Service
@Transactional
public class BusinessCategoryServiceImpl implements BusinessCategoryService {

    private static final Logger LOG = LoggerFactory.getLogger(BusinessCategoryServiceImpl.class);

    private final BusinessCategoryRepository businessCategoryRepository;

    private final BusinessCategoryMapper businessCategoryMapper;

    public BusinessCategoryServiceImpl(
        BusinessCategoryRepository businessCategoryRepository,
        BusinessCategoryMapper businessCategoryMapper
    ) {
        this.businessCategoryRepository = businessCategoryRepository;
        this.businessCategoryMapper = businessCategoryMapper;
    }

    @Override
    public BusinessCategoryDTO save(BusinessCategoryDTO businessCategoryDTO) {
        LOG.debug("Request to save BusinessCategory : {}", businessCategoryDTO);
        BusinessCategory businessCategory = businessCategoryMapper.toEntity(businessCategoryDTO);
        businessCategory = businessCategoryRepository.save(businessCategory);
        return businessCategoryMapper.toDto(businessCategory);
    }

    @Override
    public BusinessCategoryDTO update(BusinessCategoryDTO businessCategoryDTO) {
        LOG.debug("Request to update BusinessCategory : {}", businessCategoryDTO);
        BusinessCategory businessCategory = businessCategoryMapper.toEntity(businessCategoryDTO);
        businessCategory = businessCategoryRepository.save(businessCategory);
        return businessCategoryMapper.toDto(businessCategory);
    }

    @Override
    public Optional<BusinessCategoryDTO> partialUpdate(BusinessCategoryDTO businessCategoryDTO) {
        LOG.debug("Request to partially update BusinessCategory : {}", businessCategoryDTO);

        return businessCategoryRepository
            .findById(businessCategoryDTO.getId())
            .map(existingBusinessCategory -> {
                businessCategoryMapper.partialUpdate(existingBusinessCategory, businessCategoryDTO);

                return existingBusinessCategory;
            })
            .map(businessCategoryRepository::save)
            .map(businessCategoryMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<BusinessCategoryDTO> findOne(Long id) {
        LOG.debug("Request to get BusinessCategory : {}", id);
        return businessCategoryRepository.findById(id).map(businessCategoryMapper::toDto);
    }

    @Override
    public void delete(Long id) {
        LOG.debug("Request to delete BusinessCategory : {}", id);
        businessCategoryRepository.deleteById(id);
    }
}
