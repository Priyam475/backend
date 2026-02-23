package com.mercotrace.domain;

import java.util.Random;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

public class TraderTestSamples {

    private static final Random random = new Random();
    private static final AtomicLong longCount = new AtomicLong(random.nextInt() + (2 * Integer.MAX_VALUE));

    public static Trader getTraderSample1() {
        return new Trader().id(1L).businessName("businessName1").ownerName("ownerName1").category("category1").billPrefix("billPrefix1");
    }

    public static Trader getTraderSample2() {
        return new Trader().id(2L).businessName("businessName2").ownerName("ownerName2").category("category2").billPrefix("billPrefix2");
    }

    public static Trader getTraderRandomSampleGenerator() {
        return new Trader()
            .id(longCount.incrementAndGet())
            .businessName(UUID.randomUUID().toString())
            .ownerName(UUID.randomUUID().toString())
            .category(UUID.randomUUID().toString())
            .billPrefix(UUID.randomUUID().toString());
    }
}
