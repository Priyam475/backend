package com.mercotrace.domain;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;

/**
 * Associates a trader with a self-registered (portal) contact after first operational use,
 * so the contact appears in the trader's Contacts registry without duplicating rows.
 */
@Entity
@Table(name = "trader_portal_contact_link")
public class TraderPortalContactLink implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @Column(name = "trader_id", nullable = false)
    private Long traderId;

    @Column(name = "contact_id", nullable = false)
    private Long contactId;

    @Column(name = "linked_at", nullable = false)
    private Instant linkedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTraderId() {
        return traderId;
    }

    public void setTraderId(Long traderId) {
        this.traderId = traderId;
    }

    public Long getContactId() {
        return contactId;
    }

    public void setContactId(Long contactId) {
        this.contactId = contactId;
    }

    public Instant getLinkedAt() {
        return linkedAt;
    }

    public void setLinkedAt(Instant linkedAt) {
        this.linkedAt = linkedAt;
    }
}
