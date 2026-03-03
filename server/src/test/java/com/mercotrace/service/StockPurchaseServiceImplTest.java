package com.mercotrace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

import com.mercotrace.domain.Commodity;
import com.mercotrace.domain.Contact;
import com.mercotrace.domain.StockPurchase;
import com.mercotrace.domain.StockPurchaseCharge;
import com.mercotrace.domain.StockPurchaseItem;
import com.mercotrace.repository.CommodityRepository;
import com.mercotrace.repository.ContactRepository;
import com.mercotrace.repository.StockPurchaseRepository;
import com.mercotrace.service.dto.StockPurchaseDTOs.*;
import com.mercotrace.service.impl.StockPurchaseServiceImpl;
import com.mercotrace.service.mapper.StockPurchaseChargeMapper;
import com.mercotrace.service.mapper.StockPurchaseItemMapper;
import com.mercotrace.service.mapper.StockPurchaseMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
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

@ExtendWith(MockitoExtension.class)
class StockPurchaseServiceImplTest {

    private static final long TRADER_ID = 101L;
    private static final long VENDOR_ID = 10L;
    private static final long COMMODITY_ID = 20L;

    @Mock
    private TraderContextService traderContextService;

    @Mock
    private StockPurchaseRepository stockPurchaseRepository;

    @Mock
    private ContactRepository contactRepository;

    @Mock
    private CommodityRepository commodityRepository;

    @Mock
    private StockPurchaseMapper stockPurchaseMapper;

    @Mock
    private StockPurchaseItemMapper stockPurchaseItemMapper;

    @Mock
    private StockPurchaseChargeMapper stockPurchaseChargeMapper;

    @InjectMocks
    private StockPurchaseServiceImpl stockPurchaseService;

    private Contact vendor;
    private Commodity commodity;

    @BeforeEach
    void setUp() {
        vendor = new Contact();
        vendor.setId(VENDOR_ID);
        vendor.setTraderId(TRADER_ID);
        vendor.setName("Test Vendor");

        commodity = new Commodity();
        commodity.setId(COMMODITY_ID);
        commodity.setTraderId(TRADER_ID);
        commodity.setCommodityName("Wheat");
    }

    @Test
    void getPurchasesReturnsEmptyPageWhenNoData() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        Pageable pageable = PageRequest.of(0, 10);
        when(stockPurchaseRepository.findAllByTraderIdAndIsDeletedFalse(eq(TRADER_ID), eq(pageable)))
            .thenReturn(Page.empty(pageable));

        Page<StockPurchaseDTO> result = stockPurchaseService.getPurchases(pageable, null);

        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalElements()).isZero();
    }

    @Test
    void getPurchasesReturnsPageWithVendorSearch() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        Pageable pageable = PageRequest.of(0, 10);
        StockPurchase purchase = new StockPurchase();
        purchase.setId(1L);
        purchase.setTraderId(TRADER_ID);
        purchase.setVendorId(VENDOR_ID);
        when(contactRepository.findAllByTraderIdAndNameContainingIgnoreCase(eq(TRADER_ID), eq("Vendor")))
            .thenReturn(List.of(vendor));
        when(stockPurchaseRepository.findAllByTraderIdAndVendorIdInAndIsDeletedFalse(
            eq(TRADER_ID), eq(List.of(VENDOR_ID)), eq(pageable)))
            .thenReturn(new PageImpl<>(List.of(purchase), pageable, 1));

        StockPurchaseDTO dto = new StockPurchaseDTO();
        dto.setId(1L);
        when(stockPurchaseMapper.toDto(any(StockPurchase.class))).thenReturn(dto);
        when(contactRepository.findById(VENDOR_ID)).thenReturn(Optional.of(vendor));

        Page<StockPurchaseDTO> result = stockPurchaseService.getPurchases(pageable, "Vendor");

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo(1L);
    }

    @Test
    void getByIdReturnsDtoWhenFoundAndSameTrader() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        StockPurchase purchase = new StockPurchase();
        purchase.setId(1L);
        purchase.setTraderId(TRADER_ID);
        purchase.setVendorId(VENDOR_ID);
        purchase.setTotalAmount(new BigDecimal("100"));
        purchase.setTotalCharges(BigDecimal.ZERO);
        purchase.setItems(new ArrayList<>());
        purchase.setCharges(new ArrayList<>());
        when(stockPurchaseRepository.findById(1L)).thenReturn(Optional.of(purchase));

        StockPurchaseDTO dto = new StockPurchaseDTO();
        dto.setId(1L);
        dto.setVendorId(VENDOR_ID);
        when(stockPurchaseMapper.toDto(any(StockPurchase.class))).thenReturn(dto);
        when(contactRepository.findById(VENDOR_ID)).thenReturn(Optional.of(vendor));

        StockPurchaseDTO result = stockPurchaseService.getById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    void getByIdThrowsWhenNotFound() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        when(stockPurchaseRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> stockPurchaseService.getById(999L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Stock purchase not found: 999");
    }

    @Test
    void getByIdThrowsWhenDifferentTrader() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        StockPurchase purchase = new StockPurchase();
        purchase.setId(1L);
        purchase.setTraderId(999L);
        purchase.setVendorId(VENDOR_ID);
        when(stockPurchaseRepository.findById(1L)).thenReturn(Optional.of(purchase));

        assertThatThrownBy(() -> stockPurchaseService.getById(1L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Stock purchase not found: 1");
    }

    @Test
    void createThrowsWhenVendorNotFound() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        when(contactRepository.findById(999L)).thenReturn(Optional.empty());

        CreateStockPurchaseRequestDTO request = new CreateStockPurchaseRequestDTO();
        request.setVendorId(999L);
        PurchaseLineItemInput item = new PurchaseLineItemInput();
        item.setCommodityId(COMMODITY_ID);
        item.setQuantity(1);
        item.setRate(BigDecimal.ONE);
        item.setAmount(BigDecimal.ONE);
        request.setItems(List.of(item));

        assertThatThrownBy(() -> stockPurchaseService.create(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Vendor not found: 999");
    }

    @Test
    void createThrowsWhenVendorBelongsToDifferentTrader() {
        Contact otherVendor = new Contact();
        otherVendor.setId(100L);
        otherVendor.setTraderId(999L);
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        when(contactRepository.findById(100L)).thenReturn(Optional.of(otherVendor));

        CreateStockPurchaseRequestDTO request = new CreateStockPurchaseRequestDTO();
        request.setVendorId(100L);
        PurchaseLineItemInput item = new PurchaseLineItemInput();
        item.setCommodityId(COMMODITY_ID);
        item.setQuantity(1);
        item.setRate(BigDecimal.ONE);
        item.setAmount(BigDecimal.ONE);
        request.setItems(List.of(item));

        assertThatThrownBy(() -> stockPurchaseService.create(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Vendor does not belong to current trader");
    }

    @Test
    void createThrowsWhenNoItemWithAmountGreaterThanZero() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        when(contactRepository.findById(VENDOR_ID)).thenReturn(Optional.of(vendor));

        CreateStockPurchaseRequestDTO request = new CreateStockPurchaseRequestDTO();
        request.setVendorId(VENDOR_ID);
        PurchaseLineItemInput item = new PurchaseLineItemInput();
        item.setCommodityId(COMMODITY_ID);
        item.setQuantity(0);
        item.setRate(BigDecimal.ZERO);
        item.setAmount(BigDecimal.ZERO);
        request.setItems(List.of(item));

        assertThatThrownBy(() -> stockPurchaseService.create(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("At least one item with amount > 0 is required");
    }

    @Test
    void createSucceedsAndReturnsDto() {
        when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        when(contactRepository.findById(VENDOR_ID)).thenReturn(Optional.of(vendor));
        when(commodityRepository.findById(COMMODITY_ID)).thenReturn(Optional.of(commodity));

        StockPurchase savedPurchase = new StockPurchase();
        savedPurchase.setTraderId(TRADER_ID);
        savedPurchase.setVendorId(VENDOR_ID);
        savedPurchase.setTotalAmount(new BigDecimal("100"));
        savedPurchase.setTotalCharges(BigDecimal.ZERO);
        savedPurchase.setPurchaseDate(Instant.now());
        StockPurchaseItem savedItem = new StockPurchaseItem();
        savedItem.setCommodityId(COMMODITY_ID);
        savedItem.setCommodityName("Wheat");
        savedItem.setQuantity(10);
        savedItem.setRate(new BigDecimal("10"));
        savedItem.setAmount(new BigDecimal("100"));
        savedPurchase.getItems().add(savedItem);
        savedPurchase.setCharges(new ArrayList<>());

        when(stockPurchaseRepository.save(any(StockPurchase.class))).thenAnswer(inv -> {
            StockPurchase p = inv.getArgument(0);
            p.setId(1L);
            if (p.getItems() != null) {
                for (StockPurchaseItem i : p.getItems()) {
                    i.setId(1L);
                }
            }
            return p;
        });

        StockPurchaseDTO baseDto = new StockPurchaseDTO();
        baseDto.setId(1L);
        baseDto.setSubtotal(new BigDecimal("100"));
        baseDto.setTotalCharges(BigDecimal.ZERO);
        baseDto.setCreatedAt(Instant.now());
        when(stockPurchaseMapper.toDto(any(StockPurchase.class))).thenReturn(baseDto);
        when(stockPurchaseItemMapper.toDto(any(StockPurchaseItem.class))).thenReturn(new PurchaseLineItemDTO());

        CreateStockPurchaseRequestDTO request = new CreateStockPurchaseRequestDTO();
        request.setVendorId(VENDOR_ID);
        PurchaseLineItemInput item = new PurchaseLineItemInput();
        item.setCommodityId(COMMODITY_ID);
        item.setQuantity(10);
        item.setRate(new BigDecimal("10"));
        item.setAmount(new BigDecimal("100"));
        request.setItems(List.of(item));

        StockPurchaseDTO result = stockPurchaseService.create(request);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getSubtotal()).isEqualByComparingTo(new BigDecimal("100"));
    }
}
