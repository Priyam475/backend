/*
 * Run alone: mvn test -Dtest=CommodityResourceTest
 */
package com.mercotrace.web.rest;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mercotrace.domain.Commodity;
import com.mercotrace.repository.CommodityRepository;
import com.mercotrace.service.CommodityConfigService;
import com.mercotrace.service.CommodityService;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.dto.CommodityDTO;
import com.mercotrace.service.dto.FullCommodityConfigDTO;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Unit tests for the {@link CommodityResource} REST controller.
 * Uses standalone MockMvc with mocked CommodityService, CommodityRepository,
 * CommodityConfigService, and TraderContextService. Covers CRUD and full-config
 * endpoints with positive and negative cases.
 */
@ExtendWith(MockitoExtension.class)
class CommodityResourceTest {

    private static final Long TRADER_ID = 101L;
    private static final String ENTITY_API_URL = "/api/commodities";
    private static final String ENTITY_API_URL_ID = ENTITY_API_URL + "/{id}";
    private static final String ENTITY_API_FULL_CONFIG_URL = ENTITY_API_URL + "/{id}/full-config";

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @Mock
    private CommodityService commodityService;

    @Mock
    private CommodityRepository commodityRepository;

    @Mock
    private CommodityConfigService commodityConfigService;

    @Mock
    private TraderContextService traderContextService;

    @BeforeEach
    void setUp() {
        lenient().when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        CommodityResource resource = new CommodityResource(
            commodityService,
            commodityRepository,
            commodityConfigService,
            traderContextService
        );
        mockMvc = MockMvcBuilders.standaloneSetup(resource).build();
    }

    private CommodityDTO validDto(Long id, String name) {
        CommodityDTO dto = new CommodityDTO();
        dto.setId(id);
        dto.setTraderId(TRADER_ID);
        dto.setCommodityName(name);
        dto.setCreatedAt(Instant.now());
        return dto;
    }

    // ---------- Create ----------
    @Nested
    @DisplayName("POST /api/commodities (create)")
    class CreateCommodity {

        @Test
        @DisplayName("createCommodity_withValidPayload_returns201")
        void createCommodity_withValidPayload_returns201() throws Exception {
            CommodityDTO input = validDto(null, "Wheat");
            input.setId(null);
            CommodityDTO saved = validDto(1L, "Wheat");

            when(commodityRepository.findOneByTraderIdAndCommodityNameIgnoreCase(TRADER_ID, "Wheat")).thenReturn(Optional.empty());
            when(commodityService.save(any(CommodityDTO.class))).thenReturn(saved);

            mockMvc
                .perform(
                    post(ENTITY_API_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(input))
                )
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/commodities/1"))
                .andExpect(jsonPath("$.commodity_id").value(1))
                .andExpect(jsonPath("$.commodity_name").value("Wheat"));

            verify(commodityService).save(any(CommodityDTO.class));
        }

        @Test
        @DisplayName("createCommodity_withIdInPayload_returns400")
        void createCommodity_withIdInPayload_returns400() throws Exception {
            CommodityDTO input = validDto(99L, "Wheat");

            mockMvc
                .perform(
                    post(ENTITY_API_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(input))
                )
                .andExpect(status().isBadRequest());

            verify(commodityService, never()).save(any(CommodityDTO.class));
        }

        @Test
        @DisplayName("createCommodity_withMissingCommodityName_returns400")
        void createCommodity_withMissingCommodityName_returns400() throws Exception {
            CommodityDTO input = validDto(null, null);
            input.setId(null);
            input.setCommodityName(null);

            mockMvc
                .perform(
                    post(ENTITY_API_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(input))
                )
                .andExpect(status().isBadRequest());

            verify(commodityService, never()).save(any(CommodityDTO.class));
        }

        @Test
        @DisplayName("createCommodity_duplicateName_returns400")
        void createCommodity_duplicateName_returns400() throws Exception {
            CommodityDTO input = validDto(null, "Wheat");
            input.setId(null);
            Commodity existing = new Commodity();
            existing.setId(2L);
            existing.setCommodityName("Wheat");
            existing.setTraderId(TRADER_ID);

            when(commodityRepository.findOneByTraderIdAndCommodityNameIgnoreCase(TRADER_ID, "Wheat"))
                .thenReturn(Optional.of(existing));

            mockMvc
                .perform(
                    post(ENTITY_API_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(input))
                )
                .andExpect(status().isBadRequest());

            verify(commodityService, never()).save(any(CommodityDTO.class));
        }
    }

    // ---------- Update ----------
    @Nested
    @DisplayName("PUT /api/commodities/:id (update)")
    class UpdateCommodity {

        @Test
        @DisplayName("updateCommodity_withValidPayload_returns200")
        void updateCommodity_withValidPayload_returns200() throws Exception {
            Long id = 1L;
            CommodityDTO input = validDto(id, "Barley");
            CommodityDTO updated = validDto(id, "Barley");
            CommodityDTO existingDto = validDto(id, "Wheat");

            when(commodityService.findOne(id)).thenReturn(Optional.of(existingDto));
            when(commodityRepository.findOneByTraderIdAndCommodityNameIgnoreCase(TRADER_ID, "Barley"))
                .thenReturn(Optional.empty()); // no other commodity with this name
            when(commodityService.update(any(CommodityDTO.class))).thenReturn(updated);

            mockMvc
                .perform(
                    put(ENTITY_API_URL_ID, id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(input))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commodity_id").value(1))
                .andExpect(jsonPath("$.commodity_name").value("Barley"));

            verify(commodityService).update(any(CommodityDTO.class));
        }

        @Test
        @DisplayName("updateCommodity_withNullIdInPayload_returns400")
        void updateCommodity_withNullIdInPayload_returns400() throws Exception {
            CommodityDTO input = validDto(null, "Wheat");

            mockMvc
                .perform(
                    put(ENTITY_API_URL_ID, 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(input))
                )
                .andExpect(status().isBadRequest());

            verify(commodityService, never()).update(any(CommodityDTO.class));
        }

        @Test
        @DisplayName("updateCommodity_idMismatch_returns400")
        void updateCommodity_idMismatch_returns400() throws Exception {
            CommodityDTO input = validDto(1L, "Wheat");

            mockMvc
                .perform(
                    put(ENTITY_API_URL_ID, 2L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(input))
                )
                .andExpect(status().isBadRequest());

            verify(commodityService, never()).update(any(CommodityDTO.class));
        }

        @Test
        @DisplayName("updateCommodity_duplicateNameByOther_returns400")
        void updateCommodity_duplicateNameByOther_returns400() throws Exception {
            Long id = 1L;
            CommodityDTO input = validDto(id, "Barley");
            CommodityDTO existingDto = validDto(id, "Wheat");
            Commodity otherCommodity = new Commodity();
            otherCommodity.setId(2L);
            otherCommodity.setCommodityName("Barley");
            otherCommodity.setTraderId(TRADER_ID);

            when(commodityService.findOne(id)).thenReturn(Optional.of(existingDto));
            when(commodityRepository.findOneByTraderIdAndCommodityNameIgnoreCase(TRADER_ID, "Barley"))
                .thenReturn(Optional.of(otherCommodity));

            mockMvc
                .perform(
                    put(ENTITY_API_URL_ID, id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(input))
                )
                .andExpect(status().isBadRequest());

            verify(commodityService, never()).update(any(CommodityDTO.class));
        }

        @Test
        @DisplayName("updateCommodity_forbiddenOtherTrader_returns400")
        void updateCommodity_forbiddenOtherTrader_returns400() throws Exception {
            Long id = 1L;
            CommodityDTO input = validDto(id, "Wheat");
            CommodityDTO existingDto = validDto(id, "Wheat");
            existingDto.setTraderId(999L); // different trader

            when(commodityService.findOne(id)).thenReturn(Optional.of(existingDto));

            mockMvc
                .perform(
                    put(ENTITY_API_URL_ID, id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(input))
                )
                .andExpect(status().isBadRequest());

            verify(commodityService, never()).update(any(CommodityDTO.class));
        }
    }

    // ---------- Get by id ----------
    @Nested
    @DisplayName("GET /api/commodities/:id (get)")
    class GetCommodity {

        @Test
        @DisplayName("getCommodity_found_returns200")
        void getCommodity_found_returns200() throws Exception {
            Long id = 1L;
            CommodityDTO dto = validDto(id, "Wheat");
            when(commodityService.findOne(id)).thenReturn(Optional.of(dto));

            mockMvc
                .perform(get(ENTITY_API_URL_ID, id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commodity_id").value(1))
                .andExpect(jsonPath("$.commodity_name").value("Wheat"));

            verify(commodityService).findOne(id);
        }

        @Test
        @DisplayName("getCommodity_notFound_returns404")
        void getCommodity_notFound_returns404() throws Exception {
            Long id = 999L;
            when(commodityService.findOne(id)).thenReturn(Optional.empty());

            mockMvc.perform(get(ENTITY_API_URL_ID, id)).andExpect(status().isNotFound());

            verify(commodityService).findOne(id);
        }

        @Test
        @DisplayName("getCommodity_wrongTrader_returns404")
        void getCommodity_wrongTrader_returns404() throws Exception {
            Long id = 1L;
            CommodityDTO dto = validDto(id, "Wheat");
            dto.setTraderId(999L);
            when(commodityService.findOne(id)).thenReturn(Optional.of(dto));

            mockMvc.perform(get(ENTITY_API_URL_ID, id)).andExpect(status().isNotFound());
        }
    }

    // ---------- List ----------
    @Nested
    @DisplayName("GET /api/commodities (list)")
    class ListCommodities {

        @Test
        @DisplayName("getAllCommodities_success_returns200")
        void getAllCommodities_success_returns200() throws Exception {
            CommodityDTO dto = validDto(1L, "Wheat");
            when(commodityService.findAllByTrader(TRADER_ID)).thenReturn(List.of(dto));

            mockMvc
                .perform(get(ENTITY_API_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.[0].commodity_id").value(1))
                .andExpect(jsonPath("$.[0].commodity_name").value("Wheat"));

            verify(commodityService).findAllByTrader(TRADER_ID);
        }

        @Test
        @DisplayName("getAllCommodities_empty_returns200")
        void getAllCommodities_empty_returns200() throws Exception {
            when(commodityService.findAllByTrader(TRADER_ID)).thenReturn(List.of());

            mockMvc
                .perform(get(ENTITY_API_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
        }
    }

    // ---------- Delete ----------
    @Nested
    @DisplayName("DELETE /api/commodities/:id (delete)")
    class DeleteCommodity {

        @Test
        @DisplayName("deleteCommodity_success_returns204")
        void deleteCommodity_success_returns204() throws Exception {
            Long id = 1L;
            CommodityDTO existing = validDto(id, "Wheat");
            when(commodityService.findOne(id)).thenReturn(Optional.of(existing));

            mockMvc
                .perform(delete(ENTITY_API_URL_ID, id).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());

            verify(commodityService).delete(id);
        }

        @Test
        @DisplayName("deleteCommodity_notFound_returns400")
        void deleteCommodity_notFound_returns400() throws Exception {
            Long id = 999L;
            when(commodityService.findOne(id)).thenReturn(Optional.empty());

            mockMvc
                .perform(delete(ENTITY_API_URL_ID, id).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());

            verify(commodityService, never()).delete(anyLong());
        }

        @Test
        @DisplayName("deleteCommodity_wrongTrader_returns400")
        void deleteCommodity_wrongTrader_returns400() throws Exception {
            Long id = 1L;
            CommodityDTO existing = validDto(id, "Wheat");
            existing.setTraderId(999L);
            when(commodityService.findOne(id)).thenReturn(Optional.of(existing));

            mockMvc
                .perform(delete(ENTITY_API_URL_ID, id).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());

            verify(commodityService, never()).delete(anyLong());
        }
    }

    // ---------- Full config ----------
    private static final String ENTITY_API_FULL_CONFIGS_URL = ENTITY_API_URL + "/full-configs";

    @Nested
    @DisplayName("GET /api/commodities/full-configs (list)")
    class GetAllFullConfigs {

        @Test
        @DisplayName("getAllFullConfigs_success_returns200")
        void getAllFullConfigs_success_returns200() throws Exception {
            FullCommodityConfigDTO dto = new FullCommodityConfigDTO();
            dto.setCommodityId(1L);
            when(commodityConfigService.getAllFullConfigs()).thenReturn(List.of(dto));

            mockMvc
                .perform(get(ENTITY_API_FULL_CONFIGS_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.[0].commodityId").value(1));

            verify(commodityConfigService).getAllFullConfigs();
        }
    }

    @Nested
    @DisplayName("GET /api/commodities/:id/full-config")
    class GetFullConfig {

        @Test
        @DisplayName("getFullConfig_found_returns200")
        void getFullConfig_found_returns200() throws Exception {
            Long id = 1L;
            FullCommodityConfigDTO dto = new FullCommodityConfigDTO();
            dto.setCommodityId(id);
            when(commodityConfigService.getFullConfig(id)).thenReturn(dto);

            mockMvc
                .perform(get(ENTITY_API_FULL_CONFIG_URL, id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commodityId").value(1));
        }
    }

    @Nested
    @DisplayName("PUT /api/commodities/:id/full-config")
    class UpdateFullConfig {

        @Test
        @DisplayName("updateFullConfig_mismatchedId_returns400")
        void updateFullConfig_mismatchedId_returns400() throws Exception {
            Long pathId = 1L;
            FullCommodityConfigDTO body = new FullCommodityConfigDTO();
            body.setCommodityId(9999L); // different from path

            mockMvc
                .perform(
                    put(ENTITY_API_FULL_CONFIG_URL, pathId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(body))
                )
                .andExpect(status().isBadRequest());

            verify(commodityConfigService, never()).saveFullConfig(any(FullCommodityConfigDTO.class));
        }
    }

    // ---------- Partial update ----------
    @Nested
    @DisplayName("PATCH /api/commodities/:id (partial update)")
    class PartialUpdateCommodity {

        @Test
        @DisplayName("partialUpdateCommodity_withValidPayload_returns200")
        void partialUpdateCommodity_withValidPayload_returns200() throws Exception {
            Long id = 1L;
            CommodityDTO input = validDto(id, "Barley");
            CommodityDTO existingDto = validDto(id, "Wheat");
            when(commodityService.findOne(id)).thenReturn(Optional.of(existingDto));
            when(commodityService.partialUpdate(any(CommodityDTO.class))).thenReturn(Optional.of(input));

            mockMvc
                .perform(
                    patch(ENTITY_API_URL_ID, id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(input))
                )
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("partialUpdateCommodity_idMismatch_returns400")
        void partialUpdateCommodity_idMismatch_returns400() throws Exception {
            CommodityDTO input = validDto(1L, "Wheat");

            mockMvc
                .perform(
                    patch(ENTITY_API_URL_ID, 2L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(input))
                )
                .andExpect(status().isBadRequest());

            verify(commodityService, never()).partialUpdate(any(CommodityDTO.class));
        }
    }
}
