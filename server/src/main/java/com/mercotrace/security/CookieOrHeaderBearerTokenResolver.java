package com.mercotrace.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;

/**
 * Resolves bearer tokens primarily from the standard Authorization header, but
 * also supports a secure httpOnly cookie fallback. This lets the frontend
 * avoid handling JWTs directly while the resource server still uses bearer
 * tokens internally.
 */
public class CookieOrHeaderBearerTokenResolver implements BearerTokenResolver {

    private static final String ACCESS_TOKEN_COOKIE = "ACCESS_TOKEN";

    private final DefaultBearerTokenResolver delegate = new DefaultBearerTokenResolver();

    @Override
    public String resolve(HttpServletRequest request) {
        // First try the standard Authorization header
        String token = delegate.resolve(request);
        if (token != null && !token.isBlank()) {
            return token;
        }

        // Fallback: read from secure cookie set by AuthenticateController
        if (request.getCookies() == null) {
            return null;
        }

        for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
            if (ACCESS_TOKEN_COOKIE.equals(cookie.getName())) {
                String value = cookie.getValue();
                return (value != null && !value.isBlank()) ? value : null;
            }
        }

        return null;
    }
}

