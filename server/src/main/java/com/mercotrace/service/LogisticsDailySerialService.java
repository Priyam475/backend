package com.mercotrace.service;

import com.mercotrace.domain.DailySerialAllocation;
import com.mercotrace.repository.DailySerialAllocationRepository;
import java.time.LocalDate;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Allocates and returns daily serials for Logistics (PrintHub): stable seller serial and lot number
 * per trader per date (REQ-LOG-001, REQ-LOG-002). No localStorage; all persisted on server.
 */
@Service
public class LogisticsDailySerialService {

    private static final String KEY_TYPE_SELLER = "SELLER";
    private static final String KEY_TYPE_LOT = "LOT";

    private final DailySerialAllocationRepository repository;
    private final TraderContextService traderContextService;

    public LogisticsDailySerialService(
        DailySerialAllocationRepository repository,
        TraderContextService traderContextService
    ) {
        this.repository = repository;
        this.traderContextService = traderContextService;
    }

    /**
     * Get or allocate daily serials for the given seller names and lot ids. Returns stable
     * mappings for the current trader and today's date. New keys get the next available number.
     */
    @Transactional
    public DailySerialsResponse allocate(List<String> sellerNames, List<String> lotIds) {
        Long traderId = traderContextService.getCurrentTraderId();
        LocalDate today = LocalDate.now();

        List<String> distinctSellers = sellerNames != null
            ? sellerNames.stream().filter(Objects::nonNull).map(String::trim).filter(s -> !s.isEmpty()).distinct().toList()
            : List.of();
        List<String> distinctLots = lotIds != null
            ? lotIds.stream().filter(Objects::nonNull).map(String::trim).filter(s -> !s.isEmpty()).distinct().toList()
            : List.of();

        Map<String, Integer> sellerSerials = new HashMap<>();
        Map<String, Integer> lotNumbers = new HashMap<>();

        List<DailySerialAllocation> existingSellers = repository.findAllByTraderIdAndSerialDateAndKeyType(
            traderId, today, KEY_TYPE_SELLER
        );
        Map<String, Integer> existingSellerMap = new HashMap<>();
        for (DailySerialAllocation a : existingSellers) {
            existingSellerMap.put(a.getKeyValue(), a.getSerialNumber());
        }
        int nextSeller = existingSellerMap.isEmpty()
            ? 1
            : existingSellerMap.values().stream().max(Integer::compareTo).orElse(0) + 1;
        for (String name : distinctSellers) {
            if (existingSellerMap.containsKey(name)) {
                sellerSerials.put(name, existingSellerMap.get(name));
            } else {
                int serial = nextSeller++;
                sellerSerials.put(name, serial);
                existingSellerMap.put(name, serial);
                DailySerialAllocation alloc = new DailySerialAllocation();
                alloc.setTraderId(traderId);
                alloc.setSerialDate(today);
                alloc.setKeyType(KEY_TYPE_SELLER);
                alloc.setKeyValue(name);
                alloc.setSerialNumber(serial);
                repository.save(alloc);
            }
        }

        List<DailySerialAllocation> existingLots = repository.findAllByTraderIdAndSerialDateAndKeyType(
            traderId, today, KEY_TYPE_LOT
        );
        Map<String, Integer> existingLotMap = new HashMap<>();
        for (DailySerialAllocation a : existingLots) {
            existingLotMap.put(a.getKeyValue(), a.getSerialNumber());
        }
        int nextLot = existingLotMap.isEmpty()
            ? 1
            : existingLotMap.values().stream().max(Integer::compareTo).orElse(0) + 1;
        for (String id : distinctLots) {
            if (existingLotMap.containsKey(id)) {
                lotNumbers.put(id, existingLotMap.get(id));
            } else {
                int serial = nextLot++;
                lotNumbers.put(id, serial);
                existingLotMap.put(id, serial);
                DailySerialAllocation alloc = new DailySerialAllocation();
                alloc.setTraderId(traderId);
                alloc.setSerialDate(today);
                alloc.setKeyType(KEY_TYPE_LOT);
                alloc.setKeyValue(id);
                alloc.setSerialNumber(serial);
                repository.save(alloc);
            }
        }

        return new DailySerialsResponse(sellerSerials, lotNumbers);
    }

    public static class DailySerialsResponse {
        private final Map<String, Integer> sellerSerials;
        private final Map<String, Integer> lotNumbers;

        public DailySerialsResponse(Map<String, Integer> sellerSerials, Map<String, Integer> lotNumbers) {
            this.sellerSerials = sellerSerials != null ? sellerSerials : Map.of();
            this.lotNumbers = lotNumbers != null ? lotNumbers : Map.of();
        }

        public Map<String, Integer> getSellerSerials() {
            return sellerSerials;
        }

        public Map<String, Integer> getLotNumbers() {
            return lotNumbers;
        }
    }
}
