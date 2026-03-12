package com.mercotrace.web.rest.errors;

@SuppressWarnings("java:S110")
public class TraderMobileAlreadyRegisteredException extends ConflictAlertException {

    private static final long serialVersionUID = 1L;

    public TraderMobileAlreadyRegisteredException() {
        super(
            ErrorConstants.TRADER_MOBILE_ALREADY_REGISTERED_TYPE,
            "This mobile number is already in use.",
            "traderRegistration",
            "traderMobileExists"
        );
    }
}
