package com.mercotrace.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * A Contact.
 * Module 1 – Contacts Registry aligned with frontend Contact model.
 */
@Entity
@Table(name = "contact")
@Cache(usage = CacheConcurrencyStrategy.NONE)
@SuppressWarnings("common-java:DuplicatedBlocks")
public class Contact implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @Column(name = "trader_id")
    private Long traderId;

    @Size(max = 191)
    @Column(name = "email", length = 191)
    private String email;

    @NotNull
    @Size(max = 150)
    @Column(name = "name", length = 150, nullable = false)
    private String name;

    @NotNull
    @Size(max = 20)
    @Column(name = "phone", length = 20, nullable = false)
    private String phone;

    @Size(max = 20)
    @Column(name = "mark", length = 20)
    private String mark;

    @Column(name = "address")
    private String address;

    @Column(name = "created_at")
    private Instant createdAt;

    @NotNull
    @Column(name = "opening_balance", precision = 19, scale = 2, nullable = false)
    private BigDecimal openingBalance;

    @NotNull
    @Column(name = "current_balance", precision = 19, scale = 2, nullable = false)
    private BigDecimal currentBalance;

    @Size(max = 60)
    @Column(name = "password_hash", length = 60)
    private String passwordHash;

    @NotNull
    @Column(name = "can_login", nullable = false)
    private Boolean canLogin = false;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    // jhipster-needle-entity-add-field - JHipster will add fields here

    public Long getId() {
        return this.id;
    }

    public Contact id(Long id) {
        this.setId(id);
        return this;
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return this.name;
    }

    public Contact name(String name) {
        this.setName(name);
        return this;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhone() {
        return this.phone;
    }

    public Contact phone(String phone) {
        this.setPhone(phone);
        return this;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getMark() {
        return mark;
    }

    public void setMark(String mark) {
        this.mark = mark;
    }

    public String getAddress() {
        return this.address;
    }

    public Contact address(String address) {
        this.setAddress(address);
        return this;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public Instant getCreatedAt() {
        return this.createdAt;
    }

    public Contact createdAt(Instant createdAt) {
        this.setCreatedAt(createdAt);
        return this;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public BigDecimal getOpeningBalance() {
        return openingBalance;
    }

    public void setOpeningBalance(BigDecimal openingBalance) {
        this.openingBalance = openingBalance;
    }

    public BigDecimal getCurrentBalance() {
        return currentBalance;
    }

    public void setCurrentBalance(BigDecimal currentBalance) {
        this.currentBalance = currentBalance;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public Boolean getCanLogin() {
        return canLogin;
    }

    public void setCanLogin(Boolean canLogin) {
        this.canLogin = canLogin;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    // jhipster-needle-entity-add-getters-setters - JHipster will add getters and setters here

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Contact)) {
            return false;
        }
        return getId() != null && getId().equals(((Contact) o).getId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }

    @Override
    public String toString() {
        return "Contact{" +
            "id=" + getId() +
            ", traderId=" + getTraderId() +
            ", name='" + getName() + "'" +
            ", phone='" + getPhone() + "'" +
            ", mark='" + getMark() + "'" +
            ", address='" + getAddress() + "'" +
            ", createdAt='" + getCreatedAt() + "'" +
            ", openingBalance=" + getOpeningBalance() +
            ", currentBalance=" + getCurrentBalance() +
            "}";
    }
}

