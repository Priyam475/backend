package com.mercotrace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

import com.mercotrace.domain.FreightCalculation;
import com.mercotrace.domain.Lot;
import com.mercotrace.domain.SellerInVehicle;
import com.mercotrace.domain.Vehicle;
import com.mercotrace.domain.VehicleWeight;
import com.mercotrace.domain.enumeration.FreightMethod;
import com.mercotrace.repository.CommodityRepository;
import com.mercotrace.repository.ContactRepository;
import com.mercotrace.repository.DailySerialRepository;
import com.mercotrace.repository.FreightCalculationRepository;
import com.mercotrace.repository.FreightDistributionRepository;
import com.mercotrace.repository.LotRepository;
import com.mercotrace.repository.SellerInVehicleRepository;
import com.mercotrace.repository.VehicleRepository;
import com.mercotrace.repository.VehicleWeightRepository;
import com.mercotrace.repository.VoucherRepository;
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

@ExtendWith(MockitoExtension.class)
class ArrivalServiceTest {

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private VehicleWeightRepository vehicleWeightRepository;

    @Mock
    private SellerInVehicleRepository sellerInVehicleRepository;

    @Mock
    private LotRepository lotRepository;

    @Mock
    private FreightCalculationRepository freightCalculationRepository;

    @Mock
    private FreightDistributionRepository freightDistributionRepository;

    @Mock
    private VoucherRepository voucherRepository;

    @Mock
    private DailySerialRepository dailySerialRepository;

    @Mock
    private CommodityRepository commodityRepository;

    @Mock
    private ContactRepository contactRepository;

    @Mock
    private TraderContextService traderContextService;

    @InjectMocks
    private ArrivalService arrivalService;

    @BeforeEach
    void setUp() {
        when(traderContextService.getCurrentTraderId()).thenReturn(1L);
    }

    @Test
    void listArrivalsReturnsEmptyPageWhenNoVehicles() {
        Pageable pageable = PageRequest.of(0, 20);
        when(vehicleRepository.findAllByTraderIdOrderByArrivalDatetimeDesc(anyLong(), any(Pageable.class)))
            .thenReturn(Page.empty(pageable));

        Page<?> page = arrivalService.listArrivals(pageable);

        assertThat(page.getTotalElements()).isZero();
        assertThat(page.getContent()).isEmpty();
    }

    @Test
    void listArrivalsAggregatesSummaryFields() {
        Pageable pageable = PageRequest.of(0, 20);

        Vehicle vehicle = new Vehicle();
        vehicle.setId(10L);
        vehicle.setTraderId(1L);
        vehicle.setVehicleNumber("KA01AB1234");
        vehicle.setArrivalDatetime(Instant.now());

        Page<Vehicle> vehiclePage = new PageImpl<>(List.of(vehicle), pageable, 1);
        when(vehicleRepository.findAllByTraderIdOrderByArrivalDatetimeDesc(anyLong(), any(Pageable.class)))
            .thenReturn(vehiclePage);

        VehicleWeight weight = new VehicleWeight();
        weight.setVehicleId(10L);
        weight.setNetWeight(1000.0);
        weight.setDeductedWeight(100.0);
        when(vehicleWeightRepository.findAllByVehicleIdIn(List.of(10L))).thenReturn(List.of(weight));

        FreightCalculation freight = new FreightCalculation();
        freight.setVehicleId(10L);
        freight.setMethod(FreightMethod.BY_WEIGHT);
        freight.setTotalAmount(500.0);
        when(freightCalculationRepository.findAllByVehicleIdIn(List.of(10L))).thenReturn(List.of(freight));

        SellerInVehicle s1 = new SellerInVehicle();
        s1.setId(1L);
        s1.setVehicleId(10L);
        SellerInVehicle s2 = new SellerInVehicle();
        s2.setId(2L);
        s2.setVehicleId(10L);
        when(sellerInVehicleRepository.findAllByVehicleIdIn(List.of(10L))).thenReturn(List.of(s1, s2));

        Lot l1 = new Lot();
        l1.setSellerVehicleId(1L);
        l1.setBagCount(5);
        Lot l2 = new Lot();
        l2.setSellerVehicleId(2L);
        l2.setBagCount(7);
        when(lotRepository.findAllBySellerVehicleIdIn(List.of(1L, 2L))).thenReturn(List.of(l1, l2));

        Page<?> result = arrivalService.listArrivals(pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent()).hasSize(1);

        var summary = (com.mercotrace.service.dto.ArrivalDTOs.ArrivalSummaryDTO) result.getContent().get(0);
        assertThat(summary.getVehicleId()).isEqualTo(10L);
        assertThat(summary.getVehicleNumber()).isEqualTo("KA01AB1234");
        assertThat(summary.getSellerCount()).isEqualTo(2);
        assertThat(summary.getLotCount()).isEqualTo(2);
        assertThat(summary.getNetWeight()).isEqualTo(1000.0);
        assertThat(summary.getFinalBillableWeight()).isEqualTo(900.0);
        assertThat(summary.getFreightTotal()).isEqualTo(500.0);
        assertThat(summary.getFreightMethod()).isEqualTo(FreightMethod.BY_WEIGHT);
        assertThat(summary.getArrivalDatetime()).isNotNull();
    }
}

