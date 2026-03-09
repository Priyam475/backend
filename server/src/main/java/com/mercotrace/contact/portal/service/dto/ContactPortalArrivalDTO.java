package com.mercotrace.contact.portal.service.dto;

import java.io.Serializable;
import java.time.Instant;

/**
 * Minimal DTO for arrivals visible in the Contact Portal.
 */
public class ContactPortalArrivalDTO implements Serializable {

    private String sellerVehicleId;
    private String vehicleId;
    private String traderId;
    private String vehicleNumber;
    private Instant arrivalDatetime;

    public String getSellerVehicleId() {
        return sellerVehicleId;
    }

    public void setSellerVehicleId(String sellerVehicleId) {
        this.sellerVehicleId = sellerVehicleId;
    }

    public String getVehicleId() {
        return vehicleId;
    }

    public void setVehicleId(String vehicleId) {
        this.vehicleId = vehicleId;
    }

    public String getTraderId() {
        return traderId;
    }

    public void setTraderId(String traderId) {
        this.traderId = traderId;
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
}

