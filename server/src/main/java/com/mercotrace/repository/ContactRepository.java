package com.mercotrace.repository;

import com.mercotrace.domain.Contact;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the Contact entity.
 */
@SuppressWarnings("unused")
@Repository
public interface ContactRepository extends JpaRepository<Contact, Long>, JpaSpecificationExecutor<Contact> {

    Optional<Contact> findOneByTraderIdAndPhone(Long traderId, String phone);

    List<Contact> findAllByTraderId(Long traderId);

    List<Contact> findAllByTraderIdAndMarkContainingIgnoreCase(Long traderId, String mark);

    List<Contact> findAllByTraderIdAndNameContainingIgnoreCase(Long traderId, String name);

    Optional<Contact> findOneByPhone(String phone);

    Optional<Contact> findOneByEmailIgnoreCase(String email);
}

