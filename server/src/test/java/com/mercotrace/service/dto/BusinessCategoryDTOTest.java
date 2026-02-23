package com.mercotrace.service.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.mercotrace.web.rest.TestUtil;
import org.junit.jupiter.api.Test;

class BusinessCategoryDTOTest {

    @Test
    void dtoEqualsVerifier() throws Exception {
        TestUtil.equalsVerifier(BusinessCategoryDTO.class);
        BusinessCategoryDTO businessCategoryDTO1 = new BusinessCategoryDTO();
        businessCategoryDTO1.setId(1L);
        BusinessCategoryDTO businessCategoryDTO2 = new BusinessCategoryDTO();
        assertThat(businessCategoryDTO1).isNotEqualTo(businessCategoryDTO2);
        businessCategoryDTO2.setId(businessCategoryDTO1.getId());
        assertThat(businessCategoryDTO1).isEqualTo(businessCategoryDTO2);
        businessCategoryDTO2.setId(2L);
        assertThat(businessCategoryDTO1).isNotEqualTo(businessCategoryDTO2);
        businessCategoryDTO1.setId(null);
        assertThat(businessCategoryDTO1).isNotEqualTo(businessCategoryDTO2);
    }
}
