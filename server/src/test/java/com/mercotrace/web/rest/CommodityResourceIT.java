package com.mercotrace.web.rest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mercotrace.IntegrationTest;
import com.mercotrace.domain.Commodity;
import com.mercotrace.repository.CommodityRepository;
import com.mercotrace.service.dto.CommodityDTO;
import com.mercotrace.service.mapper.CommodityMapper;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.Random;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Integration tests for the {@link CommodityResource} REST controller.
 */
@IntegrationTest
@AutoConfigureMockMvc
@WithMockUser
class CommodityResourceIT {

    private static final String DEFAULT_COMMODITY_NAME = "AAAAAAAAAA";
    private static final String UPDATED_COMMODITY_NAME = "BBBBBBBBBB";

    private static final String ENTITY_API_URL = "/api/commodities";
    private static final String ENTITY_API_URL_ID = ENTITY_API_URL + "/{id}";

    private static Random random = new Random();
    private static AtomicLong longCount = new AtomicLong(random.nextInt() + (2 * Integer.MAX_VALUE));

    @Autowired
    private ObjectMapper om;

    @Autowired
    private CommodityRepository commodityRepository;

    @Autowired
    private CommodityMapper commodityMapper;

    @Autowired
    private EntityManager em;

    @Autowired
    private MockMvc restCommodityMockMvc;

    private Commodity commodity;

    private Commodity insertedCommodity;

    public static Commodity createEntity() {
        Commodity c = new Commodity();
        c.setCommodityName(DEFAULT_COMMODITY_NAME);
        c.setTraderId(1L);
        c.setCreatedAt(Instant.now());
        return c;
    }

    @BeforeEach
    void initTest() {
        commodity = createEntity();
    }

    @AfterEach
    void cleanup() {
        if (insertedCommodity != null) {
            commodityRepository.delete(insertedCommodity);
            insertedCommodity = null;
        }
    }

    @Test
    @Transactional
    void createCommodity() throws Exception {
        long databaseSizeBeforeCreate = commodityRepository.count();

        CommodityDTO commodityDTO = commodityMapper.toDto(commodity);
        // Clear id for create
        commodityDTO.setId(null);

        String responseBody = restCommodityMockMvc
            .perform(post(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsBytes(commodityDTO)))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();

        CommodityDTO returned = om.readValue(responseBody, CommodityDTO.class);
        assertThat(commodityRepository.count()).isEqualTo(databaseSizeBeforeCreate + 1);
        assertThat(returned.getCommodityName()).isEqualTo(DEFAULT_COMMODITY_NAME);
        assertThat(returned.getId()).isNotNull();
        insertedCommodity = commodityMapper.toEntity(returned);
    }

    @Test
    @Transactional
    void createCommodityWithExistingId() throws Exception {
        commodity.setId(1L);
        CommodityDTO commodityDTO = commodityMapper.toDto(commodity);
        long databaseSizeBeforeCreate = commodityRepository.count();

        restCommodityMockMvc
            .perform(post(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsBytes(commodityDTO)))
            .andExpect(status().isBadRequest());

        assertThat(commodityRepository.count()).isEqualTo(databaseSizeBeforeCreate);
    }

    @Test
    @Transactional
    void checkCommodityNameIsRequired() throws Exception {
        long databaseSizeBeforeTest = commodityRepository.count();
        commodity.setCommodityName(null);
        CommodityDTO commodityDTO = commodityMapper.toDto(commodity);
        commodityDTO.setId(null);

        restCommodityMockMvc
            .perform(post(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsBytes(commodityDTO)))
            .andExpect(status().isBadRequest());

        assertThat(commodityRepository.count()).isEqualTo(databaseSizeBeforeTest);
    }

    @Test
    @Transactional
    void getAllCommodities() throws Exception {
        insertedCommodity = commodityRepository.saveAndFlush(commodity);

        restCommodityMockMvc
            .perform(get(ENTITY_API_URL))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$.[*].commodity_id").value(hasItem(insertedCommodity.getId().intValue())))
            .andExpect(jsonPath("$.[*].commodity_name").value(hasItem(DEFAULT_COMMODITY_NAME)));
    }

    @Test
    @Transactional
    void getCommodity() throws Exception {
        insertedCommodity = commodityRepository.saveAndFlush(commodity);

        restCommodityMockMvc
            .perform(get(ENTITY_API_URL_ID, insertedCommodity.getId()))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$.commodity_id").value(insertedCommodity.getId().intValue()))
            .andExpect(jsonPath("$.commodity_name").value(DEFAULT_COMMODITY_NAME));
    }

    @Test
    @Transactional
    void getNonExistingCommodity() throws Exception {
        restCommodityMockMvc.perform(get(ENTITY_API_URL_ID, Long.MAX_VALUE)).andExpect(status().isNotFound());
    }

    @Test
    @Transactional
    void putExistingCommodity() throws Exception {
        insertedCommodity = commodityRepository.saveAndFlush(commodity);
        long databaseSizeBeforeUpdate = commodityRepository.count();

        Commodity updatedCommodity = commodityRepository.findById(insertedCommodity.getId()).orElseThrow();
        em.detach(updatedCommodity);
        updatedCommodity.setCommodityName(UPDATED_COMMODITY_NAME);

        CommodityDTO commodityDTO = commodityMapper.toDto(updatedCommodity);

        restCommodityMockMvc
            .perform(
                put(ENTITY_API_URL_ID, commodityDTO.getId())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(om.writeValueAsBytes(commodityDTO))
            )
            .andExpect(status().isOk());

        assertThat(commodityRepository.count()).isEqualTo(databaseSizeBeforeUpdate);
        Commodity persisted = commodityRepository.findById(insertedCommodity.getId()).orElseThrow();
        assertThat(persisted.getCommodityName()).isEqualTo(UPDATED_COMMODITY_NAME);
    }

    @Test
    @Transactional
    void deleteCommodity() throws Exception {
        insertedCommodity = commodityRepository.saveAndFlush(commodity);
        long databaseSizeBeforeDelete = commodityRepository.count();

        restCommodityMockMvc
            .perform(delete(ENTITY_API_URL_ID, insertedCommodity.getId()).accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isNoContent());

        assertThat(commodityRepository.count()).isEqualTo(databaseSizeBeforeDelete - 1);
        insertedCommodity = null;
    }
}
