package com.mercotrace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mercotrace.domain.Cdn;
import com.mercotrace.domain.CdnItem;
import com.mercotrace.domain.CdnTransfer;
import com.mercotrace.domain.Contact;
import com.mercotrace.domain.enumeration.CdnStatus;
import com.mercotrace.repository.CdnItemRepository;
import com.mercotrace.repository.CdnRepository;
import com.mercotrace.repository.CdnTransferRepository;
import com.mercotrace.repository.ContactRepository;
import com.mercotrace.service.dto.CDNDTOs.CDNCreateDTO;
import com.mercotrace.service.dto.CDNDTOs.CDNLineItemDTO;
import com.mercotrace.service.dto.CDNDTOs.CDNLineItemInput;
import com.mercotrace.service.dto.CDNDTOs.CDNResponseDTO;
import com.mercotrace.service.dto.CDNDTOs.ReceiveByPINDTO;
import com.mercotrace.service.impl.CdnServiceImpl;
import com.mercotrace.service.mapper.CdnMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class CdnServiceImplTest {

    private static final long TRADER_ID = 101L;
    private static final long CDN_ID = 1L;

    @Mock
    private TraderContextService traderContextService;

    @Mock
    private CdnRepository cdnRepository;

    @Mock
    private CdnItemRepository cdnItemRepository;

    @Mock
    private CdnTransferRepository cdnTransferRepository;

    @Mock
    private ContactRepository contactRepository;

    @Mock
    private CdnMapper cdnMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private CdnServiceImpl cdnService;

    private Cdn cdnEntity;
    private CDNResponseDTO responseDto;
    private CdnTransfer transferEntity;

    @BeforeEach
    void setUp() {
        lenient().when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);

        cdnEntity = new Cdn();
        cdnEntity.setId(CDN_ID);
        cdnEntity.setTraderId(TRADER_ID);
        cdnEntity.setCdnNumber("CDN-0001");
        cdnEntity.setCdnDate(Instant.now());
        cdnEntity.setReceivingPartyName("Test Receiver");
        cdnEntity.setStatus(CdnStatus.DISPATCHED);
        cdnEntity.setIsDeleted(false);

        responseDto = new CDNResponseDTO();
        responseDto.setId(CDN_ID);
        responseDto.setCdnNumber("CDN-0001");
        responseDto.setReceivingParty("Test Receiver");
        responseDto.setStatus("ACTIVE");
        responseDto.setItems(List.of());

        transferEntity = new CdnTransfer();
        transferEntity.setId(10L);
        transferEntity.setCdn(cdnEntity);
        transferEntity.setSenderTraderId(TRADER_ID);
        transferEntity.setIsUsed(false);
        transferEntity.setPinExpiry(Instant.now().plusSeconds(86400));
        transferEntity.setPinHash("HASHED_PIN");
    }

    @Test
    void list_returnsEmptyPage_whenRepositoryReturnsEmpty() {
        Pageable pageable = PageRequest.of(0, 10);
        when(cdnRepository.findAllByTraderIdAndIsDeletedFalse(eq(TRADER_ID), any(Pageable.class)))
            .thenReturn(Page.empty(pageable));

        Page<CDNResponseDTO> result = cdnService.list(pageable, null);

        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalElements()).isZero();
    }

    @Test
    void list_returnsMappedPage_whenRepositoryHasData() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Cdn> entityPage = new PageImpl<>(List.of(cdnEntity), pageable, 1);
        when(cdnRepository.findAllByTraderIdAndIsDeletedFalse(eq(TRADER_ID), any(Pageable.class)))
            .thenReturn(entityPage);
        when(cdnItemRepository.findAllByCdnIdAndIsDeletedFalse(CDN_ID)).thenReturn(List.of());
        when(cdnTransferRepository.findFirstByCdnIdAndIsDeletedFalse(CDN_ID)).thenReturn(Optional.of(transferEntity));
        when(cdnMapper.toResponseDto(any(Cdn.class))).thenReturn(responseDto);
        when(cdnMapper.toLineItemDtos(any())).thenReturn(List.of());

        Page<CDNResponseDTO> result = cdnService.list(pageable, null);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCdnNumber()).isEqualTo("CDN-0001");
    }

    @Test
    void list_usesSearch_whenQueryProvided() {
        Pageable pageable = PageRequest.of(0, 10);
        when(cdnRepository.findAllByTraderIdAndSearchAndIsDeletedFalse(eq(TRADER_ID), eq("lot1"), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(cdnEntity), pageable, 1));
        when(cdnItemRepository.findAllByCdnIdAndIsDeletedFalse(CDN_ID)).thenReturn(List.of());
        when(cdnTransferRepository.findFirstByCdnIdAndIsDeletedFalse(CDN_ID)).thenReturn(Optional.of(transferEntity));
        when(cdnMapper.toResponseDto(any(Cdn.class))).thenReturn(responseDto);
        when(cdnMapper.toLineItemDtos(any())).thenReturn(List.of());

        Page<CDNResponseDTO> result = cdnService.list(pageable, "lot1");

        assertThat(result.getContent()).hasSize(1);
        verify(cdnRepository).findAllByTraderIdAndSearchAndIsDeletedFalse(TRADER_ID, "lot1", pageable);
    }

    @Test
    void getById_returnsNull_whenNotFound() {
        when(cdnRepository.findByIdAndTraderIdAndIsDeletedFalse(CDN_ID, TRADER_ID))
            .thenReturn(Optional.empty());

        CDNResponseDTO result = cdnService.getById(CDN_ID);

        assertThat(result).isNull();
    }

    @Test
    void getById_returnsDto_whenFound() {
        when(cdnRepository.findByIdAndTraderIdAndIsDeletedFalse(CDN_ID, TRADER_ID))
            .thenReturn(Optional.of(cdnEntity));
        when(cdnItemRepository.findAllByCdnIdAndIsDeletedFalse(CDN_ID)).thenReturn(List.of());
        when(cdnTransferRepository.findFirstByCdnIdAndIsDeletedFalse(CDN_ID)).thenReturn(Optional.of(transferEntity));
        when(cdnMapper.toResponseDto(cdnEntity)).thenReturn(responseDto);
        when(cdnMapper.toLineItemDtos(List.of())).thenReturn(List.of());

        CDNResponseDTO result = cdnService.getById(CDN_ID);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(CDN_ID);
        assertThat(result.getCdnNumber()).isEqualTo("CDN-0001");
    }

    @Test
    void create_throws_whenNoValidItems() {
        CDNCreateDTO request = new CDNCreateDTO();
        request.setReceivingParty("Receiver");
        request.setSource("MANUAL");
        CDNLineItemInput item = new CDNLineItemInput();
        item.setLotName("");
        item.setQuantity(5);
        request.setItems(List.of(item));

        assertThatThrownBy(() -> cdnService.create(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("At least one item with lot name is required");
    }

    @Test
    void create_throws_whenItemsNull() {
        CDNCreateDTO request = new CDNCreateDTO();
        request.setReceivingParty("Receiver");
        request.setSource("MANUAL");
        request.setItems(List.of());

        assertThatThrownBy(() -> cdnService.create(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("At least one item with lot name is required");
    }

    @Test
    void create_savesAndReturnsDto_whenValid() {
        CDNCreateDTO request = new CDNCreateDTO();
        request.setReceivingParty("Test Receiver");
        request.setSource("MANUAL");
        CDNLineItemInput item = new CDNLineItemInput();
        item.setLotName("LOT-1");
        item.setQuantity(10);
        item.setVariant("Wheat");
        request.setItems(List.of(item));
        request.setAdvancePaid(BigDecimal.valueOf(500));

        when(contactRepository.findAllByTraderId(TRADER_ID)).thenReturn(List.of());
        when(cdnRepository.findMaxCdnSerialByTrader(TRADER_ID)).thenReturn(0);
        when(cdnRepository.save(any(Cdn.class))).thenAnswer(inv -> {
            Cdn c = inv.getArgument(0);
            c.setId(CDN_ID);
            return c;
        });
        when(passwordEncoder.encode(any(CharSequence.class))).thenReturn("hashedPin");
        when(cdnMapper.toResponseDto(any(Cdn.class))).thenReturn(responseDto);
        when(cdnMapper.toLineItemDtos(any())).thenReturn(List.of());
        responseDto.setPin("ABC123");
        responseDto.setPinUsed(false);
        responseDto.setPinExpiresAt(Instant.now().plusSeconds(86400));

        CDNResponseDTO result = cdnService.create(request);

        assertThat(result).isNotNull();
        assertThat(result.getCdnNumber()).isEqualTo("CDN-0001");
        verify(cdnRepository).save(any(Cdn.class));
        verify(cdnItemRepository).save(any(CdnItem.class));
        verify(cdnTransferRepository).save(any(CdnTransfer.class));
        verify(passwordEncoder).encode(any(CharSequence.class));
    }

    @Test
    void receiveByPin_throws_whenPinWrongLength() {
        ReceiveByPINDTO request = new ReceiveByPINDTO();
        request.setPin("123"); // too short

        assertThatThrownBy(() -> cdnService.receiveByPin(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Invalid or expired PIN");
    }

    @Test
    void receiveByPin_throws_whenNoMatchingTransfer() {
        ReceiveByPINDTO request = new ReceiveByPINDTO();
        request.setPin("ABCDEF");

        when(cdnTransferRepository.findAllByNotUsedAndNotExpired(any(Instant.class))).thenReturn(List.of());

        assertThatThrownBy(() -> cdnService.receiveByPin(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Invalid or expired PIN");
    }

    @Test
    void receiveByPin_throws_whenPinDoesNotMatch() {
        ReceiveByPINDTO request = new ReceiveByPINDTO();
        request.setPin("ABCDEF");

        when(cdnTransferRepository.findAllByNotUsedAndNotExpired(any(Instant.class)))
            .thenReturn(List.of(transferEntity));
        when(passwordEncoder.matches(eq("ABCDEF"), anyString())).thenReturn(false);

        assertThatThrownBy(() -> cdnService.receiveByPin(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Invalid or expired PIN");
    }

    @Test
    void receiveByPin_returnsDtoAndUpdates_whenValidPin() {
        ReceiveByPINDTO request = new ReceiveByPINDTO();
        request.setPin("ABCDEF");

        when(cdnTransferRepository.findAllByNotUsedAndNotExpired(any(Instant.class)))
            .thenReturn(List.of(transferEntity));
        when(passwordEncoder.matches(eq("ABCDEF"), anyString())).thenReturn(true);
        when(cdnTransferRepository.save(any(CdnTransfer.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cdnRepository.save(any(Cdn.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cdnItemRepository.findAllByCdnIdAndIsDeletedFalse(CDN_ID)).thenReturn(List.of());
        when(cdnTransferRepository.findFirstByCdnIdAndIsDeletedFalse(CDN_ID)).thenReturn(Optional.of(transferEntity));
        when(cdnMapper.toResponseDto(any(Cdn.class))).thenReturn(responseDto);
        when(cdnMapper.toLineItemDtos(any())).thenReturn(List.of());
        responseDto.setStatus("TRANSFERRED");

        CDNResponseDTO result = cdnService.receiveByPin(request);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo("TRANSFERRED");
        verify(cdnTransferRepository).save(any(CdnTransfer.class));
        verify(cdnRepository).save(any(Cdn.class));
    }
}
