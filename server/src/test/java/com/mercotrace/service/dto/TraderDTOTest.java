package com.mercotrace.service.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.mercotrace.web.rest.TestUtil;
import org.junit.jupiter.api.Test;

class TraderDTOTest {

    @Test
    void dtoEqualsVerifier() throws Exception {
        TestUtil.equalsVerifier(TraderDTO.class);
        TraderDTO traderDTO1 = new TraderDTO();
        traderDTO1.setId(1L);
        TraderDTO traderDTO2 = new TraderDTO();
        assertThat(traderDTO1).isNotEqualTo(traderDTO2);
        traderDTO2.setId(traderDTO1.getId());
        assertThat(traderDTO1).isEqualTo(traderDTO2);
        traderDTO2.setId(2L);
        assertThat(traderDTO1).isNotEqualTo(traderDTO2);
        traderDTO1.setId(null);
        assertThat(traderDTO1).isNotEqualTo(traderDTO2);
    }
}
