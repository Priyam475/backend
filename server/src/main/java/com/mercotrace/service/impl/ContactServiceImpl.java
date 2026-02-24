package com.mercotrace.service.impl;

import com.mercotrace.domain.Contact;
import com.mercotrace.repository.ContactRepository;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service Implementation for managing {@link com.mercotrace.domain.Contact}.
 */
@Service
@Transactional
public class ContactServiceImpl implements ContactService {

    private static final Logger LOG = LoggerFactory.getLogger(ContactServiceImpl.class);

    private final ContactRepository contactRepository;

    private final ContactMapper contactMapper;

    public ContactServiceImpl(ContactRepository contactRepository, ContactMapper contactMapper) {
        this.contactRepository = contactRepository;
        this.contactMapper = contactMapper;
    }

    @Override
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

        Contact contact = contactMapper.toEntity(contactDTO);
        contact = contactRepository.save(contact);
        return contactMapper.toDto(contact);
    }

    @Override
    public ContactDTO update(ContactDTO contactDTO) {
        LOG.debug("Request to update Contact : {}", contactDTO);
        if (contactDTO.getOpeningBalance() == null) {
            contactDTO.setOpeningBalance(BigDecimal.ZERO);
        }
        if (contactDTO.getCurrentBalance() == null) {
            contactDTO.setCurrentBalance(BigDecimal.ZERO);
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
            .map(contactMapper::toDto);
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
        contactRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
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
        LOG.debug("Request to search Contacts by mark. traderId={}, markFragment={}", traderId, markFragment);
        if (markFragment == null || markFragment.isBlank()) {
            return findAllByTrader(traderId);
        }
        return contactRepository
            .findAllByTraderIdAndMarkContainingIgnoreCase(traderId, markFragment)
            .stream()
            .map(contactMapper::toDto)
            .collect(Collectors.toList());
    }
}

