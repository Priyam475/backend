package com.mercotrace.contact.portal.web.rest;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mercotrace.contact.portal.service.ContactPortalService;
import com.mercotrace.contact.portal.service.dto.ContactPortalArrivalDTO;
import com.mercotrace.contact.portal.service.dto.ContactPortalPurchaseDTO;
import com.mercotrace.contact.portal.service.dto.ContactPortalStatementDTO;
import com.mercotrace.contact.portal.service.dto.ContactPortalProfileUpdateDTO;
import com.mercotrace.security.SecurityUtils;
import com.mercotrace.service.dto.ContactDTO;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class ContactPortalResourceTest {

    @Mock
    private ContactPortalService contactPortalService;

    @InjectMocks
    private ContactPortalResource contactPortalResource;

    @Test
    void getArrivals_usesContactIdFromJwt_andClampsLimit() {
        Jwt jwt = Jwt
            .withTokenValue("token")
            .header("alg", "none")
            .claim(SecurityUtils.CONTACT_ID_CLAIM, 42L)
            .build();
        JwtAuthenticationToken authentication = new JwtAuthenticationToken(jwt);

        when(contactPortalService.getArrivalsForContact(eq(42L), anyInt())).thenReturn(List.of(new ContactPortalArrivalDTO()));

        contactPortalResource.getArrivals(authentication, 5000);

        verify(contactPortalService).getArrivalsForContact(42L, 200);
    }

    @Test
    void getPurchases_usesContactIdFromJwt_andClampsLimit() {
        Jwt jwt = Jwt
            .withTokenValue("token")
            .header("alg", "none")
            .claim(SecurityUtils.CONTACT_ID_CLAIM, "42")
            .build();
        JwtAuthenticationToken authentication = new JwtAuthenticationToken(jwt);

        when(contactPortalService.getPurchasesForContact(eq(42L), anyInt())).thenReturn(List.of(new ContactPortalPurchaseDTO()));

        contactPortalResource.getPurchases(authentication, -10);

        verify(contactPortalService).getPurchasesForContact(42L, 1);
    }

    @Test
    void getStatements_usesContactIdFromJwt_andClampsLimit() {
        Jwt jwt = Jwt
            .withTokenValue("token")
            .header("alg", "none")
            .claim(SecurityUtils.CONTACT_ID_CLAIM, 42L)
            .build();
        JwtAuthenticationToken authentication = new JwtAuthenticationToken(jwt);

        when(contactPortalService.getStatementsForContact(eq(42L), anyInt())).thenReturn(List.of(new ContactPortalStatementDTO()));

        contactPortalResource.getStatements(authentication, 9999);

        verify(contactPortalService).getStatementsForContact(42L, 500);
    }

    @Test
    void getSettlements_usesContactIdFromJwt_andClampsLimit() {
        Jwt jwt = Jwt
            .withTokenValue("token")
            .header("alg", "none")
            .claim(SecurityUtils.CONTACT_ID_CLAIM, "42")
            .build();
        JwtAuthenticationToken authentication = new JwtAuthenticationToken(jwt);

        when(contactPortalService.getSettlementsForContact(eq(42L), anyInt())).thenReturn(List.of(new ContactPortalStatementDTO()));

        contactPortalResource.getSettlements(authentication, 0);

        verify(contactPortalService).getSettlementsForContact(42L, 1);
    }

    @Test
    void updateProfile_usesContactIdFromJwt_andDelegatesToService() {
        Jwt jwt = Jwt
            .withTokenValue("token")
            .header("alg", "none")
            .claim(SecurityUtils.CONTACT_ID_CLAIM, 42L)
            .build();
        JwtAuthenticationToken authentication = new JwtAuthenticationToken(jwt);

        ContactPortalProfileUpdateDTO update = new ContactPortalProfileUpdateDTO();
        update.setName("New Name");

        ContactDTO dto = new ContactDTO();
        dto.setId(42L);
        when(contactPortalService.updateProfile(42L, update)).thenReturn(dto);

        var response = contactPortalResource.updateProfile(authentication, update);

        verify(contactPortalService).updateProfile(42L, update);
        org.assertj.core.api.Assertions.assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        org.assertj.core.api.Assertions.assertThat(response.getBody().getId()).isEqualTo(42L);
    }

    @Test
    void getCurrentContactId_withMissingAuthentication_throwsUnauthorized() {
        assertThatThrownBy(() -> contactPortalResource.getArrivals(null, 10))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> org.assertj.core.api.Assertions
                .assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void getCurrentContactId_withMissingContactIdClaim_throwsUnauthorized() {
        Jwt jwt = Jwt
            .withTokenValue("token")
            .header("alg", "none")
            .claim("some-other-claim", "value")
            .build();
        JwtAuthenticationToken authentication = new JwtAuthenticationToken(jwt);

        assertThatThrownBy(() -> contactPortalResource.getArrivals(authentication, 10))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> org.assertj.core.api.Assertions
                .assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void getCurrentContactId_withNonNumericContactIdClaim_throwsUnauthorized() {
        Jwt jwt = Jwt
            .withTokenValue("token")
            .header("alg", "none")
            .claim(SecurityUtils.CONTACT_ID_CLAIM, "not-a-number")
            .build();
        JwtAuthenticationToken authentication = new JwtAuthenticationToken(jwt);

        assertThatThrownBy(() -> contactPortalResource.getArrivals(authentication, 10))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> org.assertj.core.api.Assertions
                .assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED));
    }
}

