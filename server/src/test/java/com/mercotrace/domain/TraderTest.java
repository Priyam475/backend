package com.mercotrace.domain;

import static com.mercotrace.domain.TraderTestSamples.*;
import static org.assertj.core.api.Assertions.assertThat;

import com.mercotrace.web.rest.TestUtil;
import org.junit.jupiter.api.Test;

class TraderTest {

    @Test
    void equalsVerifier() throws Exception {
        TestUtil.equalsVerifier(Trader.class);
        Trader trader1 = getTraderSample1();
        Trader trader2 = new Trader();
        assertThat(trader1).isNotEqualTo(trader2);

        trader2.setId(trader1.getId());
        assertThat(trader1).isEqualTo(trader2);

        trader2 = getTraderSample2();
        assertThat(trader1).isNotEqualTo(trader2);
    }
}
