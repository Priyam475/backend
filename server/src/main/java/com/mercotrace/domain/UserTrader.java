package com.mercotrace.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import java.io.Serializable;

/**
 * Mapping between a JHipster user and a Trader.
 */
@Entity
@Table(name = "user_trader")
public class UserTrader extends AbstractAuditingEntity<Long> implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trader_id", nullable = false)
    private Trader trader;

    @Column(name = "role_in_trader", length = 50)
    private String roleInTrader;

    @Column(name = "primary_mapping", nullable = false)
    private boolean primaryMapping = true;

    @Override
    public Long getId() {
        return this.id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Trader getTrader() {
        return trader;
    }

    public void setTrader(Trader trader) {
        this.trader = trader;
    }

    public String getRoleInTrader() {
        return roleInTrader;
    }

    public void setRoleInTrader(String roleInTrader) {
        this.roleInTrader = roleInTrader;
    }

    public boolean isPrimaryMapping() {
        return primaryMapping;
    }

    public void setPrimaryMapping(boolean primaryMapping) {
        this.primaryMapping = primaryMapping;
    }
}

