package com.mercotrace.service.impl;

import com.mercotrace.domain.Contact;
import com.mercotrace.repository.ContactRepository;
import com.mercotrace.service.ContactIdentityService;
import com.mercotrace.service.ContactService;
import com.mercotrace.service.dto.ContactDTO;
import com.mercotrace.service.mapper.ContactMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service Implementation for managing {@link com.mercotrace.domain.Contact}.
 */
@Service
@Transactional
public class ContactServiceImpl implements ContactService {

    /** Cache for vendor list by trader (Stock Purchase and other modules). Evicted on contact save/update/delete. */
    public static final String STOCK_PURCHASE_VENDORS_BY_TRADER_CACHE = "stockPurchaseVendorsByTrader";

    private static final Logger LOG = LoggerFactory.getLogger(ContactServiceImpl.class);

    private final ContactRepository contactRepository;

    private final ContactMapper contactMapper;

    private final CacheManager cacheManager;

    private final ContactIdentityService contactIdentityService;

    public ContactServiceImpl(
        ContactRepository contactRepository,
        ContactMapper contactMapper,
        CacheManager cacheManager,
        ContactIdentityService contactIdentityService
    ) {
        this.contactRepository = contactRepository;
        this.contactMapper = contactMapper;
        this.cacheManager = cacheManager;
        this.contactIdentityService = contactIdentityService;
    }

    @Override
    @CacheEvict(cacheNames = STOCK_PURCHASE_VENDORS_BY_TRADER_CACHE, key = "#contactDTO.traderId")
    public ContactDTO save(ContactDTO contactDTO) {
        LOG.debug("Request to save Contact : {}", contactDTO);

        // Default values for new contacts (aligned with frontend mock)
        if (contactDTO.getCreatedAt() == null) {
            contactDTO.setCreatedAt(Instant.now());
        }
        if (contactDTO.getOpeningBalance() == null) {
            contactDTO.setOpeningBalance(BigDecimal.ZERO);
        }
        if (contactDTO.getCurrentBalance() == null) {
            contactDTO.setCurrentBalance(BigDecimal.ZERO);
        }
        if (contactDTO.getCanLogin() == null) {
            contactDTO.setCanLogin(Boolean.FALSE);
        }

        Contact contact = contactMapper.toEntity(contactDTO);
        contact = contactRepository.save(contact);
        return contactMapper.toDto(contact);
    }

    @Override
    @CacheEvict(cacheNames = STOCK_PURCHASE_VENDORS_BY_TRADER_CACHE, key = "#contactDTO.traderId")
    public ContactDTO update(ContactDTO contactDTO) {
        LOG.debug("Request to update Contact : {}", contactDTO);
        if (contactDTO.getOpeningBalance() == null) {
            contactDTO.setOpeningBalance(BigDecimal.ZERO);
        }
        if (contactDTO.getCurrentBalance() == null) {
            contactDTO.setCurrentBalance(BigDecimal.ZERO);
        }
        if (contactDTO.getCanLogin() == null) {
            contactDTO.setCanLogin(Boolean.FALSE);
        }
        Contact contact = contactMapper.toEntity(contactDTO);
        contact = contactRepository.save(contact);
        return contactMapper.toDto(contact);
    }

    @Override
    public Optional<ContactDTO> partialUpdate(ContactDTO contactDTO) {
        LOG.debug("Request to partially update Contact : {}", contactDTO);

        return contactRepository
            .findById(contactDTO.getId())
            .map(existingContact -> {
                contactMapper.partialUpdate(existingContact, contactDTO);

                return existingContact;
            })
            .map(contactRepository::save)
            .map(
                saved -> {
                    Long traderId = saved.getTraderId();
                    if (traderId != null && cacheManager.getCache(STOCK_PURCHASE_VENDORS_BY_TRADER_CACHE) != null) {
                        cacheManager.getCache(STOCK_PURCHASE_VENDORS_BY_TRADER_CACHE).evict(traderId);
                    }
                    return contactMapper.toDto(saved);
                }
            );
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ContactDTO> findOne(Long id) {
        LOG.debug("Request to get Contact : {}", id);
        return contactRepository.findById(id).map(contactMapper::toDto);
    }

    @Override
    public void delete(Long id) {
        LOG.debug("Request to delete Contact : {}", id);
        contactRepository
            .findById(id)
            .ifPresent(
                c -> {
                    Long traderId = c.getTraderId();
                    if (traderId != null && cacheManager.getCache(STOCK_PURCHASE_VENDORS_BY_TRADER_CACHE) != null) {
                        cacheManager.getCache(STOCK_PURCHASE_VENDORS_BY_TRADER_CACHE).evict(traderId);
                    }
                }
            );
        contactRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = STOCK_PURCHASE_VENDORS_BY_TRADER_CACHE, key = "#traderId", unless = "#result == null")
    public List<ContactDTO> findAllByTrader(Long traderId) {
        LOG.debug("Request to get all Contacts for trader : {}", traderId);
        return contactRepository
            .findAllByTraderId(traderId)
            .stream()
            .map(contactMapper::toDto)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ContactDTO> searchByMark(Long traderId, String markFragment) {
        LOG.debug("Request to search Contacts by fragment. traderId={}, fragment={}", traderId, markFragment);
        List<ContactDTO> all = findAllByTrader(traderId);
        if (markFragment == null || markFragment.isBlank()) {
            return all;
        }
        final String lower = markFragment.toLowerCase();
        return all
            .stream()
            .filter(
                dto ->
                    (dto.getName() != null && dto.getName().toLowerCase().contains(lower)) ||
                    (dto.getPhone() != null && dto.getPhone().contains(markFragment)) ||
                    (dto.getMark() != null && dto.getMark().toLowerCase().contains(lower))
            )
            .collect(Collectors.toList());
    }
}

