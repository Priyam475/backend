package com.mercotrace.service.criteria;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Objects;
import java.util.function.BiFunction;
import java.util.function.Function;
import org.assertj.core.api.Condition;
import org.junit.jupiter.api.Test;

class BusinessCategoryCriteriaTest {

    @Test
    void newBusinessCategoryCriteriaHasAllFiltersNullTest() {
        var businessCategoryCriteria = new BusinessCategoryCriteria();
        assertThat(businessCategoryCriteria).is(criteriaFiltersAre(Objects::isNull));
    }

    @Test
    void businessCategoryCriteriaFluentMethodsCreatesFiltersTest() {
        var businessCategoryCriteria = new BusinessCategoryCriteria();

        setAllFilters(businessCategoryCriteria);

        assertThat(businessCategoryCriteria).is(criteriaFiltersAre(Objects::nonNull));
    }

    @Test
    void businessCategoryCriteriaCopyCreatesNullFilterTest() {
        var businessCategoryCriteria = new BusinessCategoryCriteria();
        var copy = businessCategoryCriteria.copy();

        assertThat(businessCategoryCriteria).satisfies(
            criteria ->
                assertThat(criteria).is(
                    copyFiltersAre(copy, (a, b) -> (a == null || a instanceof Boolean) ? a == b : (a != b && a.equals(b)))
                ),
            criteria -> assertThat(criteria).isEqualTo(copy),
            criteria -> assertThat(criteria).hasSameHashCodeAs(copy)
        );

        assertThat(copy).satisfies(
            criteria -> assertThat(criteria).is(criteriaFiltersAre(Objects::isNull)),
            criteria -> assertThat(criteria).isEqualTo(businessCategoryCriteria)
        );
    }

    @Test
    void businessCategoryCriteriaCopyDuplicatesEveryExistingFilterTest() {
        var businessCategoryCriteria = new BusinessCategoryCriteria();
        setAllFilters(businessCategoryCriteria);

        var copy = businessCategoryCriteria.copy();

        assertThat(businessCategoryCriteria).satisfies(
            criteria ->
                assertThat(criteria).is(
                    copyFiltersAre(copy, (a, b) -> (a == null || a instanceof Boolean) ? a == b : (a != b && a.equals(b)))
                ),
            criteria -> assertThat(criteria).isEqualTo(copy),
            criteria -> assertThat(criteria).hasSameHashCodeAs(copy)
        );

        assertThat(copy).satisfies(
            criteria -> assertThat(criteria).is(criteriaFiltersAre(Objects::nonNull)),
            criteria -> assertThat(criteria).isEqualTo(businessCategoryCriteria)
        );
    }

    @Test
    void toStringVerifier() {
        var businessCategoryCriteria = new BusinessCategoryCriteria();

        assertThat(businessCategoryCriteria).hasToString("BusinessCategoryCriteria{}");
    }

    private static void setAllFilters(BusinessCategoryCriteria businessCategoryCriteria) {
        businessCategoryCriteria.id();
        businessCategoryCriteria.categoryName();
        businessCategoryCriteria.isActive();
        businessCategoryCriteria.createdAt();
        businessCategoryCriteria.updatedAt();
        businessCategoryCriteria.distinct();
    }

    private static Condition<BusinessCategoryCriteria> criteriaFiltersAre(Function<Object, Boolean> condition) {
        return new Condition<>(
            criteria ->
                condition.apply(criteria.getId()) &&
                condition.apply(criteria.getCategoryName()) &&
                condition.apply(criteria.getIsActive()) &&
                condition.apply(criteria.getCreatedAt()) &&
                condition.apply(criteria.getUpdatedAt()) &&
                condition.apply(criteria.getDistinct()),
            "every filter matches"
        );
    }

    private static Condition<BusinessCategoryCriteria> copyFiltersAre(
        BusinessCategoryCriteria copy,
        BiFunction<Object, Object, Boolean> condition
    ) {
        return new Condition<>(
            criteria ->
                condition.apply(criteria.getId(), copy.getId()) &&
                condition.apply(criteria.getCategoryName(), copy.getCategoryName()) &&
                condition.apply(criteria.getIsActive(), copy.getIsActive()) &&
                condition.apply(criteria.getCreatedAt(), copy.getCreatedAt()) &&
                condition.apply(criteria.getUpdatedAt(), copy.getUpdatedAt()) &&
                condition.apply(criteria.getDistinct(), copy.getDistinct()),
            "every filter matches"
        );
    }
}
