package com.mercotrace.web.rest.errors;

@SuppressWarnings("java:S110")
public class TraderEmailAlreadyRegisteredException extends ConflictAlertException {

    private static final long serialVersionUID = 1L;

    public TraderEmailAlreadyRegisteredException() {
        super(
            ErrorConstants.TRADER_EMAIL_ALREADY_REGISTERED_TYPE,
            "A trader is already registered with this email address. Please sign in or use a different email.",
            "traderRegistration",
            "traderEmailExists"
        );
    }
}
