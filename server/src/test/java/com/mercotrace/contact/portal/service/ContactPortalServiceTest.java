package com.mercotrace.contact.portal.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mercotrace.contact.portal.service.dto.ContactPortalArrivalDTO;
import com.mercotrace.contact.portal.service.dto.ContactPortalProfileUpdateDTO;
import com.mercotrace.contact.portal.service.dto.ContactPortalPurchaseDTO;
import com.mercotrace.contact.portal.service.dto.ContactPortalStatementDTO;
import com.mercotrace.domain.ArApDocument;
import com.mercotrace.domain.Contact;
import com.mercotrace.domain.SellerInVehicle;
import com.mercotrace.domain.StockPurchase;
import com.mercotrace.domain.Vehicle;
import com.mercotrace.domain.enumeration.ArApStatus;
import com.mercotrace.domain.enumeration.ArApType;
import com.mercotrace.repository.ArApDocumentRepository;
import com.mercotrace.repository.ContactRepository;
import com.mercotrace.repository.SellerInVehicleRepository;
import com.mercotrace.repository.StockPurchaseRepository;
import com.mercotrace.repository.VehicleRepository;
import com.mercotrace.service.ContactIdentityService;
import com.mercotrace.service.dto.ContactDTO;
import com.mercotrace.service.mapper.ContactMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class ContactPortalServiceTest {

    @Mock
    private ContactRepository contactRepository;

    @Mock
    private ContactMapper contactMapper;

    @Mock
    private ArApDocumentRepository arApDocumentRepository;

    @Mock
    private StockPurchaseRepository stockPurchaseRepository;

    @Mock
    private SellerInVehicleRepository sellerInVehicleRepository;

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private ContactIdentityService contactIdentityService;

    @InjectMocks
    private ContactPortalService contactPortalService;

    private Contact contact;

    @BeforeEach
    void setUp() {
        contact = new Contact();
        contact.setId(1L);
        contact.setName("Original Name");
        contact.setEmail("old@example.com");
        contact.setAddress("Old address");
        contact.setPasswordHash("hash");
        contact.setCanLogin(false);
    }

    @Test
    void getStatementsForContact_returnsMappedDtos_withPageRequestSortedByDocumentDateDesc() {
        ArApDocument doc = new ArApDocument();
        doc.setId(10L);
        doc.setTraderId(5L);
        doc.setType(ArApType.AR);
        doc.setReferenceNumber("REF-1");
        doc.setOriginalAmount(new BigDecimal("100.00"));
        doc.setOutstandingBalance(new BigDecimal("50.00"));
        doc.setStatus(ArApStatus.OPEN);
        doc.setDocumentDate(LocalDate.of(2024, 1, 1));

        when(arApDocumentRepository.findAllByContact_Id(eq(1L), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(doc), Pageable.ofSize(5), 1));

        List<ContactPortalStatementDTO> result = contactPortalService.getStatementsForContact(1L, 5);

        assertThat(result).hasSize(1);
        ContactPortalStatementDTO dto = result.get(0);
        assertThat(dto.getDocumentId()).isEqualTo("10");
        assertThat(dto.getTraderId()).isEqualTo("5");
        assertThat(dto.getType()).isEqualTo(ArApType.AR);
        assertThat(dto.getReferenceNumber()).isEqualTo("REF-1");
        assertThat(dto.getOriginalAmount()).isEqualByComparingTo("100.00");
        assertThat(dto.getOutstandingBalance()).isEqualByComparingTo("50.00");
        assertThat(dto.getStatus()).isEqualTo(ArApStatus.OPEN);
        assertThat(dto.getDocumentDate()).isEqualTo(LocalDate.of(2024, 1, 1));

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(arApDocumentRepository).findAllByContact_Id(eq(1L), pageableCaptor.capture());
        Pageable usedPageable = pageableCaptor.getValue();
        assertThat(usedPageable.getPageSize()).isEqualTo(5);
        assertThat(usedPageable.getSort().getOrderFor("documentDate").getDirection()).isEqualTo(Sort.Direction.DESC);
    }

    @Test
    void getSettlementsForContact_filtersByApType() {
        ArApDocument doc = new ArApDocument();
        doc.setId(11L);
        doc.setTraderId(6L);
        doc.setType(ArApType.AP);
        doc.setReferenceNumber("SET-1");
        doc.setOriginalAmount(null);
        doc.setOutstandingBalance(null);
        doc.setStatus(ArApStatus.CLOSED);
        doc.setDocumentDate(LocalDate.of(2024, 2, 2));

        when(arApDocumentRepository.findAllByContact_IdAndType(eq(1L), eq(ArApType.AP), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(doc), Pageable.ofSize(3), 1));

        List<ContactPortalStatementDTO> result = contactPortalService.getSettlementsForContact(1L, 3);

        assertThat(result).hasSize(1);
        ContactPortalStatementDTO dto = result.get(0);
        assertThat(dto.getDocumentId()).isEqualTo("11");
        assertThat(dto.getOriginalAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(dto.getOutstandingBalance()).isEqualByComparingTo(BigDecimal.ZERO);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(arApDocumentRepository).findAllByContact_IdAndType(eq(1L), eq(ArApType.AP), pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(3);
    }

    @Test
    void getPurchasesForContact_usesVendorScopedQuery_andMapsFields() {
        StockPurchase sp = new StockPurchase();
        sp.setId(20L);
        sp.setTraderId(7L);
        sp.setVendorId(1L);
        sp.setPurchaseDate(Instant.parse("2024-03-01T10:15:30Z"));
        sp.setTotalAmount(new BigDecimal("250.00"));

        Pageable pageable = Pageable.ofSize(10).withPage(0);
        when(stockPurchaseRepository.findAllByVendorIdAndIsDeletedFalse(eq(1L), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(sp), pageable, 1));

        List<ContactPortalPurchaseDTO> result = contactPortalService.getPurchasesForContact(1L, 10);

        assertThat(result).hasSize(1);
        ContactPortalPurchaseDTO dto = result.get(0);
        assertThat(dto.getPurchaseId()).isEqualTo("20");
        assertThat(dto.getTraderId()).isEqualTo("7");
        assertThat(dto.getPurchaseDate()).isEqualTo(Instant.parse("2024-03-01T10:15:30Z"));
        assertThat(dto.getTotalAmount()).isEqualByComparingTo("250.00");
    }

    @Test
    void getArrivalsForContact_whenNoLinks_returnsEmptyList() {
        when(sellerInVehicleRepository.findAllByContactIdOrBrokerId(1L, 1L)).thenReturn(List.of());

        List<ContactPortalArrivalDTO> result = contactPortalService.getArrivalsForContact(1L, 10);

        assertThat(result).isEmpty();
        verify(sellerInVehicleRepository).findAllByContactIdOrBrokerId(1L, 1L);
    }

    @Test
    void getArrivalsForContact_sortsByVehicleArrivalDescending_andLimitsResults() {
        SellerInVehicle link1 = new SellerInVehicle();
        link1.setId(100L);
        link1.setVehicleId(1000L);

        SellerInVehicle link2 = new SellerInVehicle();
        link2.setId(200L);
        link2.setVehicleId(2000L);

        when(sellerInVehicleRepository.findAllByContactIdOrBrokerId(1L, 1L)).thenReturn(List.of(link1, link2));

        Vehicle v1 = new Vehicle();
        v1.setId(1000L);
        v1.setTraderId(9L);
        v1.setVehicleNumber("KA01-1111");
        v1.setArrivalDatetime(Instant.parse("2024-03-01T10:15:30Z"));

        Vehicle v2 = new Vehicle();
        v2.setId(2000L);
        v2.setTraderId(9L);
        v2.setVehicleNumber("KA01-2222");
        v2.setArrivalDatetime(Instant.parse("2024-03-02T08:00:00Z"));

        when(vehicleRepository.findAllById(List.of(1000L, 2000L))).thenReturn(List.of(v1, v2));

        List<ContactPortalArrivalDTO> result = contactPortalService.getArrivalsForContact(1L, 1);

        assertThat(result).hasSize(1);
        ContactPortalArrivalDTO dto = result.get(0);
        assertThat(dto.getSellerVehicleId()).isEqualTo("200");
        assertThat(dto.getVehicleId()).isEqualTo("2000");
        assertThat(dto.getTraderId()).isEqualTo("9");
        assertThat(dto.getVehicleNumber()).isEqualTo("KA01-2222");
        assertThat(dto.getArrivalDatetime()).isEqualTo(Instant.parse("2024-03-02T08:00:00Z"));
    }

    @Test
    void updateProfile_updatesNameEmailAndAddress_andReturnsMappedDto() {
        when(contactRepository.findById(1L)).thenReturn(Optional.of(contact));
        when(contactIdentityService.normalizeEmail("New@Example.com")).thenReturn("new@example.com");
        ContactDTO dto = new ContactDTO();
        dto.setId(1L);
        dto.setName("Updated Name");
        dto.setEmail("new@example.com");
        dto.setAddress("New address");
        when(contactRepository.save(any(Contact.class))).thenReturn(contact);
        when(contactMapper.toDto(any(Contact.class))).thenReturn(dto);

        ContactPortalProfileUpdateDTO update = new ContactPortalProfileUpdateDTO();
        update.setName(" Updated Name ");
        update.setEmail("New@Example.com");
        update.setAddress("New address");

        ContactDTO result = contactPortalService.updateProfile(1L, update);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getName()).isEqualTo("Updated Name");
        assertThat(result.getEmail()).isEqualTo("new@example.com");
        assertThat(result.getAddress()).isEqualTo("New address");

        verify(contactIdentityService).assertNoLoginConflictForEmailUpdate(1L, "new@example.com");
    }

    @Test
    void updateProfile_withPasswordChange_validatesCurrentPassword_andEnablesLogin() {
        contact.setPasswordHash("encoded-old");
        when(contactRepository.findById(1L)).thenReturn(Optional.of(contact));
        when(passwordEncoder.matches("oldpass", "encoded-old")).thenReturn(true);
        when(passwordEncoder.encode("newpassword")).thenReturn("encoded-new");
        when(contactRepository.save(any(Contact.class))).thenReturn(contact);
        when(contactMapper.toDto(any(Contact.class))).thenReturn(new ContactDTO());

        ContactPortalProfileUpdateDTO update = new ContactPortalProfileUpdateDTO();
        update.setNewPassword("newpassword");
        update.setCurrentPassword("oldpass");

        contactPortalService.updateProfile(1L, update);

        assertThat(contact.getPasswordHash()).isEqualTo("encoded-new");
        assertThat(contact.getCanLogin()).isTrue();
    }

    @Test
    void updateProfile_withNewPasswordAndMissingCurrentPassword_throwsBadRequest() {
        when(contactRepository.findById(1L)).thenReturn(Optional.of(contact));

        ContactPortalProfileUpdateDTO update = new ContactPortalProfileUpdateDTO();
        update.setNewPassword("newpassword");
        update.setCurrentPassword(null);

        assertThatThrownBy(() -> contactPortalService.updateProfile(1L, update))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void updateProfile_withIncorrectCurrentPassword_throwsBadRequest() {
        contact.setPasswordHash("encoded-old");
        when(contactRepository.findById(1L)).thenReturn(Optional.of(contact));
        when(passwordEncoder.matches("wrong", "encoded-old")).thenReturn(false);

        ContactPortalProfileUpdateDTO update = new ContactPortalProfileUpdateDTO();
        update.setNewPassword("newpassword");
        update.setCurrentPassword("wrong");

        assertThatThrownBy(() -> contactPortalService.updateProfile(1L, update))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void updateProfile_whenContactNotFound_throwsNotFound() {
        when(contactRepository.findById(1L)).thenReturn(Optional.empty());

        ContactPortalProfileUpdateDTO update = new ContactPortalProfileUpdateDTO();
        update.setName("Test");

        assertThatThrownBy(() -> contactPortalService.updateProfile(1L, update))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}

