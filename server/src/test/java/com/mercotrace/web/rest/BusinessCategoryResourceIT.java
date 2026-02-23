package com.mercotrace.web.rest;

import static com.mercotrace.domain.BusinessCategoryAsserts.*;
import static com.mercotrace.web.rest.TestUtil.createUpdateProxyForBean;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mercotrace.IntegrationTest;
import com.mercotrace.domain.BusinessCategory;
import com.mercotrace.repository.BusinessCategoryRepository;
import com.mercotrace.service.dto.BusinessCategoryDTO;
import com.mercotrace.service.mapper.BusinessCategoryMapper;
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
 * Integration tests for the {@link BusinessCategoryResource} REST controller.
 */
@IntegrationTest
@AutoConfigureMockMvc
@WithMockUser
class BusinessCategoryResourceIT {

    private static final String DEFAULT_CATEGORY_NAME = "AAAAAAAAAA";
    private static final String UPDATED_CATEGORY_NAME = "BBBBBBBBBB";

    private static final Boolean DEFAULT_IS_ACTIVE = false;
    private static final Boolean UPDATED_IS_ACTIVE = true;

    private static final Instant DEFAULT_CREATED_AT = Instant.ofEpochMilli(0L);
    private static final Instant UPDATED_CREATED_AT = Instant.now().truncatedTo(ChronoUnit.MILLIS);

    private static final Instant DEFAULT_UPDATED_AT = Instant.ofEpochMilli(0L);
    private static final Instant UPDATED_UPDATED_AT = Instant.now().truncatedTo(ChronoUnit.MILLIS);

    private static final String ENTITY_API_URL = "/api/business-categories";
    private static final String ENTITY_API_URL_ID = ENTITY_API_URL + "/{id}";

    private static Random random = new Random();
    private static AtomicLong longCount = new AtomicLong(random.nextInt() + (2 * Integer.MAX_VALUE));

    @Autowired
    private ObjectMapper om;

    @Autowired
    private BusinessCategoryRepository businessCategoryRepository;

    @Autowired
    private BusinessCategoryMapper businessCategoryMapper;

    @Autowired
    private EntityManager em;

    @Autowired
    private MockMvc restBusinessCategoryMockMvc;

    private BusinessCategory businessCategory;

    private BusinessCategory insertedBusinessCategory;

    /**
     * Create an entity for this test.
     *
     * This is a static method, as tests for other entities might also need it,
     * if they test an entity which requires the current entity.
     */
    public static BusinessCategory createEntity() {
        return new BusinessCategory()
            .categoryName(DEFAULT_CATEGORY_NAME)
            .isActive(DEFAULT_IS_ACTIVE)
            .createdAt(DEFAULT_CREATED_AT)
            .updatedAt(DEFAULT_UPDATED_AT);
    }

    /**
     * Create an updated entity for this test.
     *
     * This is a static method, as tests for other entities might also need it,
     * if they test an entity which requires the current entity.
     */
    public static BusinessCategory createUpdatedEntity() {
        return new BusinessCategory()
            .categoryName(UPDATED_CATEGORY_NAME)
            .isActive(UPDATED_IS_ACTIVE)
            .createdAt(UPDATED_CREATED_AT)
            .updatedAt(UPDATED_UPDATED_AT);
    }

    @BeforeEach
    void initTest() {
        businessCategory = createEntity();
    }

    @AfterEach
    void cleanup() {
        if (insertedBusinessCategory != null) {
            businessCategoryRepository.delete(insertedBusinessCategory);
            insertedBusinessCategory = null;
        }
    }

    @Test
    @Transactional
    void createBusinessCategory() throws Exception {
        long databaseSizeBeforeCreate = getRepositoryCount();
        // Create the BusinessCategory
        BusinessCategoryDTO businessCategoryDTO = businessCategoryMapper.toDto(businessCategory);
        var returnedBusinessCategoryDTO = om.readValue(
            restBusinessCategoryMockMvc
                .perform(post(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsBytes(businessCategoryDTO)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(),
            BusinessCategoryDTO.class
        );

        // Validate the BusinessCategory in the database
        assertIncrementedRepositoryCount(databaseSizeBeforeCreate);
        var returnedBusinessCategory = businessCategoryMapper.toEntity(returnedBusinessCategoryDTO);
        assertBusinessCategoryUpdatableFieldsEquals(returnedBusinessCategory, getPersistedBusinessCategory(returnedBusinessCategory));

        insertedBusinessCategory = returnedBusinessCategory;
    }

    @Test
    @Transactional
    void createBusinessCategoryWithExistingId() throws Exception {
        // Create the BusinessCategory with an existing ID
        businessCategory.setId(1L);
        BusinessCategoryDTO businessCategoryDTO = businessCategoryMapper.toDto(businessCategory);

        long databaseSizeBeforeCreate = getRepositoryCount();

        // An entity with an existing ID cannot be created, so this API call must fail
        restBusinessCategoryMockMvc
            .perform(post(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsBytes(businessCategoryDTO)))
            .andExpect(status().isBadRequest());

        // Validate the BusinessCategory in the database
        assertSameRepositoryCount(databaseSizeBeforeCreate);
    }

    @Test
    @Transactional
    void checkCategoryNameIsRequired() throws Exception {
        long databaseSizeBeforeTest = getRepositoryCount();
        // set the field null
        businessCategory.setCategoryName(null);

        // Create the BusinessCategory, which fails.
        BusinessCategoryDTO businessCategoryDTO = businessCategoryMapper.toDto(businessCategory);

        restBusinessCategoryMockMvc
            .perform(post(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsBytes(businessCategoryDTO)))
            .andExpect(status().isBadRequest());

        assertSameRepositoryCount(databaseSizeBeforeTest);
    }

    @Test
    @Transactional
    void getAllBusinessCategories() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        // Get all the businessCategoryList
        restBusinessCategoryMockMvc
            .perform(get(ENTITY_API_URL + "?sort=id,desc"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$.[*].id").value(hasItem(businessCategory.getId().intValue())))
            .andExpect(jsonPath("$.[*].categoryName").value(hasItem(DEFAULT_CATEGORY_NAME)))
            .andExpect(jsonPath("$.[*].isActive").value(hasItem(DEFAULT_IS_ACTIVE)))
            .andExpect(jsonPath("$.[*].createdAt").value(hasItem(DEFAULT_CREATED_AT.toString())))
            .andExpect(jsonPath("$.[*].updatedAt").value(hasItem(DEFAULT_UPDATED_AT.toString())));
    }

    @Test
    @Transactional
    void getBusinessCategory() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        // Get the businessCategory
        restBusinessCategoryMockMvc
            .perform(get(ENTITY_API_URL_ID, businessCategory.getId()))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$.id").value(businessCategory.getId().intValue()))
            .andExpect(jsonPath("$.categoryName").value(DEFAULT_CATEGORY_NAME))
            .andExpect(jsonPath("$.isActive").value(DEFAULT_IS_ACTIVE))
            .andExpect(jsonPath("$.createdAt").value(DEFAULT_CREATED_AT.toString()))
            .andExpect(jsonPath("$.updatedAt").value(DEFAULT_UPDATED_AT.toString()));
    }

    @Test
    @Transactional
    void getBusinessCategoriesByIdFiltering() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        Long id = businessCategory.getId();

        defaultBusinessCategoryFiltering("id.equals=" + id, "id.notEquals=" + id);

        defaultBusinessCategoryFiltering("id.greaterThanOrEqual=" + id, "id.greaterThan=" + id);

        defaultBusinessCategoryFiltering("id.lessThanOrEqual=" + id, "id.lessThan=" + id);
    }

    @Test
    @Transactional
    void getAllBusinessCategoriesByCategoryNameIsEqualToSomething() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        // Get all the businessCategoryList where categoryName equals to
        defaultBusinessCategoryFiltering("categoryName.equals=" + DEFAULT_CATEGORY_NAME, "categoryName.equals=" + UPDATED_CATEGORY_NAME);
    }

    @Test
    @Transactional
    void getAllBusinessCategoriesByCategoryNameIsInShouldWork() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        // Get all the businessCategoryList where categoryName in
        defaultBusinessCategoryFiltering(
            "categoryName.in=" + DEFAULT_CATEGORY_NAME + "," + UPDATED_CATEGORY_NAME,
            "categoryName.in=" + UPDATED_CATEGORY_NAME
        );
    }

    @Test
    @Transactional
    void getAllBusinessCategoriesByCategoryNameIsNullOrNotNull() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        // Get all the businessCategoryList where categoryName is not null
        defaultBusinessCategoryFiltering("categoryName.specified=true", "categoryName.specified=false");
    }

    @Test
    @Transactional
    void getAllBusinessCategoriesByCategoryNameContainsSomething() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        // Get all the businessCategoryList where categoryName contains
        defaultBusinessCategoryFiltering(
            "categoryName.contains=" + DEFAULT_CATEGORY_NAME,
            "categoryName.contains=" + UPDATED_CATEGORY_NAME
        );
    }

    @Test
    @Transactional
    void getAllBusinessCategoriesByCategoryNameNotContainsSomething() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        // Get all the businessCategoryList where categoryName does not contain
        defaultBusinessCategoryFiltering(
            "categoryName.doesNotContain=" + UPDATED_CATEGORY_NAME,
            "categoryName.doesNotContain=" + DEFAULT_CATEGORY_NAME
        );
    }

    @Test
    @Transactional
    void getAllBusinessCategoriesByIsActiveIsEqualToSomething() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        // Get all the businessCategoryList where isActive equals to
        defaultBusinessCategoryFiltering("isActive.equals=" + DEFAULT_IS_ACTIVE, "isActive.equals=" + UPDATED_IS_ACTIVE);
    }

    @Test
    @Transactional
    void getAllBusinessCategoriesByIsActiveIsInShouldWork() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        // Get all the businessCategoryList where isActive in
        defaultBusinessCategoryFiltering("isActive.in=" + DEFAULT_IS_ACTIVE + "," + UPDATED_IS_ACTIVE, "isActive.in=" + UPDATED_IS_ACTIVE);
    }

    @Test
    @Transactional
    void getAllBusinessCategoriesByIsActiveIsNullOrNotNull() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        // Get all the businessCategoryList where isActive is not null
        defaultBusinessCategoryFiltering("isActive.specified=true", "isActive.specified=false");
    }

    @Test
    @Transactional
    void getAllBusinessCategoriesByCreatedAtIsEqualToSomething() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        // Get all the businessCategoryList where createdAt equals to
        defaultBusinessCategoryFiltering("createdAt.equals=" + DEFAULT_CREATED_AT, "createdAt.equals=" + UPDATED_CREATED_AT);
    }

    @Test
    @Transactional
    void getAllBusinessCategoriesByCreatedAtIsInShouldWork() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        // Get all the businessCategoryList where createdAt in
        defaultBusinessCategoryFiltering(
            "createdAt.in=" + DEFAULT_CREATED_AT + "," + UPDATED_CREATED_AT,
            "createdAt.in=" + UPDATED_CREATED_AT
        );
    }

    @Test
    @Transactional
    void getAllBusinessCategoriesByCreatedAtIsNullOrNotNull() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        // Get all the businessCategoryList where createdAt is not null
        defaultBusinessCategoryFiltering("createdAt.specified=true", "createdAt.specified=false");
    }

    @Test
    @Transactional
    void getAllBusinessCategoriesByUpdatedAtIsEqualToSomething() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        // Get all the businessCategoryList where updatedAt equals to
        defaultBusinessCategoryFiltering("updatedAt.equals=" + DEFAULT_UPDATED_AT, "updatedAt.equals=" + UPDATED_UPDATED_AT);
    }

    @Test
    @Transactional
    void getAllBusinessCategoriesByUpdatedAtIsInShouldWork() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        // Get all the businessCategoryList where updatedAt in
        defaultBusinessCategoryFiltering(
            "updatedAt.in=" + DEFAULT_UPDATED_AT + "," + UPDATED_UPDATED_AT,
            "updatedAt.in=" + UPDATED_UPDATED_AT
        );
    }

    @Test
    @Transactional
    void getAllBusinessCategoriesByUpdatedAtIsNullOrNotNull() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        // Get all the businessCategoryList where updatedAt is not null
        defaultBusinessCategoryFiltering("updatedAt.specified=true", "updatedAt.specified=false");
    }

    private void defaultBusinessCategoryFiltering(String shouldBeFound, String shouldNotBeFound) throws Exception {
        defaultBusinessCategoryShouldBeFound(shouldBeFound);
        defaultBusinessCategoryShouldNotBeFound(shouldNotBeFound);
    }

    /**
     * Executes the search, and checks that the default entity is returned.
     */
    private void defaultBusinessCategoryShouldBeFound(String filter) throws Exception {
        restBusinessCategoryMockMvc
            .perform(get(ENTITY_API_URL + "?sort=id,desc&" + filter))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$.[*].id").value(hasItem(businessCategory.getId().intValue())))
            .andExpect(jsonPath("$.[*].categoryName").value(hasItem(DEFAULT_CATEGORY_NAME)))
            .andExpect(jsonPath("$.[*].isActive").value(hasItem(DEFAULT_IS_ACTIVE)))
            .andExpect(jsonPath("$.[*].createdAt").value(hasItem(DEFAULT_CREATED_AT.toString())))
            .andExpect(jsonPath("$.[*].updatedAt").value(hasItem(DEFAULT_UPDATED_AT.toString())));

        // Check, that the count call also returns 1
        restBusinessCategoryMockMvc
            .perform(get(ENTITY_API_URL + "/count?sort=id,desc&" + filter))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(content().string("1"));
    }

    /**
     * Executes the search, and checks that the default entity is not returned.
     */
    private void defaultBusinessCategoryShouldNotBeFound(String filter) throws Exception {
        restBusinessCategoryMockMvc
            .perform(get(ENTITY_API_URL + "?sort=id,desc&" + filter))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$").isEmpty());

        // Check, that the count call also returns 0
        restBusinessCategoryMockMvc
            .perform(get(ENTITY_API_URL + "/count?sort=id,desc&" + filter))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(content().string("0"));
    }

    @Test
    @Transactional
    void getNonExistingBusinessCategory() throws Exception {
        // Get the businessCategory
        restBusinessCategoryMockMvc.perform(get(ENTITY_API_URL_ID, Long.MAX_VALUE)).andExpect(status().isNotFound());
    }

    @Test
    @Transactional
    void putExistingBusinessCategory() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        long databaseSizeBeforeUpdate = getRepositoryCount();

        // Update the businessCategory
        BusinessCategory updatedBusinessCategory = businessCategoryRepository.findById(businessCategory.getId()).orElseThrow();
        // Disconnect from session so that the updates on updatedBusinessCategory are not directly saved in db
        em.detach(updatedBusinessCategory);
        updatedBusinessCategory
            .categoryName(UPDATED_CATEGORY_NAME)
            .isActive(UPDATED_IS_ACTIVE)
            .createdAt(UPDATED_CREATED_AT)
            .updatedAt(UPDATED_UPDATED_AT);
        BusinessCategoryDTO businessCategoryDTO = businessCategoryMapper.toDto(updatedBusinessCategory);

        restBusinessCategoryMockMvc
            .perform(
                put(ENTITY_API_URL_ID, businessCategoryDTO.getId())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(om.writeValueAsBytes(businessCategoryDTO))
            )
            .andExpect(status().isOk());

        // Validate the BusinessCategory in the database
        assertSameRepositoryCount(databaseSizeBeforeUpdate);
        assertPersistedBusinessCategoryToMatchAllProperties(updatedBusinessCategory);
    }

    @Test
    @Transactional
    void putNonExistingBusinessCategory() throws Exception {
        long databaseSizeBeforeUpdate = getRepositoryCount();
        businessCategory.setId(longCount.incrementAndGet());

        // Create the BusinessCategory
        BusinessCategoryDTO businessCategoryDTO = businessCategoryMapper.toDto(businessCategory);

        // If the entity doesn't have an ID, it will throw BadRequestAlertException
        restBusinessCategoryMockMvc
            .perform(
                put(ENTITY_API_URL_ID, businessCategoryDTO.getId())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(om.writeValueAsBytes(businessCategoryDTO))
            )
            .andExpect(status().isBadRequest());

        // Validate the BusinessCategory in the database
        assertSameRepositoryCount(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void putWithIdMismatchBusinessCategory() throws Exception {
        long databaseSizeBeforeUpdate = getRepositoryCount();
        businessCategory.setId(longCount.incrementAndGet());

        // Create the BusinessCategory
        BusinessCategoryDTO businessCategoryDTO = businessCategoryMapper.toDto(businessCategory);

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restBusinessCategoryMockMvc
            .perform(
                put(ENTITY_API_URL_ID, longCount.incrementAndGet())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(om.writeValueAsBytes(businessCategoryDTO))
            )
            .andExpect(status().isBadRequest());

        // Validate the BusinessCategory in the database
        assertSameRepositoryCount(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void putWithMissingIdPathParamBusinessCategory() throws Exception {
        long databaseSizeBeforeUpdate = getRepositoryCount();
        businessCategory.setId(longCount.incrementAndGet());

        // Create the BusinessCategory
        BusinessCategoryDTO businessCategoryDTO = businessCategoryMapper.toDto(businessCategory);

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restBusinessCategoryMockMvc
            .perform(put(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsBytes(businessCategoryDTO)))
            .andExpect(status().isMethodNotAllowed());

        // Validate the BusinessCategory in the database
        assertSameRepositoryCount(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void partialUpdateBusinessCategoryWithPatch() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        long databaseSizeBeforeUpdate = getRepositoryCount();

        // Update the businessCategory using partial update
        BusinessCategory partialUpdatedBusinessCategory = new BusinessCategory();
        partialUpdatedBusinessCategory.setId(businessCategory.getId());

        partialUpdatedBusinessCategory.isActive(UPDATED_IS_ACTIVE).createdAt(UPDATED_CREATED_AT).updatedAt(UPDATED_UPDATED_AT);

        restBusinessCategoryMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, partialUpdatedBusinessCategory.getId())
                    .contentType("application/merge-patch+json")
                    .content(om.writeValueAsBytes(partialUpdatedBusinessCategory))
            )
            .andExpect(status().isOk());

        // Validate the BusinessCategory in the database

        assertSameRepositoryCount(databaseSizeBeforeUpdate);
        assertBusinessCategoryUpdatableFieldsEquals(
            createUpdateProxyForBean(partialUpdatedBusinessCategory, businessCategory),
            getPersistedBusinessCategory(businessCategory)
        );
    }

    @Test
    @Transactional
    void fullUpdateBusinessCategoryWithPatch() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        long databaseSizeBeforeUpdate = getRepositoryCount();

        // Update the businessCategory using partial update
        BusinessCategory partialUpdatedBusinessCategory = new BusinessCategory();
        partialUpdatedBusinessCategory.setId(businessCategory.getId());

        partialUpdatedBusinessCategory
            .categoryName(UPDATED_CATEGORY_NAME)
            .isActive(UPDATED_IS_ACTIVE)
            .createdAt(UPDATED_CREATED_AT)
            .updatedAt(UPDATED_UPDATED_AT);

        restBusinessCategoryMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, partialUpdatedBusinessCategory.getId())
                    .contentType("application/merge-patch+json")
                    .content(om.writeValueAsBytes(partialUpdatedBusinessCategory))
            )
            .andExpect(status().isOk());

        // Validate the BusinessCategory in the database

        assertSameRepositoryCount(databaseSizeBeforeUpdate);
        assertBusinessCategoryUpdatableFieldsEquals(
            partialUpdatedBusinessCategory,
            getPersistedBusinessCategory(partialUpdatedBusinessCategory)
        );
    }

    @Test
    @Transactional
    void patchNonExistingBusinessCategory() throws Exception {
        long databaseSizeBeforeUpdate = getRepositoryCount();
        businessCategory.setId(longCount.incrementAndGet());

        // Create the BusinessCategory
        BusinessCategoryDTO businessCategoryDTO = businessCategoryMapper.toDto(businessCategory);

        // If the entity doesn't have an ID, it will throw BadRequestAlertException
        restBusinessCategoryMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, businessCategoryDTO.getId())
                    .contentType("application/merge-patch+json")
                    .content(om.writeValueAsBytes(businessCategoryDTO))
            )
            .andExpect(status().isBadRequest());

        // Validate the BusinessCategory in the database
        assertSameRepositoryCount(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void patchWithIdMismatchBusinessCategory() throws Exception {
        long databaseSizeBeforeUpdate = getRepositoryCount();
        businessCategory.setId(longCount.incrementAndGet());

        // Create the BusinessCategory
        BusinessCategoryDTO businessCategoryDTO = businessCategoryMapper.toDto(businessCategory);

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restBusinessCategoryMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, longCount.incrementAndGet())
                    .contentType("application/merge-patch+json")
                    .content(om.writeValueAsBytes(businessCategoryDTO))
            )
            .andExpect(status().isBadRequest());

        // Validate the BusinessCategory in the database
        assertSameRepositoryCount(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void patchWithMissingIdPathParamBusinessCategory() throws Exception {
        long databaseSizeBeforeUpdate = getRepositoryCount();
        businessCategory.setId(longCount.incrementAndGet());

        // Create the BusinessCategory
        BusinessCategoryDTO businessCategoryDTO = businessCategoryMapper.toDto(businessCategory);

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restBusinessCategoryMockMvc
            .perform(patch(ENTITY_API_URL).contentType("application/merge-patch+json").content(om.writeValueAsBytes(businessCategoryDTO)))
            .andExpect(status().isMethodNotAllowed());

        // Validate the BusinessCategory in the database
        assertSameRepositoryCount(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void deleteBusinessCategory() throws Exception {
        // Initialize the database
        insertedBusinessCategory = businessCategoryRepository.saveAndFlush(businessCategory);

        long databaseSizeBeforeDelete = getRepositoryCount();

        // Delete the businessCategory
        restBusinessCategoryMockMvc
            .perform(delete(ENTITY_API_URL_ID, businessCategory.getId()).accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isNoContent());

        // Validate the database contains one less item
        assertDecrementedRepositoryCount(databaseSizeBeforeDelete);
    }

    protected long getRepositoryCount() {
        return businessCategoryRepository.count();
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

    protected BusinessCategory getPersistedBusinessCategory(BusinessCategory businessCategory) {
        return businessCategoryRepository.findById(businessCategory.getId()).orElseThrow();
    }

    protected void assertPersistedBusinessCategoryToMatchAllProperties(BusinessCategory expectedBusinessCategory) {
        assertBusinessCategoryAllPropertiesEquals(expectedBusinessCategory, getPersistedBusinessCategory(expectedBusinessCategory));
    }

    protected void assertPersistedBusinessCategoryToMatchUpdatableProperties(BusinessCategory expectedBusinessCategory) {
        assertBusinessCategoryAllUpdatablePropertiesEquals(
            expectedBusinessCategory,
            getPersistedBusinessCategory(expectedBusinessCategory)
        );
    }
}
