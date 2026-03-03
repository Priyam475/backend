package com.mercotrace.web.rest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mercotrace.IntegrationTest;
import com.mercotrace.repository.WriterPadSessionRepository;
import com.mercotrace.repository.WriterPadWeightEntryRepository;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@IntegrationTest
class WriterPadResourceIT {

    private static final String BASE_URL = "/api/module-writers-pad";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private WriterPadSessionRepository sessionRepository;

    @Autowired
    private WriterPadWeightEntryRepository weightEntryRepository;

    @Test
    @WithMockUser(authorities = "AUCTIONS_VIEW")
    void loadOrCreateSession_createsNewSessionAndReturnsDto() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("lotId", 1L);
        payload.put("bidNumber", 101);
        payload.put("buyerMark", "BM-1");
        payload.put("buyerName", "Buyer One");
        payload.put("lotName", "Lot A");
        payload.put("totalBags", 10);
        payload.put("scaleId", "NTC-1");
        payload.put("scaleName", "NTC-1");

        mockMvc
            .perform(
                post(BASE_URL + "/sessions/load-or-create")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(payload))
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").isNumber())
            .andExpect(jsonPath("$.lotId").value(1))
            .andExpect(jsonPath("$.bidNumber").value(101))
            .andExpect(jsonPath("$.buyerMark").value("BM-1"))
            .andExpect(jsonPath("$.totalBags").value(10));

        assertThat(sessionRepository.findAll()).hasSize(1);
    }

    @Test
    @WithMockUser(authorities = "AUCTIONS_VIEW")
    void attachWeight_rejectsNonPositiveWeightWithStandardErrorBody() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("lotId", 1L);
        payload.put("bidNumber", 101);
        payload.put("buyerMark", "BM-1");
        payload.put("buyerName", "Buyer One");
        payload.put("lotName", "Lot A");
        payload.put("totalBags", 10);

        String response = mockMvc
            .perform(
                post(BASE_URL + "/sessions/load-or-create")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsBytes(payload))
            )
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        Long sessionId = objectMapper.readTree(response).get("id").asLong();

        mockMvc
            .perform(
                post(BASE_URL + "/sessions/" + sessionId + "/weights")
                    .param("rawWeight", BigDecimal.ZERO.toString())
                    .param("consideredWeight", BigDecimal.ZERO.toString())
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Raw weight must be positive"))
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.errors[0].field").value("weight"));
    }
}

