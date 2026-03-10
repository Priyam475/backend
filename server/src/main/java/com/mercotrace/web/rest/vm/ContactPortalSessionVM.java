package com.mercotrace.web.rest.vm;

import com.mercotrace.service.dto.ContactDTO;

/**
 * ViewModel for Contact Portal session bootstrap.
 *
 * For CONTACT sessions, guest=false and contact is populated. For guest
 * sessions (OTP-verified identifiers without a persisted contact), guest=true
 * and contact is null while phone carries the verified mobile number.
 */
public record ContactPortalSessionVM(boolean guest, String phone, ContactDTO contact) {}

