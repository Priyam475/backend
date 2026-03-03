package com.mercotrace.service.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * DTOs for Writer's Pad module.
 * Aligned with WritersPadPage.tsx BidCard and WeightLogEntry shapes.
 */
@SuppressWarnings("common-java:DuplicatedBlocks")
public final class WriterPadDTOs {

    private WriterPadDTOs() {}

    /**
     * Lightweight summary of a writer pad session for a bid (BidCard equivalent).
     */
    public static class WriterPadSessionDTO implements Serializable {

        private Long id;
        private Long lotId;
        private Integer bidNumber;
        private String buyerMark;
        private String buyerName;
        private String lotName;
        private Integer totalBags;
        private Integer weighedBags;
        private String scaleId;
        private String scaleName;
        private Instant startedAt;
        private Instant endedAt;

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public Long getLotId() {
            return lotId;
        }

        public void setLotId(Long lotId) {
            this.lotId = lotId;
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

        public String getBuyerName() {
            return buyerName;
        }

        public void setBuyerName(String buyerName) {
            this.buyerName = buyerName;
        }

        public String getLotName() {
            return lotName;
        }

        public void setLotName(String lotName) {
            this.lotName = lotName;
        }

        public Integer getTotalBags() {
            return totalBags;
        }

        public void setTotalBags(Integer totalBags) {
            this.totalBags = totalBags;
        }

        public Integer getWeighedBags() {
            return weighedBags;
        }

        public void setWeighedBags(Integer weighedBags) {
            this.weighedBags = weighedBags;
        }

        public String getScaleId() {
            return scaleId;
        }

        public void setScaleId(String scaleId) {
            this.scaleId = scaleId;
        }

        public String getScaleName() {
            return scaleName;
        }

        public void setScaleName(String scaleName) {
            this.scaleName = scaleName;
        }

        public Instant getStartedAt() {
            return startedAt;
        }

        public void setStartedAt(Instant startedAt) {
            this.startedAt = startedAt;
        }

        public Instant getEndedAt() {
            return endedAt;
        }

        public void setEndedAt(Instant endedAt) {
            this.endedAt = endedAt;
        }
    }

    /**
     * Single weight log entry attached to a writer pad session (WeightLogEntry equivalent).
     */
    public static class WriterPadWeightEntryDTO implements Serializable {

        private Long id;
        private Long sessionId;
        private Integer bidNumber;
        private String buyerMark;
        private BigDecimal rawWeight;
        private BigDecimal consideredWeight;
        private String scaleId;
        private Instant weighedAt;
        private Integer retaggedFromBid;
        private Boolean deleted;

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
    }

    /**
     * Combined payload for a session plus a (paged) slice of weight entries.
     * Used by Writers Pad page when loading state from backend.
     */
    public static class WriterPadSessionWithLogDTO implements Serializable {

        private WriterPadSessionDTO session;
        private List<WriterPadWeightEntryDTO> entries;
        private long totalEntries;

        public WriterPadSessionDTO getSession() {
            return session;
        }

        public void setSession(WriterPadSessionDTO session) {
            this.session = session;
        }

        public List<WriterPadWeightEntryDTO> getEntries() {
            return entries;
        }

        public void setEntries(List<WriterPadWeightEntryDTO> entries) {
            this.entries = entries;
        }

        public long getTotalEntries() {
            return totalEntries;
        }

        public void setTotalEntries(long totalEntries) {
            this.totalEntries = totalEntries;
        }
    }
}

