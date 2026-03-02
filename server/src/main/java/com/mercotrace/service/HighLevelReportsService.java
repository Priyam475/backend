package com.mercotrace.service;

import com.mercotrace.service.dto.AdminDailySummaryDTO;
import com.mercotrace.service.dto.DailySalesSummaryDTO;
import com.mercotrace.service.dto.PartyExposureRowDTO;
import java.time.LocalDate;
import java.util.List;

/**
 * High-level business analytics service (daily sales, party exposure, admin metrics).
 */
public interface HighLevelReportsService {

    DailySalesSummaryDTO getDailySalesSummary(LocalDate dateFrom, LocalDate dateTo);

    List<PartyExposureRowDTO> getPartyExposure(LocalDate dateFrom, LocalDate dateTo);

    AdminDailySummaryDTO getAdminDailySummary(LocalDate dateFrom, LocalDate dateTo);
}

