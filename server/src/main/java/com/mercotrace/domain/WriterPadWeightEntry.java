package com.mercotrace.domain;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;
import java.math.BigDecimal;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * WriterPadWeightEntry represents a single weight event captured in Writer's Pad,
 * aligned with WritersPadPage.tsx WeightLogEntry.
 */
@Entity
@Table(name = "writer_pad_weight_entry")
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@SuppressWarnings("common-java:DuplicatedBlocks")
public class WriterPadWeightEntry extends AbstractAuditingEntity<Long> implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "bid_number", nullable = false)
    private Integer bidNumber;

    @Column(name = "buyer_mark", nullable = false, length = 50)
    private String buyerMark;

    @Column(name = "raw_weight", nullable = false, precision = 19, scale = 3)
    private BigDecimal rawWeight;

    @Column(name = "considered_weight", nullable = false, precision = 19, scale = 3)
    private BigDecimal consideredWeight;

    @Column(name = "scale_id", length = 64)
    private String scaleId;

    @Column(name = "weighed_at", nullable = false)
    private Instant weighedAt;

    @Column(name = "retagged_from_bid")
    private Integer retaggedFromBid;

    @Column(name = "deleted", nullable = false)
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "deleted_by", length = 50)
    private String deletedBy;

    @Override
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSessionId() {
        return sessionId;
    }

    public void setSessionId(Long sessionId) {
        this.sessionId = sessionId;
    }

    public Integer getBidNumber() {
        return bidNumber;
    }

    public void setBidNumber(Integer bidNumber) {
        this.bidNumber = bidNumber;
    }

    public String getBuyerMark() {
        return buyerMark;
    }

    public void setBuyerMark(String buyerMark) {
        this.buyerMark = buyerMark;
    }

    public BigDecimal getRawWeight() {
        return rawWeight;
    }

    public void setRawWeight(BigDecimal rawWeight) {
        this.rawWeight = rawWeight;
    }

    public BigDecimal getConsideredWeight() {
        return consideredWeight;
    }

    public void setConsideredWeight(BigDecimal consideredWeight) {
        this.consideredWeight = consideredWeight;
    }

    public String getScaleId() {
        return scaleId;
    }

    public void setScaleId(String scaleId) {
        this.scaleId = scaleId;
    }

    public Instant getWeighedAt() {
        return weighedAt;
    }

    public void setWeighedAt(Instant weighedAt) {
        this.weighedAt = weighedAt;
    }

    public Integer getRetaggedFromBid() {
        return retaggedFromBid;
    }

    public void setRetaggedFromBid(Integer retaggedFromBid) {
        this.retaggedFromBid = retaggedFromBid;
    }

    public Boolean getDeleted() {
        return deleted;
    }

    public void setDeleted(Boolean deleted) {
        this.deleted = deleted;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }

    public String getDeletedBy() {
        return deletedBy;
    }

    public void setDeletedBy(String deletedBy) {
        this.deletedBy = deletedBy;
    }
}

