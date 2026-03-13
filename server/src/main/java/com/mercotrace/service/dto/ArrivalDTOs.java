package com.mercotrace.service.dto;

import com.mercotrace.domain.enumeration.FreightMethod;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.io.Serializable;
import java.time.Instant;
import java.util.List;

/**
 * DTOs for the Arrivals aggregate used by ArrivalsPage.
 */
public final class ArrivalDTOs {

    private ArrivalDTOs() {}

    public static class ArrivalLotDTO implements Serializable {

        @NotBlank
        private String lotName;

        @Min(1)
        private int bagCount;

        @NotBlank
        private String commodityName;

        private String brokerTag;

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

        public String getBrokerTag() {
            return brokerTag;
        }

        public void setBrokerTag(String brokerTag) {
            this.brokerTag = brokerTag;
        }
    }

    public static class ArrivalSellerDTO implements Serializable {

        @NotNull
        private Long contactId;

        @NotBlank
        private String sellerName;

        @NotBlank
        private String sellerPhone;

        private String sellerMark;

        @NotNull
        private List<ArrivalLotDTO> lots;

        public Long getContactId() {
            return contactId;
        }

        public void setContactId(Long contactId) {
            this.contactId = contactId;
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

        public List<ArrivalLotDTO> getLots() {
            return lots;
        }

        public void setLots(List<ArrivalLotDTO> lots) {
            this.lots = lots;
        }
    }

    public static class ArrivalRequestDTO implements Serializable {

        private String vehicleNumber;

        private boolean multiSeller;

        @NotNull
        private Double loadedWeight;

        @NotNull
        private Double emptyWeight;

        @NotNull
        private Double deductedWeight;

        @NotNull
        private FreightMethod freightMethod;

        @NotNull
        private Double freightRate;

        private boolean noRental;

        @NotNull
        private Double advancePaid;

        private String brokerName;

        private String narration;

        @NotNull
        private List<ArrivalSellerDTO> sellers;

        public String getVehicleNumber() {
            return vehicleNumber;
        }

        public void setVehicleNumber(String vehicleNumber) {
            this.vehicleNumber = vehicleNumber;
        }

        public boolean isMultiSeller() {
            return multiSeller;
        }

        public void setMultiSeller(boolean multiSeller) {
            this.multiSeller = multiSeller;
        }

        public Double getLoadedWeight() {
            return loadedWeight;
        }

        public void setLoadedWeight(Double loadedWeight) {
            this.loadedWeight = loadedWeight;
        }

        public Double getEmptyWeight() {
            return emptyWeight;
        }

        public void setEmptyWeight(Double emptyWeight) {
            this.emptyWeight = emptyWeight;
        }

        public Double getDeductedWeight() {
            return deductedWeight;
        }

        public void setDeductedWeight(Double deductedWeight) {
            this.deductedWeight = deductedWeight;
        }

        public FreightMethod getFreightMethod() {
            return freightMethod;
        }

        public void setFreightMethod(FreightMethod freightMethod) {
            this.freightMethod = freightMethod;
        }

        public Double getFreightRate() {
            return freightRate;
        }

        public void setFreightRate(Double freightRate) {
            this.freightRate = freightRate;
        }

        public boolean isNoRental() {
            return noRental;
        }

        public void setNoRental(boolean noRental) {
            this.noRental = noRental;
        }

        public Double getAdvancePaid() {
            return advancePaid;
        }

        public void setAdvancePaid(Double advancePaid) {
            this.advancePaid = advancePaid;
        }

        public String getBrokerName() {
            return brokerName;
        }

        public void setBrokerName(String brokerName) {
            this.brokerName = brokerName;
        }

        public String getNarration() {
            return narration;
        }

        public void setNarration(String narration) {
            this.narration = narration;
        }

        public List<ArrivalSellerDTO> getSellers() {
            return sellers;
        }

        public void setSellers(List<ArrivalSellerDTO> sellers) {
            this.sellers = sellers;
        }
    }

    public static class ArrivalSummaryDTO implements Serializable {

        private Long vehicleId;
        private String vehicleNumber;
        private int sellerCount;
        private int lotCount;
        private double netWeight;
        private double finalBillableWeight;
        private double freightTotal;
        private FreightMethod freightMethod;
        private Instant arrivalDatetime;

        public Long getVehicleId() {
            return vehicleId;
        }

        public void setVehicleId(Long vehicleId) {
            this.vehicleId = vehicleId;
        }

        public String getVehicleNumber() {
            return vehicleNumber;
        }

        public void setVehicleNumber(String vehicleNumber) {
            this.vehicleNumber = vehicleNumber;
        }

        public int getSellerCount() {
            return sellerCount;
        }

        public void setSellerCount(int sellerCount) {
            this.sellerCount = sellerCount;
        }

        public int getLotCount() {
            return lotCount;
        }

        public void setLotCount(int lotCount) {
            this.lotCount = lotCount;
        }

        public double getNetWeight() {
            return netWeight;
        }

        public void setNetWeight(double netWeight) {
            this.netWeight = netWeight;
        }

        public double getFinalBillableWeight() {
            return finalBillableWeight;
        }

        public void setFinalBillableWeight(double finalBillableWeight) {
            this.finalBillableWeight = finalBillableWeight;
        }

        public double getFreightTotal() {
            return freightTotal;
        }

        public void setFreightTotal(double freightTotal) {
            this.freightTotal = freightTotal;
        }

        public FreightMethod getFreightMethod() {
            return freightMethod;
        }

        public void setFreightMethod(FreightMethod freightMethod) {
            this.freightMethod = freightMethod;
        }

        public Instant getArrivalDatetime() {
            return arrivalDatetime;
        }

        public void setArrivalDatetime(Instant arrivalDatetime) {
            this.arrivalDatetime = arrivalDatetime;
        }
    }

    /**
     * Lot summary for arrival detail (e.g. WeighingPage bid enrichment).
     */
    public static class ArrivalLotDetailDTO implements Serializable {

        private Long id;
        private String lotName;

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getLotName() {
            return lotName;
        }

        public void setLotName(String lotName) {
            this.lotName = lotName;
        }
    }

    /**
     * Seller summary for arrival detail (seller name + lots with id for lot lookup).
     */
    public static class ArrivalSellerDetailDTO implements Serializable {

        private String sellerName;
        private Long contactId;
        private String origin;
        private List<ArrivalLotDetailDTO> lots;

        public String getSellerName() {
            return sellerName;
        }

        public void setSellerName(String sellerName) {
            this.sellerName = sellerName;
        }

        public Long getContactId() {
            return contactId;
        }

        public void setContactId(Long contactId) {
            this.contactId = contactId;
        }

        public String getOrigin() {
            return origin;
        }

        public void setOrigin(String origin) {
            this.origin = origin;
        }

        public List<ArrivalLotDetailDTO> getLots() {
            return lots;
        }

        public void setLots(List<ArrivalLotDetailDTO> lots) {
            this.lots = lots;
        }
    }

    /**
     * Arrival with nested sellers and lots for pages that need lotId → lotName/sellerName (e.g. WeighingPage).
     */
    public static class ArrivalDetailDTO implements Serializable {

        private Long vehicleId;
        private String vehicleNumber;
        private Instant arrivalDatetime;
        private List<ArrivalSellerDetailDTO> sellers;

        public Long getVehicleId() {
            return vehicleId;
        }

        public void setVehicleId(Long vehicleId) {
            this.vehicleId = vehicleId;
        }

        public String getVehicleNumber() {
            return vehicleNumber;
        }

        public void setVehicleNumber(String vehicleNumber) {
            this.vehicleNumber = vehicleNumber;
        }

        public Instant getArrivalDatetime() {
            return arrivalDatetime;
        }

        public void setArrivalDatetime(Instant arrivalDatetime) {
            this.arrivalDatetime = arrivalDatetime;
        }

        public List<ArrivalSellerDetailDTO> getSellers() {
            return sellers;
        }

        public void setSellers(List<ArrivalSellerDetailDTO> sellers) {
            this.sellers = sellers;
        }
    }
}

