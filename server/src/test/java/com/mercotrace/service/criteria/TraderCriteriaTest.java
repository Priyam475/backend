package com.mercotrace.service.criteria;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Objects;
import java.util.function.BiFunction;
import java.util.function.Function;
import org.assertj.core.api.Condition;
import org.junit.jupiter.api.Test;

class TraderCriteriaTest {

    @Test
    void newTraderCriteriaHasAllFiltersNullTest() {
        var traderCriteria = new TraderCriteria();
        assertThat(traderCriteria).is(criteriaFiltersAre(Objects::isNull));
    }

    @Test
    void traderCriteriaFluentMethodsCreatesFiltersTest() {
        var traderCriteria = new TraderCriteria();

        setAllFilters(traderCriteria);

        assertThat(traderCriteria).is(criteriaFiltersAre(Objects::nonNull));
    }

    @Test
    void traderCriteriaCopyCreatesNullFilterTest() {
        var traderCriteria = new TraderCriteria();
        var copy = traderCriteria.copy();

        assertThat(traderCriteria).satisfies(
            criteria ->
                assertThat(criteria).is(
                    copyFiltersAre(copy, (a, b) -> (a == null || a instanceof Boolean) ? a == b : (a != b && a.equals(b)))
                ),
            criteria -> assertThat(criteria).isEqualTo(copy),
            criteria -> assertThat(criteria).hasSameHashCodeAs(copy)
        );

        assertThat(copy).satisfies(
            criteria -> assertThat(criteria).is(criteriaFiltersAre(Objects::isNull)),
            criteria -> assertThat(criteria).isEqualTo(traderCriteria)
        );
    }

    @Test
    void traderCriteriaCopyDuplicatesEveryExistingFilterTest() {
        var traderCriteria = new TraderCriteria();
        setAllFilters(traderCriteria);

        var copy = traderCriteria.copy();

        assertThat(traderCriteria).satisfies(
            criteria ->
                assertThat(criteria).is(
                    copyFiltersAre(copy, (a, b) -> (a == null || a instanceof Boolean) ? a == b : (a != b && a.equals(b)))
                ),
            criteria -> assertThat(criteria).isEqualTo(copy),
            criteria -> assertThat(criteria).hasSameHashCodeAs(copy)
        );

        assertThat(copy).satisfies(
            criteria -> assertThat(criteria).is(criteriaFiltersAre(Objects::nonNull)),
            criteria -> assertThat(criteria).isEqualTo(traderCriteria)
        );
    }

    @Test
    void toStringVerifier() {
        var traderCriteria = new TraderCriteria();

        assertThat(traderCriteria).hasToString("TraderCriteria{}");
    }

    private static void setAllFilters(TraderCriteria traderCriteria) {
        traderCriteria.id();
        traderCriteria.businessName();
        traderCriteria.ownerName();
        traderCriteria.category();
        traderCriteria.approvalStatus();
        traderCriteria.businessMode();
        traderCriteria.billPrefix();
        traderCriteria.createdAt();
        traderCriteria.updatedAt();
        traderCriteria.distinct();
    }

    private static Condition<TraderCriteria> criteriaFiltersAre(Function<Object, Boolean> condition) {
        return new Condition<>(
            criteria ->
                condition.apply(criteria.getId()) &&
                condition.apply(criteria.getBusinessName()) &&
                condition.apply(criteria.getOwnerName()) &&
                condition.apply(criteria.getCategory()) &&
                condition.apply(criteria.getApprovalStatus()) &&
                condition.apply(criteria.getBusinessMode()) &&
                condition.apply(criteria.getBillPrefix()) &&
                condition.apply(criteria.getCreatedAt()) &&
                condition.apply(criteria.getUpdatedAt()) &&
                condition.apply(criteria.getDistinct()),
            "every filter matches"
        );
    }

    private static Condition<TraderCriteria> copyFiltersAre(TraderCriteria copy, BiFunction<Object, Object, Boolean> condition) {
        return new Condition<>(
            criteria ->
                condition.apply(criteria.getId(), copy.getId()) &&
                condition.apply(criteria.getBusinessName(), copy.getBusinessName()) &&
                condition.apply(criteria.getOwnerName(), copy.getOwnerName()) &&
                condition.apply(criteria.getCategory(), copy.getCategory()) &&
                condition.apply(criteria.getApprovalStatus(), copy.getApprovalStatus()) &&
                condition.apply(criteria.getBusinessMode(), copy.getBusinessMode()) &&
                condition.apply(criteria.getBillPrefix(), copy.getBillPrefix()) &&
                condition.apply(criteria.getCreatedAt(), copy.getCreatedAt()) &&
                condition.apply(criteria.getUpdatedAt(), copy.getUpdatedAt()) &&
                condition.apply(criteria.getDistinct(), copy.getDistinct()),
            "every filter matches"
        );
    }
}
