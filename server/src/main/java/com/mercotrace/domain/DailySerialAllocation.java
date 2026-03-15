package com.mercotrace.domain;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.LocalDate;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * Per-day serial allocation for Logistics (PrintHub): stable seller serial and lot number
 * per trader per date (REQ-LOG-001, REQ-LOG-002). Key is (traderId, serialDate, keyType, keyValue).
 */
@Entity
@Table(
    name = "daily_serial_allocation",
    uniqueConstraints = { @UniqueConstraint(columnNames = { "trader_id", "serial_date", "key_type", "key_value" }) }
)
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
public class DailySerialAllocation implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @Column(name = "trader_id", nullable = false)
    private Long traderId;

    @Column(name = "serial_date", nullable = false)
    private LocalDate serialDate;

    @Column(name = "key_type", nullable = false, length = 20)
    private String keyType; // SELLER | LOT

    @Column(name = "key_value", nullable = false, length = 500)
    private String keyValue;

    @Column(name = "serial_number", nullable = false)
    private Integer serialNumber;

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

    public LocalDate getSerialDate() {
        return serialDate;
    }

    public void setSerialDate(LocalDate serialDate) {
        this.serialDate = serialDate;
    }

    public String getKeyType() {
        return keyType;
    }

    public void setKeyType(String keyType) {
        this.keyType = keyType;
    }

    public String getKeyValue() {
        return keyValue;
    }

    public void setKeyValue(String keyValue) {
        this.keyValue = keyValue;
    }

    public Integer getSerialNumber() {
        return serialNumber;
    }

    public void setSerialNumber(Integer serialNumber) {
        this.serialNumber = serialNumber;
    }
}
