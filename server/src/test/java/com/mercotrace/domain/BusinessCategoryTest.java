package com.mercotrace.domain;

import static com.mercotrace.domain.BusinessCategoryTestSamples.*;
import static org.assertj.core.api.Assertions.assertThat;

import com.mercotrace.web.rest.TestUtil;
import org.junit.jupiter.api.Test;

class BusinessCategoryTest {

    @Test
    void equalsVerifier() throws Exception {
        TestUtil.equalsVerifier(BusinessCategory.class);
        BusinessCategory businessCategory1 = getBusinessCategorySample1();
        BusinessCategory businessCategory2 = new BusinessCategory();
        assertThat(businessCategory1).isNotEqualTo(businessCategory2);

        businessCategory2.setId(businessCategory1.getId());
        assertThat(businessCategory1).isEqualTo(businessCategory2);

        businessCategory2 = getBusinessCategorySample2();
        assertThat(businessCategory1).isNotEqualTo(businessCategory2);
    }
}
