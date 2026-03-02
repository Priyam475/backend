package com.mercotrace.web.rest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mercotrace.IntegrationTest;
import com.mercotrace.service.dto.TrialBalanceRowDTO;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Integration tests for {@link ReportsResource}.
 */
@IntegrationTest
@AutoConfigureMockMvc
class ReportsResourceIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void trialBalanceEndpointReturnsOk() throws Exception {
        var mvcResult = mockMvc.perform(
                get("/api/reports/trial-balance")
                    .param("dateFrom", "2025-01-01")
                    .param("dateTo", "2025-01-31")
                    .accept(MediaType.APPLICATION_JSON)
            )
            .andExpect(status().isOk())
            .andReturn();

        String json = mvcResult.getResponse().getContentAsString();
        List<TrialBalanceRowDTO> rows = objectMapper.readValue(json, new TypeReference<List<TrialBalanceRowDTO>>() {});
        assertThat(rows).isNotNull();
    }
}

