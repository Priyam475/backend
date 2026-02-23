package com.mercotrace.service.criteria;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Objects;
import java.util.function.BiFunction;
import java.util.function.Function;
import org.assertj.core.api.Condition;
import org.junit.jupiter.api.Test;

class RoleCriteriaTest {

    @Test
    void newRoleCriteriaHasAllFiltersNullTest() {
        var roleCriteria = new RoleCriteria();
        assertThat(roleCriteria).is(criteriaFiltersAre(Objects::isNull));
    }

    @Test
    void roleCriteriaFluentMethodsCreatesFiltersTest() {
        var roleCriteria = new RoleCriteria();

        setAllFilters(roleCriteria);

        assertThat(roleCriteria).is(criteriaFiltersAre(Objects::nonNull));
    }

    @Test
    void roleCriteriaCopyCreatesNullFilterTest() {
        var roleCriteria = new RoleCriteria();
        var copy = roleCriteria.copy();

        assertThat(roleCriteria).satisfies(
            criteria ->
                assertThat(criteria).is(
                    copyFiltersAre(copy, (a, b) -> (a == null || a instanceof Boolean) ? a == b : (a != b && a.equals(b)))
                ),
            criteria -> assertThat(criteria).isEqualTo(copy),
            criteria -> assertThat(criteria).hasSameHashCodeAs(copy)
        );

        assertThat(copy).satisfies(
            criteria -> assertThat(criteria).is(criteriaFiltersAre(Objects::isNull)),
            criteria -> assertThat(criteria).isEqualTo(roleCriteria)
        );
    }

    @Test
    void roleCriteriaCopyDuplicatesEveryExistingFilterTest() {
        var roleCriteria = new RoleCriteria();
        setAllFilters(roleCriteria);

        var copy = roleCriteria.copy();

        assertThat(roleCriteria).satisfies(
            criteria ->
                assertThat(criteria).is(
                    copyFiltersAre(copy, (a, b) -> (a == null || a instanceof Boolean) ? a == b : (a != b && a.equals(b)))
                ),
            criteria -> assertThat(criteria).isEqualTo(copy),
            criteria -> assertThat(criteria).hasSameHashCodeAs(copy)
        );

        assertThat(copy).satisfies(
            criteria -> assertThat(criteria).is(criteriaFiltersAre(Objects::nonNull)),
            criteria -> assertThat(criteria).isEqualTo(roleCriteria)
        );
    }

    @Test
    void toStringVerifier() {
        var roleCriteria = new RoleCriteria();

        assertThat(roleCriteria).hasToString("RoleCriteria{}");
    }

    private static void setAllFilters(RoleCriteria roleCriteria) {
        roleCriteria.id();
        roleCriteria.roleName();
        roleCriteria.createdAt();
        roleCriteria.permissionId();
        roleCriteria.distinct();
    }

    private static Condition<RoleCriteria> criteriaFiltersAre(Function<Object, Boolean> condition) {
        return new Condition<>(
            criteria ->
                condition.apply(criteria.getId()) &&
                condition.apply(criteria.getRoleName()) &&
                condition.apply(criteria.getCreatedAt()) &&
                condition.apply(criteria.getPermissionId()) &&
                condition.apply(criteria.getDistinct()),
            "every filter matches"
        );
    }

    private static Condition<RoleCriteria> copyFiltersAre(RoleCriteria copy, BiFunction<Object, Object, Boolean> condition) {
        return new Condition<>(
            criteria ->
                condition.apply(criteria.getId(), copy.getId()) &&
                condition.apply(criteria.getRoleName(), copy.getRoleName()) &&
                condition.apply(criteria.getCreatedAt(), copy.getCreatedAt()) &&
                condition.apply(criteria.getPermissionId(), copy.getPermissionId()) &&
                condition.apply(criteria.getDistinct(), copy.getDistinct()),
            "every filter matches"
        );
    }
}
