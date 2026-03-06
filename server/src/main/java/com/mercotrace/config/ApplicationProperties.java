package com.mercotrace.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Properties specific to Mercotrace.
 * <p>
 * Properties are configured in the {@code application.yml} file.
 * See {@link tech.jhipster.config.JHipsterProperties} for a good example.
 */
@ConfigurationProperties(prefix = "application", ignoreUnknownFields = false)
public class ApplicationProperties {

    private final Liquibase liquibase = new Liquibase();

    private final Security security = new Security();

    // jhipster-needle-application-properties-property

    public Liquibase getLiquibase() {
        return liquibase;
    }

    public Security getSecurity() {
        return security;
    }

    // jhipster-needle-application-properties-property-getter

    public static class Liquibase {

        private Boolean asyncStart = true;

        public Boolean getAsyncStart() {
            return asyncStart;
        }

        public void setAsyncStart(Boolean asyncStart) {
            this.asyncStart = asyncStart;
        }
    }

    public static class Security {

        private final Cookie cookie = new Cookie();

        public Cookie getCookie() {
            return cookie;
        }
    }

    public static class Cookie {

        /**
         * Controls whether the ACCESS_TOKEN cookie is marked as Secure.
         * Defaults to true so that production environments use Secure cookies
         * unless explicitly overridden (for example in application-dev.yml).
         */
        private boolean secure = true;

        public boolean isSecure() {
            return secure;
        }

        public void setSecure(boolean secure) {
            this.secure = secure;
        }
    }
    // jhipster-needle-application-properties-property-class
}
