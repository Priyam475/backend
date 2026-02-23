package com.mercotrace.web.rest;

import static com.mercotrace.domain.TraderAsserts.*;
import static com.mercotrace.web.rest.TestUtil.createUpdateProxyForBean;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mercotrace.IntegrationTest;
import com.mercotrace.domain.Trader;
import com.mercotrace.domain.enumeration.ApprovalStatus;
import com.mercotrace.domain.enumeration.BusinessMode;
import com.mercotrace.repository.TraderRepository;
import com.mercotrace.service.dto.TraderDTO;
import com.mercotrace.service.mapper.TraderMapper;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
 * Integration tests for the {@link TraderResource} REST controller.
 */
@IntegrationTest
@AutoConfigureMockMvc
@WithMockUser
class TraderResourceIT {

    private static final String DEFAULT_BUSINESS_NAME = "AAAAAAAAAA";
    private static final String UPDATED_BUSINESS_NAME = "BBBBBBBBBB";

    private static final String DEFAULT_OWNER_NAME = "AAAAAAAAAA";
    private static final String UPDATED_OWNER_NAME = "BBBBBBBBBB";

    private static final String DEFAULT_ADDRESS = "AAAAAAAAAA";
    private static final String UPDATED_ADDRESS = "BBBBBBBBBB";

    private static final String DEFAULT_CATEGORY = "AAAAAAAAAA";
    private static final String UPDATED_CATEGORY = "BBBBBBBBBB";

    private static final ApprovalStatus DEFAULT_APPROVAL_STATUS = ApprovalStatus.PENDING;
    private static final ApprovalStatus UPDATED_APPROVAL_STATUS = ApprovalStatus.APPROVED;

    private static final BusinessMode DEFAULT_BUSINESS_MODE = BusinessMode.COMMISSION;
    private static final BusinessMode UPDATED_BUSINESS_MODE = BusinessMode.TRADING;

    private static final String DEFAULT_BILL_PREFIX = "AAAAAAAAAA";
    private static final String UPDATED_BILL_PREFIX = "BBBBBBBBBB";

    private static final Instant DEFAULT_CREATED_AT = Instant.ofEpochMilli(0L);
    private static final Instant UPDATED_CREATED_AT = Instant.now().truncatedTo(ChronoUnit.MILLIS);

    private static final Instant DEFAULT_UPDATED_AT = Instant.ofEpochMilli(0L);
    private static final Instant UPDATED_UPDATED_AT = Instant.now().truncatedTo(ChronoUnit.MILLIS);

    private static final String ENTITY_API_URL = "/api/traders";
    private static final String ENTITY_API_URL_ID = ENTITY_API_URL + "/{id}";

    private static Random random = new Random();
    private static AtomicLong longCount = new AtomicLong(random.nextInt() + (2 * Integer.MAX_VALUE));

    @Autowired
    private ObjectMapper om;

    @Autowired
    private TraderRepository traderRepository;

    @Autowired
    private TraderMapper traderMapper;

    @Autowired
    private EntityManager em;

    @Autowired
    private MockMvc restTraderMockMvc;

    private Trader trader;

    private Trader insertedTrader;

    /**
     * Create an entity for this test.
     *
     * This is a static method, as tests for other entities might also need it,
     * if they test an entity which requires the current entity.
     */
    public static Trader createEntity() {
        return new Trader()
            .businessName(DEFAULT_BUSINESS_NAME)
            .ownerName(DEFAULT_OWNER_NAME)
            .address(DEFAULT_ADDRESS)
            .category(DEFAULT_CATEGORY)
            .approvalStatus(DEFAULT_APPROVAL_STATUS)
            .businessMode(DEFAULT_BUSINESS_MODE)
            .billPrefix(DEFAULT_BILL_PREFIX)
            .createdAt(DEFAULT_CREATED_AT)
            .updatedAt(DEFAULT_UPDATED_AT);
    }

    /**
     * Create an updated entity for this test.
     *
     * This is a static method, as tests for other entities might also need it,
     * if they test an entity which requires the current entity.
     */
    public static Trader createUpdatedEntity() {
        return new Trader()
            .businessName(UPDATED_BUSINESS_NAME)
            .ownerName(UPDATED_OWNER_NAME)
            .address(UPDATED_ADDRESS)
            .category(UPDATED_CATEGORY)
            .approvalStatus(UPDATED_APPROVAL_STATUS)
            .businessMode(UPDATED_BUSINESS_MODE)
            .billPrefix(UPDATED_BILL_PREFIX)
            .createdAt(UPDATED_CREATED_AT)
            .updatedAt(UPDATED_UPDATED_AT);
    }

    @BeforeEach
    void initTest() {
        trader = createEntity();
    }

    @AfterEach
    void cleanup() {
        if (insertedTrader != null) {
            traderRepository.delete(insertedTrader);
            insertedTrader = null;
        }
    }

    @Test
    @Transactional
    void createTrader() throws Exception {
        long databaseSizeBeforeCreate = getRepositoryCount();
        // Create the Trader
        TraderDTO traderDTO = traderMapper.toDto(trader);
        var returnedTraderDTO = om.readValue(
            restTraderMockMvc
                .perform(post(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsBytes(traderDTO)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(),
            TraderDTO.class
        );

        // Validate the Trader in the database
        assertIncrementedRepositoryCount(databaseSizeBeforeCreate);
        var returnedTrader = traderMapper.toEntity(returnedTraderDTO);
        assertTraderUpdatableFieldsEquals(returnedTrader, getPersistedTrader(returnedTrader));

        insertedTrader = returnedTrader;
    }

    @Test
    @Transactional
    void createTraderWithExistingId() throws Exception {
        // Create the Trader with an existing ID
        trader.setId(1L);
        TraderDTO traderDTO = traderMapper.toDto(trader);

        long databaseSizeBeforeCreate = getRepositoryCount();

        // An entity with an existing ID cannot be created, so this API call must fail
        restTraderMockMvc
            .perform(post(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsBytes(traderDTO)))
            .andExpect(status().isBadRequest());

        // Validate the Trader in the database
        assertSameRepositoryCount(databaseSizeBeforeCreate);
    }

    @Test
    @Transactional
    void checkBusinessNameIsRequired() throws Exception {
        long databaseSizeBeforeTest = getRepositoryCount();
        // set the field null
        trader.setBusinessName(null);

        // Create the Trader, which fails.
        TraderDTO traderDTO = traderMapper.toDto(trader);

        restTraderMockMvc
            .perform(post(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsBytes(traderDTO)))
            .andExpect(status().isBadRequest());

        assertSameRepositoryCount(databaseSizeBeforeTest);
    }

    @Test
    @Transactional
    void checkOwnerNameIsRequired() throws Exception {
        long databaseSizeBeforeTest = getRepositoryCount();
        // set the field null
        trader.setOwnerName(null);

        // Create the Trader, which fails.
        TraderDTO traderDTO = traderMapper.toDto(trader);

        restTraderMockMvc
            .perform(post(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsBytes(traderDTO)))
            .andExpect(status().isBadRequest());

        assertSameRepositoryCount(databaseSizeBeforeTest);
    }

    @Test
    @Transactional
    void getAllTraders() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList
        restTraderMockMvc
            .perform(get(ENTITY_API_URL + "?sort=id,desc"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$.[*].id").value(hasItem(trader.getId().intValue())))
            .andExpect(jsonPath("$.[*].businessName").value(hasItem(DEFAULT_BUSINESS_NAME)))
            .andExpect(jsonPath("$.[*].ownerName").value(hasItem(DEFAULT_OWNER_NAME)))
            .andExpect(jsonPath("$.[*].address").value(hasItem(DEFAULT_ADDRESS)))
            .andExpect(jsonPath("$.[*].category").value(hasItem(DEFAULT_CATEGORY)))
            .andExpect(jsonPath("$.[*].approvalStatus").value(hasItem(DEFAULT_APPROVAL_STATUS.toString())))
            .andExpect(jsonPath("$.[*].businessMode").value(hasItem(DEFAULT_BUSINESS_MODE.toString())))
            .andExpect(jsonPath("$.[*].billPrefix").value(hasItem(DEFAULT_BILL_PREFIX)))
            .andExpect(jsonPath("$.[*].createdAt").value(hasItem(DEFAULT_CREATED_AT.toString())))
            .andExpect(jsonPath("$.[*].updatedAt").value(hasItem(DEFAULT_UPDATED_AT.toString())));
    }

    @Test
    @Transactional
    void getTrader() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get the trader
        restTraderMockMvc
            .perform(get(ENTITY_API_URL_ID, trader.getId()))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$.id").value(trader.getId().intValue()))
            .andExpect(jsonPath("$.businessName").value(DEFAULT_BUSINESS_NAME))
            .andExpect(jsonPath("$.ownerName").value(DEFAULT_OWNER_NAME))
            .andExpect(jsonPath("$.address").value(DEFAULT_ADDRESS))
            .andExpect(jsonPath("$.category").value(DEFAULT_CATEGORY))
            .andExpect(jsonPath("$.approvalStatus").value(DEFAULT_APPROVAL_STATUS.toString()))
            .andExpect(jsonPath("$.businessMode").value(DEFAULT_BUSINESS_MODE.toString()))
            .andExpect(jsonPath("$.billPrefix").value(DEFAULT_BILL_PREFIX))
            .andExpect(jsonPath("$.createdAt").value(DEFAULT_CREATED_AT.toString()))
            .andExpect(jsonPath("$.updatedAt").value(DEFAULT_UPDATED_AT.toString()));
    }

    @Test
    @Transactional
    void getTradersByIdFiltering() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        Long id = trader.getId();

        defaultTraderFiltering("id.equals=" + id, "id.notEquals=" + id);

        defaultTraderFiltering("id.greaterThanOrEqual=" + id, "id.greaterThan=" + id);

        defaultTraderFiltering("id.lessThanOrEqual=" + id, "id.lessThan=" + id);
    }

    @Test
    @Transactional
    void getAllTradersByBusinessNameIsEqualToSomething() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where businessName equals to
        defaultTraderFiltering("businessName.equals=" + DEFAULT_BUSINESS_NAME, "businessName.equals=" + UPDATED_BUSINESS_NAME);
    }

    @Test
    @Transactional
    void getAllTradersByBusinessNameIsInShouldWork() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where businessName in
        defaultTraderFiltering(
            "businessName.in=" + DEFAULT_BUSINESS_NAME + "," + UPDATED_BUSINESS_NAME,
            "businessName.in=" + UPDATED_BUSINESS_NAME
        );
    }

    @Test
    @Transactional
    void getAllTradersByBusinessNameIsNullOrNotNull() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where businessName is not null
        defaultTraderFiltering("businessName.specified=true", "businessName.specified=false");
    }

    @Test
    @Transactional
    void getAllTradersByBusinessNameContainsSomething() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where businessName contains
        defaultTraderFiltering("businessName.contains=" + DEFAULT_BUSINESS_NAME, "businessName.contains=" + UPDATED_BUSINESS_NAME);
    }

    @Test
    @Transactional
    void getAllTradersByBusinessNameNotContainsSomething() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where businessName does not contain
        defaultTraderFiltering(
            "businessName.doesNotContain=" + UPDATED_BUSINESS_NAME,
            "businessName.doesNotContain=" + DEFAULT_BUSINESS_NAME
        );
    }

    @Test
    @Transactional
    void getAllTradersByOwnerNameIsEqualToSomething() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where ownerName equals to
        defaultTraderFiltering("ownerName.equals=" + DEFAULT_OWNER_NAME, "ownerName.equals=" + UPDATED_OWNER_NAME);
    }

    @Test
    @Transactional
    void getAllTradersByOwnerNameIsInShouldWork() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where ownerName in
        defaultTraderFiltering("ownerName.in=" + DEFAULT_OWNER_NAME + "," + UPDATED_OWNER_NAME, "ownerName.in=" + UPDATED_OWNER_NAME);
    }

    @Test
    @Transactional
    void getAllTradersByOwnerNameIsNullOrNotNull() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where ownerName is not null
        defaultTraderFiltering("ownerName.specified=true", "ownerName.specified=false");
    }

    @Test
    @Transactional
    void getAllTradersByOwnerNameContainsSomething() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where ownerName contains
        defaultTraderFiltering("ownerName.contains=" + DEFAULT_OWNER_NAME, "ownerName.contains=" + UPDATED_OWNER_NAME);
    }

    @Test
    @Transactional
    void getAllTradersByOwnerNameNotContainsSomething() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where ownerName does not contain
        defaultTraderFiltering("ownerName.doesNotContain=" + UPDATED_OWNER_NAME, "ownerName.doesNotContain=" + DEFAULT_OWNER_NAME);
    }

    @Test
    @Transactional
    void getAllTradersByCategoryIsEqualToSomething() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where category equals to
        defaultTraderFiltering("category.equals=" + DEFAULT_CATEGORY, "category.equals=" + UPDATED_CATEGORY);
    }

    @Test
    @Transactional
    void getAllTradersByCategoryIsInShouldWork() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where category in
        defaultTraderFiltering("category.in=" + DEFAULT_CATEGORY + "," + UPDATED_CATEGORY, "category.in=" + UPDATED_CATEGORY);
    }

    @Test
    @Transactional
    void getAllTradersByCategoryIsNullOrNotNull() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where category is not null
        defaultTraderFiltering("category.specified=true", "category.specified=false");
    }

    @Test
    @Transactional
    void getAllTradersByCategoryContainsSomething() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where category contains
        defaultTraderFiltering("category.contains=" + DEFAULT_CATEGORY, "category.contains=" + UPDATED_CATEGORY);
    }

    @Test
    @Transactional
    void getAllTradersByCategoryNotContainsSomething() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where category does not contain
        defaultTraderFiltering("category.doesNotContain=" + UPDATED_CATEGORY, "category.doesNotContain=" + DEFAULT_CATEGORY);
    }

    @Test
    @Transactional
    void getAllTradersByApprovalStatusIsEqualToSomething() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where approvalStatus equals to
        defaultTraderFiltering("approvalStatus.equals=" + DEFAULT_APPROVAL_STATUS, "approvalStatus.equals=" + UPDATED_APPROVAL_STATUS);
    }

    @Test
    @Transactional
    void getAllTradersByApprovalStatusIsInShouldWork() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where approvalStatus in
        defaultTraderFiltering(
            "approvalStatus.in=" + DEFAULT_APPROVAL_STATUS + "," + UPDATED_APPROVAL_STATUS,
            "approvalStatus.in=" + UPDATED_APPROVAL_STATUS
        );
    }

    @Test
    @Transactional
    void getAllTradersByApprovalStatusIsNullOrNotNull() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where approvalStatus is not null
        defaultTraderFiltering("approvalStatus.specified=true", "approvalStatus.specified=false");
    }

    @Test
    @Transactional
    void getAllTradersByBusinessModeIsEqualToSomething() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where businessMode equals to
        defaultTraderFiltering("businessMode.equals=" + DEFAULT_BUSINESS_MODE, "businessMode.equals=" + UPDATED_BUSINESS_MODE);
    }

    @Test
    @Transactional
    void getAllTradersByBusinessModeIsInShouldWork() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where businessMode in
        defaultTraderFiltering(
            "businessMode.in=" + DEFAULT_BUSINESS_MODE + "," + UPDATED_BUSINESS_MODE,
            "businessMode.in=" + UPDATED_BUSINESS_MODE
        );
    }

    @Test
    @Transactional
    void getAllTradersByBusinessModeIsNullOrNotNull() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where businessMode is not null
        defaultTraderFiltering("businessMode.specified=true", "businessMode.specified=false");
    }

    @Test
    @Transactional
    void getAllTradersByBillPrefixIsEqualToSomething() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where billPrefix equals to
        defaultTraderFiltering("billPrefix.equals=" + DEFAULT_BILL_PREFIX, "billPrefix.equals=" + UPDATED_BILL_PREFIX);
    }

    @Test
    @Transactional
    void getAllTradersByBillPrefixIsInShouldWork() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where billPrefix in
        defaultTraderFiltering("billPrefix.in=" + DEFAULT_BILL_PREFIX + "," + UPDATED_BILL_PREFIX, "billPrefix.in=" + UPDATED_BILL_PREFIX);
    }

    @Test
    @Transactional
    void getAllTradersByBillPrefixIsNullOrNotNull() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where billPrefix is not null
        defaultTraderFiltering("billPrefix.specified=true", "billPrefix.specified=false");
    }

    @Test
    @Transactional
    void getAllTradersByBillPrefixContainsSomething() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where billPrefix contains
        defaultTraderFiltering("billPrefix.contains=" + DEFAULT_BILL_PREFIX, "billPrefix.contains=" + UPDATED_BILL_PREFIX);
    }

    @Test
    @Transactional
    void getAllTradersByBillPrefixNotContainsSomething() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where billPrefix does not contain
        defaultTraderFiltering("billPrefix.doesNotContain=" + UPDATED_BILL_PREFIX, "billPrefix.doesNotContain=" + DEFAULT_BILL_PREFIX);
    }

    @Test
    @Transactional
    void getAllTradersByCreatedAtIsEqualToSomething() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where createdAt equals to
        defaultTraderFiltering("createdAt.equals=" + DEFAULT_CREATED_AT, "createdAt.equals=" + UPDATED_CREATED_AT);
    }

    @Test
    @Transactional
    void getAllTradersByCreatedAtIsInShouldWork() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where createdAt in
        defaultTraderFiltering("createdAt.in=" + DEFAULT_CREATED_AT + "," + UPDATED_CREATED_AT, "createdAt.in=" + UPDATED_CREATED_AT);
    }

    @Test
    @Transactional
    void getAllTradersByCreatedAtIsNullOrNotNull() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where createdAt is not null
        defaultTraderFiltering("createdAt.specified=true", "createdAt.specified=false");
    }

    @Test
    @Transactional
    void getAllTradersByUpdatedAtIsEqualToSomething() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where updatedAt equals to
        defaultTraderFiltering("updatedAt.equals=" + DEFAULT_UPDATED_AT, "updatedAt.equals=" + UPDATED_UPDATED_AT);
    }

    @Test
    @Transactional
    void getAllTradersByUpdatedAtIsInShouldWork() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where updatedAt in
        defaultTraderFiltering("updatedAt.in=" + DEFAULT_UPDATED_AT + "," + UPDATED_UPDATED_AT, "updatedAt.in=" + UPDATED_UPDATED_AT);
    }

    @Test
    @Transactional
    void getAllTradersByUpdatedAtIsNullOrNotNull() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        // Get all the traderList where updatedAt is not null
        defaultTraderFiltering("updatedAt.specified=true", "updatedAt.specified=false");
    }

    private void defaultTraderFiltering(String shouldBeFound, String shouldNotBeFound) throws Exception {
        defaultTraderShouldBeFound(shouldBeFound);
        defaultTraderShouldNotBeFound(shouldNotBeFound);
    }

    /**
     * Executes the search, and checks that the default entity is returned.
     */
    private void defaultTraderShouldBeFound(String filter) throws Exception {
        restTraderMockMvc
            .perform(get(ENTITY_API_URL + "?sort=id,desc&" + filter))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$.[*].id").value(hasItem(trader.getId().intValue())))
            .andExpect(jsonPath("$.[*].businessName").value(hasItem(DEFAULT_BUSINESS_NAME)))
            .andExpect(jsonPath("$.[*].ownerName").value(hasItem(DEFAULT_OWNER_NAME)))
            .andExpect(jsonPath("$.[*].address").value(hasItem(DEFAULT_ADDRESS)))
            .andExpect(jsonPath("$.[*].category").value(hasItem(DEFAULT_CATEGORY)))
            .andExpect(jsonPath("$.[*].approvalStatus").value(hasItem(DEFAULT_APPROVAL_STATUS.toString())))
            .andExpect(jsonPath("$.[*].businessMode").value(hasItem(DEFAULT_BUSINESS_MODE.toString())))
            .andExpect(jsonPath("$.[*].billPrefix").value(hasItem(DEFAULT_BILL_PREFIX)))
            .andExpect(jsonPath("$.[*].createdAt").value(hasItem(DEFAULT_CREATED_AT.toString())))
            .andExpect(jsonPath("$.[*].updatedAt").value(hasItem(DEFAULT_UPDATED_AT.toString())));

        // Check, that the count call also returns 1
        restTraderMockMvc
            .perform(get(ENTITY_API_URL + "/count?sort=id,desc&" + filter))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(content().string("1"));
    }

    /**
     * Executes the search, and checks that the default entity is not returned.
     */
    private void defaultTraderShouldNotBeFound(String filter) throws Exception {
        restTraderMockMvc
            .perform(get(ENTITY_API_URL + "?sort=id,desc&" + filter))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$").isEmpty());

        // Check, that the count call also returns 0
        restTraderMockMvc
            .perform(get(ENTITY_API_URL + "/count?sort=id,desc&" + filter))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(content().string("0"));
    }

    @Test
    @Transactional
    void getNonExistingTrader() throws Exception {
        // Get the trader
        restTraderMockMvc.perform(get(ENTITY_API_URL_ID, Long.MAX_VALUE)).andExpect(status().isNotFound());
    }

    @Test
    @Transactional
    void putExistingTrader() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        long databaseSizeBeforeUpdate = getRepositoryCount();

        // Update the trader
        Trader updatedTrader = traderRepository.findById(trader.getId()).orElseThrow();
        // Disconnect from session so that the updates on updatedTrader are not directly saved in db
        em.detach(updatedTrader);
        updatedTrader
            .businessName(UPDATED_BUSINESS_NAME)
            .ownerName(UPDATED_OWNER_NAME)
            .address(UPDATED_ADDRESS)
            .category(UPDATED_CATEGORY)
            .approvalStatus(UPDATED_APPROVAL_STATUS)
            .businessMode(UPDATED_BUSINESS_MODE)
            .billPrefix(UPDATED_BILL_PREFIX)
            .createdAt(UPDATED_CREATED_AT)
            .updatedAt(UPDATED_UPDATED_AT);
        TraderDTO traderDTO = traderMapper.toDto(updatedTrader);

        restTraderMockMvc
            .perform(
                put(ENTITY_API_URL_ID, traderDTO.getId()).contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsBytes(traderDTO))
            )
            .andExpect(status().isOk());

        // Validate the Trader in the database
        assertSameRepositoryCount(databaseSizeBeforeUpdate);
        assertPersistedTraderToMatchAllProperties(updatedTrader);
    }

    @Test
    @Transactional
    void putNonExistingTrader() throws Exception {
        long databaseSizeBeforeUpdate = getRepositoryCount();
        trader.setId(longCount.incrementAndGet());

        // Create the Trader
        TraderDTO traderDTO = traderMapper.toDto(trader);

        // If the entity doesn't have an ID, it will throw BadRequestAlertException
        restTraderMockMvc
            .perform(
                put(ENTITY_API_URL_ID, traderDTO.getId()).contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsBytes(traderDTO))
            )
            .andExpect(status().isBadRequest());

        // Validate the Trader in the database
        assertSameRepositoryCount(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void putWithIdMismatchTrader() throws Exception {
        long databaseSizeBeforeUpdate = getRepositoryCount();
        trader.setId(longCount.incrementAndGet());

        // Create the Trader
        TraderDTO traderDTO = traderMapper.toDto(trader);

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restTraderMockMvc
            .perform(
                put(ENTITY_API_URL_ID, longCount.incrementAndGet())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(om.writeValueAsBytes(traderDTO))
            )
            .andExpect(status().isBadRequest());

        // Validate the Trader in the database
        assertSameRepositoryCount(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void putWithMissingIdPathParamTrader() throws Exception {
        long databaseSizeBeforeUpdate = getRepositoryCount();
        trader.setId(longCount.incrementAndGet());

        // Create the Trader
        TraderDTO traderDTO = traderMapper.toDto(trader);

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restTraderMockMvc
            .perform(put(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsBytes(traderDTO)))
            .andExpect(status().isMethodNotAllowed());

        // Validate the Trader in the database
        assertSameRepositoryCount(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void partialUpdateTraderWithPatch() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        long databaseSizeBeforeUpdate = getRepositoryCount();

        // Update the trader using partial update
        Trader partialUpdatedTrader = new Trader();
        partialUpdatedTrader.setId(trader.getId());

        partialUpdatedTrader
            .businessName(UPDATED_BUSINESS_NAME)
            .address(UPDATED_ADDRESS)
            .category(UPDATED_CATEGORY)
            .businessMode(UPDATED_BUSINESS_MODE)
            .billPrefix(UPDATED_BILL_PREFIX);

        restTraderMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, partialUpdatedTrader.getId())
                    .contentType("application/merge-patch+json")
                    .content(om.writeValueAsBytes(partialUpdatedTrader))
            )
            .andExpect(status().isOk());

        // Validate the Trader in the database

        assertSameRepositoryCount(databaseSizeBeforeUpdate);
        assertTraderUpdatableFieldsEquals(createUpdateProxyForBean(partialUpdatedTrader, trader), getPersistedTrader(trader));
    }

    @Test
    @Transactional
    void fullUpdateTraderWithPatch() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        long databaseSizeBeforeUpdate = getRepositoryCount();

        // Update the trader using partial update
        Trader partialUpdatedTrader = new Trader();
        partialUpdatedTrader.setId(trader.getId());

        partialUpdatedTrader
            .businessName(UPDATED_BUSINESS_NAME)
            .ownerName(UPDATED_OWNER_NAME)
            .address(UPDATED_ADDRESS)
            .category(UPDATED_CATEGORY)
            .approvalStatus(UPDATED_APPROVAL_STATUS)
            .businessMode(UPDATED_BUSINESS_MODE)
            .billPrefix(UPDATED_BILL_PREFIX)
            .createdAt(UPDATED_CREATED_AT)
            .updatedAt(UPDATED_UPDATED_AT);

        restTraderMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, partialUpdatedTrader.getId())
                    .contentType("application/merge-patch+json")
                    .content(om.writeValueAsBytes(partialUpdatedTrader))
            )
            .andExpect(status().isOk());

        // Validate the Trader in the database

        assertSameRepositoryCount(databaseSizeBeforeUpdate);
        assertTraderUpdatableFieldsEquals(partialUpdatedTrader, getPersistedTrader(partialUpdatedTrader));
    }

    @Test
    @Transactional
    void patchNonExistingTrader() throws Exception {
        long databaseSizeBeforeUpdate = getRepositoryCount();
        trader.setId(longCount.incrementAndGet());

        // Create the Trader
        TraderDTO traderDTO = traderMapper.toDto(trader);

        // If the entity doesn't have an ID, it will throw BadRequestAlertException
        restTraderMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, traderDTO.getId())
                    .contentType("application/merge-patch+json")
                    .content(om.writeValueAsBytes(traderDTO))
            )
            .andExpect(status().isBadRequest());

        // Validate the Trader in the database
        assertSameRepositoryCount(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void patchWithIdMismatchTrader() throws Exception {
        long databaseSizeBeforeUpdate = getRepositoryCount();
        trader.setId(longCount.incrementAndGet());

        // Create the Trader
        TraderDTO traderDTO = traderMapper.toDto(trader);

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restTraderMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, longCount.incrementAndGet())
                    .contentType("application/merge-patch+json")
                    .content(om.writeValueAsBytes(traderDTO))
            )
            .andExpect(status().isBadRequest());

        // Validate the Trader in the database
        assertSameRepositoryCount(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void patchWithMissingIdPathParamTrader() throws Exception {
        long databaseSizeBeforeUpdate = getRepositoryCount();
        trader.setId(longCount.incrementAndGet());

        // Create the Trader
        TraderDTO traderDTO = traderMapper.toDto(trader);

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restTraderMockMvc
            .perform(patch(ENTITY_API_URL).contentType("application/merge-patch+json").content(om.writeValueAsBytes(traderDTO)))
            .andExpect(status().isMethodNotAllowed());

        // Validate the Trader in the database
        assertSameRepositoryCount(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void deleteTrader() throws Exception {
        // Initialize the database
        insertedTrader = traderRepository.saveAndFlush(trader);

        long databaseSizeBeforeDelete = getRepositoryCount();

        // Delete the trader
        restTraderMockMvc
            .perform(delete(ENTITY_API_URL_ID, trader.getId()).accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isNoContent());

        // Validate the database contains one less item
        assertDecrementedRepositoryCount(databaseSizeBeforeDelete);
    }

    protected long getRepositoryCount() {
        return traderRepository.count();
    }

    protected void assertIncrementedRepositoryCount(long countBefore) {
        assertThat(countBefore + 1).isEqualTo(getRepositoryCount());
    }

    protected void assertDecrementedRepositoryCount(long countBefore) {
        assertThat(countBefore - 1).isEqualTo(getRepositoryCount());
    }

    protected void assertSameRepositoryCount(long countBefore) {
        assertThat(countBefore).isEqualTo(getRepositoryCount());
    }

    protected Trader getPersistedTrader(Trader trader) {
        return traderRepository.findById(trader.getId()).orElseThrow();
    }

    protected void assertPersistedTraderToMatchAllProperties(Trader expectedTrader) {
        assertTraderAllPropertiesEquals(expectedTrader, getPersistedTrader(expectedTrader));
    }

    protected void assertPersistedTraderToMatchUpdatableProperties(Trader expectedTrader) {
        assertTraderAllUpdatablePropertiesEquals(expectedTrader, getPersistedTrader(expectedTrader));
    }
}
