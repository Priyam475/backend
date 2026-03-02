package com.mercotrace.web.rest;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mercotrace.IntegrationTest;
import com.mercotrace.domain.SalesBill;
import com.mercotrace.repository.SalesBillRepository;
import com.mercotrace.service.dto.SalesBillDTOs.CommodityGroupDTO;
import com.mercotrace.service.dto.SalesBillDTOs.SalesBillCreateOrUpdateRequest;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Integration tests for {@link SalesBillResource}. Uses trader 101 (DefaultTraderContextServiceImpl).
 */
@IntegrationTest
@AutoConfigureMockMvc
@WithMockUser
class SalesBillResourceIT {

    private static final String BASE_URL = "/api/sales-bills";

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MockMvc restSalesBillMockMvc;

    @Autowired
    private SalesBillRepository salesBillRepository;

    private SalesBill createdBill;

    @AfterEach
    void cleanup() {
        if (createdBill != null && createdBill.getId() != null) {
            salesBillRepository.deleteById(createdBill.getId());
        }
    }

    @Test
    @Transactional
    void getBillsReturnsPaginatedList() throws Exception {
        restSalesBillMockMvc
            .perform(get(BASE_URL + "?page=0&size=10&sort=billDate,desc"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(header().exists("X-Total-Count"))
            .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @Transactional
    void createSalesBillReturns201AndAssignsBillNumber() throws Exception {
        SalesBillCreateOrUpdateRequest request = new SalesBillCreateOrUpdateRequest();
        request.setBuyerName("IT Buyer");
        request.setBuyerMark("ITB");
        request.setBillingName("IT Buyer");
        request.setBillDate(Instant.now().toString());
        request.setGrandTotal(BigDecimal.valueOf(5000));
        CommodityGroupDTO group = new CommodityGroupDTO();
        group.setCommodityName("Onion");
        group.setSubtotal(BigDecimal.valueOf(5000));
        group.setCommissionPercent(BigDecimal.ZERO);
        group.setUserFeePercent(BigDecimal.ZERO);
        group.setCommissionAmount(BigDecimal.ZERO);
        group.setUserFeeAmount(BigDecimal.ZERO);
        group.setTotalCharges(BigDecimal.ZERO);
        group.setItems(List.of());
        request.setCommodityGroups(List.of(group));

        String responseBody = restSalesBillMockMvc
            .perform(post(BASE_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(header().string("Location", containsString("/api/sales-bills/")))
            .andExpect(jsonPath("$.billId").isNotEmpty())
            .andExpect(jsonPath("$.billNumber").value(containsString("-")))
            .andExpect(jsonPath("$.buyerMark").value("ITB"))
            .andExpect(jsonPath("$.grandTotal").value(5000))
            .andReturn()
            .getResponse()
            .getContentAsString();

        com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(responseBody);
        String billId = node.get("billId").asText();
        createdBill = salesBillRepository.findById(Long.parseLong(billId)).orElse(null);
    }

    @Test
    @Transactional
    void getBillByIdReturnsBillWhenExists() throws Exception {
        SalesBillCreateOrUpdateRequest request = new SalesBillCreateOrUpdateRequest();
        request.setBuyerName("Get Test");
        request.setBuyerMark("GT");
        request.setBillingName("Get Test");
        request.setBillDate(Instant.now().toString());
        request.setGrandTotal(BigDecimal.valueOf(1000));
        CommodityGroupDTO group = new CommodityGroupDTO();
        group.setCommodityName("Wheat");
        group.setSubtotal(BigDecimal.valueOf(1000));
        group.setItems(List.of());
        request.setCommodityGroups(List.of(group));

        String createResponse = restSalesBillMockMvc
            .perform(post(BASE_URL).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
        String billId = objectMapper.readTree(createResponse).get("billId").asText();
        createdBill = salesBillRepository.findById(Long.parseLong(billId)).orElse(null);

        restSalesBillMockMvc
            .perform(get(BASE_URL + "/" + billId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.billId").value(billId))
            .andExpect(jsonPath("$.buyerMark").value("GT"));
    }
}
