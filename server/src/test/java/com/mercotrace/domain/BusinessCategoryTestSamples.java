package com.mercotrace.domain;

import java.util.Random;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

public class BusinessCategoryTestSamples {

    private static final Random random = new Random();
    private static final AtomicLong longCount = new AtomicLong(random.nextInt() + (2 * Integer.MAX_VALUE));

    public static BusinessCategory getBusinessCategorySample1() {
        return new BusinessCategory().id(1L).categoryName("categoryName1");
    }

    public static BusinessCategory getBusinessCategorySample2() {
        return new BusinessCategory().id(2L).categoryName("categoryName2");
    }

    public static BusinessCategory getBusinessCategoryRandomSampleGenerator() {
        return new BusinessCategory().id(longCount.incrementAndGet()).categoryName(UUID.randomUUID().toString());
    }
}
