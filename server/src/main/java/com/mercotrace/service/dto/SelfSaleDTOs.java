package com.mercotrace.service.dto;

import com.mercotrace.domain.enumeration.BusinessMode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * DTOs for the Self-Sale module (SelfSalePage.tsx).
 */
public final class SelfSaleDTOs {

    private SelfSaleDTOs() {}

    /** One open lot eligible for self-sale closure. */
    public static class OpenLotDTO implements Serializable {

        private Long lotId;
        private String lotName;
        private int bagCount;
        private String commodityName;
        private String sellerName;
        private String sellerMark;
        private String vehicleNumber;
        private String status; // "OPEN"

        public Long getLotId() {
            return lotId;
        }

        public void setLotId(Long lotId) {
            this.lotId = lotId;
        }

        public String getLotName() {
            return lotName;
        }

        public void setLotName(String lotName) {
            this.lotName = lotName;
        }

        public int getBagCount() {
            return bagCount;
        }

        public void setBagCount(int bagCount) {
            this.bagCount = bagCount;
        }

        public String getCommodityName() {
            return commodityName;
        }

        public void setCommodityName(String commodityName) {
            this.commodityName = commodityName;
        }

        public String getSellerName() {
            return sellerName;
        }

        public void setSellerName(String sellerName) {
            this.sellerName = sellerName;
        }

        public String getSellerMark() {
            return sellerMark;
        }

        public void setSellerMark(String sellerMark) {
            this.sellerMark = sellerMark;
        }

        public String getVehicleNumber() {
            return vehicleNumber;
        }

        public void setVehicleNumber(String vehicleNumber) {
            this.vehicleNumber = vehicleNumber;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }
    }

    /** Request to create a self-sale closure. */
    public static class CreateClosureRequestDTO implements Serializable {

        @NotNull(message = "lotId is required")
        private Long lotId;

        @NotNull(message = "rate is required")
        @DecimalMin(value = "0.01", message = "rate must be greater than 0")
        private BigDecimal rate;

        @NotNull(message = "mode is required")
        private BusinessMode mode;

        public Long getLotId() {
            return lotId;
        }

        public void setLotId(Long lotId) {
            this.lotId = lotId;
        }

        public BigDecimal getRate() {
            return rate;
        }

        public void setRate(BigDecimal rate) {
            this.rate = rate;
        }

        public BusinessMode getMode() {
            return mode;
        }

        public void setMode(BusinessMode mode) {
            this.mode = mode;
        }
    }

    /** Summary of closed self-sales for the current trader (total amount and count). Aligns with client_origin "Total Sold" header. */
    public static class ClosuresSummaryDTO implements Serializable {

        private java.math.BigDecimal totalAmount;
        private long totalCount;

        public java.math.BigDecimal getTotalAmount() {
            return totalAmount;
        }

        public void setTotalAmount(java.math.BigDecimal totalAmount) {
            this.totalAmount = totalAmount;
        }

        public long getTotalCount() {
            return totalCount;
        }

        public void setTotalCount(long totalCount) {
            this.totalCount = totalCount;
        }
    }

    /** Single closure record (create response and list item). */
    public static class ClosureDTO implements Serializable {

        private Long id;
        private Long lotId;
        private String lotName;
        private String commodityName;
        private String sellerName;
        private BigDecimal rate;
        private Integer quantity;
        private BigDecimal amount;
        private BusinessMode mode;
        private Instant closedAt;

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

        public String getLotName() {
            return lotName;
        }

        public void setLotName(String lotName) {
            this.lotName = lotName;
        }

        public String getCommodityName() {
            return commodityName;
        }

        public void setCommodityName(String commodityName) {
            this.commodityName = commodityName;
        }

        public String getSellerName() {
            return sellerName;
        }

        public void setSellerName(String sellerName) {
            this.sellerName = sellerName;
        }

        public BigDecimal getRate() {
            return rate;
        }

        public void setRate(BigDecimal rate) {
            this.rate = rate;
        }

        public Integer getQuantity() {
            return quantity;
        }

        public void setQuantity(Integer quantity) {
            this.quantity = quantity;
        }

        public BigDecimal getAmount() {
            return amount;
        }

        public void setAmount(BigDecimal amount) {
            this.amount = amount;
        }

        public BusinessMode getMode() {
            return mode;
        }

        public void setMode(BusinessMode mode) {
            this.mode = mode;
        }

        public Instant getClosedAt() {
            return closedAt;
        }

        public void setClosedAt(Instant closedAt) {
            this.closedAt = closedAt;
        }
    }
}
