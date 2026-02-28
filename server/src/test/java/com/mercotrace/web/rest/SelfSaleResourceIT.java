package com.mercotrace.web.rest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mercotrace.IntegrationTest;
import com.mercotrace.domain.*;
import com.mercotrace.domain.enumeration.BusinessMode;
import com.mercotrace.repository.*;
import com.mercotrace.service.dto.SelfSaleDTOs.ClosureDTO;
import com.mercotrace.service.dto.SelfSaleDTOs.CreateClosureRequestDTO;
import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.data.domain.Pageable;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Integration tests for the {@link SelfSaleResource} REST controller (Self-Sale module).
 * Uses trader 101 (DefaultTraderContextServiceImpl) so test data must belong to trader 101.
 */
@IntegrationTest
@AutoConfigureMockMvc
@WithMockUser
class SelfSaleResourceIT {

    private static final String BASE_URL = "/api/self-sale";
    private static final long CONTEXT_TRADER_ID = 101L;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MockMvc restSelfSaleMockMvc;

    @Autowired
    private LotRepository lotRepository;

    @Autowired
    private SelfSaleClosureRepository selfSaleClosureRepository;

    @Autowired
    private ContactRepository contactRepository;

    @Autowired
    private CommodityRepository commodityRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private SellerInVehicleRepository sellerInVehicleRepository;

    private Contact contact;
    private Commodity commodity;
    private Vehicle vehicle;
    private SellerInVehicle sellerInVehicle;
    private Lot lot;

    @BeforeEach
    void initTest() {
        contact = new Contact();
        contact.setTraderId(CONTEXT_TRADER_ID);
        contact.setName("SelfSale Test Seller");
        contact.setPhone("9876543210");
        contact.setMark("SS");
        contact.setOpeningBalance(BigDecimal.ZERO);
        contact.setCurrentBalance(BigDecimal.ZERO);
        contact.setCreatedAt(Instant.now());
        contact = contactRepository.saveAndFlush(contact);

        commodity = new Commodity();
        commodity.setTraderId(CONTEXT_TRADER_ID);
        commodity.setCommodityName("Wheat");
        commodity.setCreatedAt(Instant.now());
        commodity = commodityRepository.saveAndFlush(commodity);

        vehicle = new Vehicle();
        vehicle.setTraderId(CONTEXT_TRADER_ID);
        vehicle.setVehicleNumber("KA02SS9999");
        vehicle.setArrivalDatetime(Instant.now());
        vehicle.setCreatedAt(Instant.now());
        vehicle = vehicleRepository.saveAndFlush(vehicle);

        sellerInVehicle = new SellerInVehicle();
        sellerInVehicle.setVehicleId(vehicle.getId());
        sellerInVehicle.setContactId(contact.getId());
        sellerInVehicle = sellerInVehicleRepository.saveAndFlush(sellerInVehicle);

        lot = new Lot();
        lot.setSellerVehicleId(sellerInVehicle.getId());
        lot.setCommodityId(commodity.getId());
        lot.setLotName("LOT-SELF-SALE-IT");
        lot.setBagCount(25);
        lot.setSellerSerialNo(1);
        lot.setCreatedAt(Instant.now());
        lot = lotRepository.saveAndFlush(lot);
    }

    @AfterEach
    void cleanup() {
        if (lot != null && lot.getId() != null) {
            selfSaleClosureRepository.findByTraderIdAndIsDeletedFalse(CONTEXT_TRADER_ID, Pageable.unpaged())
                .getContent()
                .stream()
                .filter(c -> c.getLotId().equals(lot.getId()))
                .forEach(selfSaleClosureRepository::delete);
            lotRepository.deleteById(lot.getId());
        }
        if (sellerInVehicle != null && sellerInVehicle.getId() != null) {
            sellerInVehicleRepository.deleteById(sellerInVehicle.getId());
        }
        if (vehicle != null && vehicle.getId() != null) {
            vehicleRepository.deleteById(vehicle.getId());
        }
        if (commodity != null && commodity.getId() != null) {
            commodityRepository.deleteById(commodity.getId());
        }
        if (contact != null && contact.getId() != null) {
            contactRepository.deleteById(contact.getId());
        }
    }

    @Test
    @Transactional
    void getOpenLotsReturnsLotsForCurrentTrader() throws Exception {
        restSelfSaleMockMvc
            .perform(get(BASE_URL + "/open-lots?page=0&size=20"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(header().exists("X-Total-Count"))
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$[?(@.lotId == " + lot.getId() + ")].lotName", hasItem("LOT-SELF-SALE-IT")))
            .andExpect(jsonPath("$[?(@.lotId == " + lot.getId() + ")].bagCount", hasItem(25)))
            .andExpect(jsonPath("$[?(@.lotId == " + lot.getId() + ")].status", hasItem("OPEN")));
    }

    @Test
    @Transactional
    void getOpenLotsWithSearchFiltersResults() throws Exception {
        restSelfSaleMockMvc
            .perform(get(BASE_URL + "/open-lots?page=0&size=20&search=Wheat"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$[?(@.commodityName == 'Wheat')]").isArray());
    }

    @Test
    @Transactional
    void createClosureSucceedsAndReturns201() throws Exception {
        CreateClosureRequestDTO request = new CreateClosureRequestDTO();
        request.setLotId(lot.getId());
        request.setRate(new BigDecimal("100.50"));
        request.setMode(BusinessMode.COMMISSION);

        String responseBody = restSelfSaleMockMvc
            .perform(
                post(BASE_URL + "/closures")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(request))
            )
            .andExpect(status().isCreated())
            .andExpect(header().string("Location", containsString(BASE_URL + "/closures/")))
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$.id").isNumber())
            .andExpect(jsonPath("$.lotId").value(lot.getId().intValue()))
            .andExpect(jsonPath("$.lotName").value("LOT-SELF-SALE-IT"))
            .andExpect(jsonPath("$.rate").value(100.5))
            .andExpect(jsonPath("$.quantity").value(25))
            .andExpect(jsonPath("$.amount").value(2512.5))
            .andExpect(jsonPath("$.mode").value("COMMISSION"))
            .andExpect(jsonPath("$.closedAt").isNotEmpty())
            .andReturn()
            .getResponse()
            .getContentAsString();

        ClosureDTO dto = objectMapper.readValue(responseBody, ClosureDTO.class);
        assertThat(dto.getId()).isNotNull();
        assertThat(dto.getAmount()).isEqualByComparingTo(new BigDecimal("2512.5"));
    }

    @Test
    @Transactional
    void createClosureWhenLotAlreadyClosedReturns400() throws Exception {
        CreateClosureRequestDTO request = new CreateClosureRequestDTO();
        request.setLotId(lot.getId());
        request.setRate(new BigDecimal("50.00"));
        request.setMode(BusinessMode.TRADING);

        restSelfSaleMockMvc
            .perform(
                post(BASE_URL + "/closures")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(request))
            )
            .andExpect(status().isCreated());

        restSelfSaleMockMvc
            .perform(
                post(BASE_URL + "/closures")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(request))
            )
            .andExpect(status().isBadRequest());
    }

    @Test
    @Transactional
    void createClosureWithInvalidRateReturns400() throws Exception {
        CreateClosureRequestDTO request = new CreateClosureRequestDTO();
        request.setLotId(lot.getId());
        request.setRate(BigDecimal.ZERO);
        request.setMode(BusinessMode.COMMISSION);

        restSelfSaleMockMvc
            .perform(
                post(BASE_URL + "/closures")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(request))
            )
            .andExpect(status().isBadRequest());
    }

    @Test
    @Transactional
    void getClosuresReturnsPaginatedList() throws Exception {
        CreateClosureRequestDTO request = new CreateClosureRequestDTO();
        request.setLotId(lot.getId());
        request.setRate(new BigDecimal("75.00"));
        request.setMode(BusinessMode.TRADING);

        restSelfSaleMockMvc
            .perform(
                post(BASE_URL + "/closures")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(request))
            )
            .andExpect(status().isCreated());

        restSelfSaleMockMvc
            .perform(get(BASE_URL + "/closures?page=0&size=10&sort=closedAt,desc"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(header().exists("X-Total-Count"))
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$[0].lotId").value(lot.getId().intValue()))
            .andExpect(jsonPath("$[0].mode").value("TRADING"));
    }
}
