package com.mercotrace.service;

import com.mercotrace.service.dto.ContactDTO;
import java.util.List;
import java.util.Optional;

/**
 * Service Interface for managing {@link com.mercotrace.domain.Contact}.
 */
public interface ContactService {

    /**
     * Save a contact.
     *
     * This should be used for creating new contacts.
     *
     * @param contactDTO the entity to save.
     * @return the persisted entity.
     */
    ContactDTO save(ContactDTO contactDTO);

    /**
     * Updates a contact.
     *
     * @param contactDTO the entity to update.
     * @return the persisted entity.
     */
    ContactDTO update(ContactDTO contactDTO);

    /**
     * Partially updates a contact.
     *
     * @param contactDTO the entity to update partially.
     * @return the persisted entity.
     */
    Optional<ContactDTO> partialUpdate(ContactDTO contactDTO);

    /**
     * Get the "id" contact.
     *
     * @param id the id of the entity.
     * @return the entity.
     */
    Optional<ContactDTO> findOne(Long id);

    /**
     * Delete the "id" contact.
     *
     * @param id the id of the entity.
     */
    void delete(Long id);

    /**
     * Get all contacts for a trader.
     *
     * @param traderId the owning trader id.
     * @return list of contacts.
     */
    List<ContactDTO> findAllByTrader(Long traderId);

    /**
     * Search contacts by mark fragment for a trader.
     *
     * @param traderId the owning trader id.
     * @param markFragment the mark fragment to search (case-insensitive contains).
     * @return list of contacts.
     */
    List<ContactDTO> searchByMark(Long traderId, String markFragment);
}

