package com.mercotrace.web.rest.errors;

import java.net.URI;
import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;
import tech.jhipster.web.rest.errors.ProblemDetailWithCause;
import tech.jhipster.web.rest.errors.ProblemDetailWithCause.ProblemDetailWithCauseBuilder;

/**
 * Exception for conflict situations (e.g. duplicate registration).
 * Returns HTTP 409 Conflict with RFC 7807 problem+json body.
 */
@SuppressWarnings("java:S110")
public class ConflictAlertException extends ErrorResponseException {

    private static final long serialVersionUID = 1L;

    private final String entityName;
    private final String errorKey;

    public ConflictAlertException(URI type, String defaultMessage, String entityName, String errorKey) {
        super(
            HttpStatus.CONFLICT,
            ProblemDetailWithCauseBuilder.instance()
                .withStatus(HttpStatus.CONFLICT.value())
                .withType(type)
                .withTitle("Conflict")
                .withDetail(defaultMessage)
                .withProperty("message", "error." + errorKey)
                .withProperty("params", entityName)
                .build(),
            null
        );
        this.entityName = entityName;
        this.errorKey = errorKey;
    }

    public String getEntityName() {
        return entityName;
    }

    public String getErrorKey() {
        return errorKey;
    }
}
