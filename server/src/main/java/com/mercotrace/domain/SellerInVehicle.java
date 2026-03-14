package com.mercotrace.domain;

import jakarta.persistence.*;
import java.io.Serializable;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * A SellerInVehicle.
 */
@Entity
@Table(name = "seller_in_vehicle")
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@SuppressWarnings("common-java:DuplicatedBlocks")
public class SellerInVehicle extends AbstractAuditingEntity<Long> implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @Column(name = "vehicle_id", nullable = false)
    private Long vehicleId;

    @Column(name = "contact_id")
    private Long contactId;

    @Column(name = "broker_id")
    private Long brokerId;

    @Column(name = "seller_name", length = 150)
    private String sellerName;

    @Column(name = "seller_phone", length = 20)
    private String sellerPhone;

    @Column(name = "seller_mark", length = 50)
    private String sellerMark;

    @Override
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getVehicleId() {
        return vehicleId;
    }

    public void setVehicleId(Long vehicleId) {
        this.vehicleId = vehicleId;
    }

    public Long getContactId() {
        return contactId;
    }

    public void setContactId(Long contactId) {
        this.contactId = contactId;
    }

    public Long getBrokerId() {
        return brokerId;
    }

    public void setBrokerId(Long brokerId) {
        this.brokerId = brokerId;
    }

    public String getSellerName() {
        return sellerName;
    }

    public void setSellerName(String sellerName) {
        this.sellerName = sellerName;
    }

    public String getSellerPhone() {
        return sellerPhone;
    }

    public void setSellerPhone(String sellerPhone) {
        this.sellerPhone = sellerPhone;
    }

    public String getSellerMark() {
        return sellerMark;
    }

    public void setSellerMark(String sellerMark) {
        this.sellerMark = sellerMark;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof SellerInVehicle)) {
            return false;
        }
        return getId() != null && getId().equals(((SellerInVehicle) o).getId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }

    @Override
    public String toString() {
        return "SellerInVehicle{" +
            "id=" + getId() +
            ", vehicleId=" + getVehicleId() +
            ", contactId=" + getContactId() +
            ", brokerId=" + getBrokerId() +
            "}";
    }
}

