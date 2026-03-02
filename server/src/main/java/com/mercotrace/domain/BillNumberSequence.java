package com.mercotrace.domain;

import jakarta.persistence.*;
import java.io.Serializable;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * Per-prefix bill number counter. Used to generate bill_number in format prefix-NNNNN.
 */
@Entity
@Table(name = "bill_number_sequence")
@Cache(usage = CacheConcurrencyStrategy.NONE)
@SuppressWarnings("common-java:DuplicatedBlocks")
public class BillNumberSequence implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "prefix", length = 20)
    private String prefix;

    @Column(name = "next_value", nullable = false)
    private Long nextValue = 1L;

    public String getPrefix() { return prefix; }
    public void setPrefix(String prefix) { this.prefix = prefix; }
    public Long getNextValue() { return nextValue; }
    public void setNextValue(Long nextValue) { this.nextValue = nextValue; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof BillNumberSequence)) return false;
        BillNumberSequence that = (BillNumberSequence) o;
        return prefix != null && prefix.equals(that.prefix);
    }

    @Override
    public int hashCode() { return getClass().hashCode(); }
}
