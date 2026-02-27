package com.mercotrace.security;

/**
 * Constants for Spring Security authorities.
 */
public final class AuthoritiesConstants {

    public static final String ADMIN = "ROLE_ADMIN";

    public static final String USER = "ROLE_USER";

    public static final String ANONYMOUS = "ROLE_ANONYMOUS";

    /** Auctions module – Sales Pad */
    public static final String AUCTIONS_VIEW = "ROLE_AUCTIONS_VIEW";
    public static final String AUCTIONS_CREATE = "ROLE_AUCTIONS_CREATE";
    public static final String AUCTIONS_EDIT = "ROLE_AUCTIONS_EDIT";
    public static final String AUCTIONS_DELETE = "ROLE_AUCTIONS_DELETE";
    public static final String AUCTIONS_APPROVE = "ROLE_AUCTIONS_APPROVE";

    private AuthoritiesConstants() {}
}
