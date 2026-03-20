package com.mercotrace.repository;

import com.mercotrace.domain.TraderPortalContactLink;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TraderPortalContactLinkRepository extends JpaRepository<TraderPortalContactLink, Long> {
    List<TraderPortalContactLink> findAllByTraderIdOrderByLinkedAtDesc(Long traderId);

    boolean existsByTraderIdAndContactId(Long traderId, Long contactId);
}
