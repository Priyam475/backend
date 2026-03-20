package com.mercotrace.web.rest;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mercotrace.IntegrationTest;
import com.mercotrace.domain.ChartOfAccount;
import com.mercotrace.domain.VoucherHeader;
import com.mercotrace.repository.ChartOfAccountRepository;
import com.mercotrace.repository.VoucherHeaderRepository;
import com.mercotrace.service.dto.ChartOfAccountCreateRequest;
import com.mercotrace.service.dto.VoucherHeaderCreateRequest;
import com.mercotrace.service.dto.VoucherLineCreateDTO;
import com.mercotrace.domain.enumeration.VoucherType;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Integration tests for {@link VoucherHeaderResource}. Uses trader 101 (DefaultTraderContextServiceImpl).
 */
@IntegrationTest
@AutoConfigureMockMvc
@WithMockUser
class VoucherHeaderResourceIT {

    private static final String BASE_URL = "/api/voucher-headers";

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MockMvc restVoucherHeaderMockMvc;

    @Autowired
    private VoucherHeaderRepository voucherHeaderRepository;

    @Autowired
    private ChartOfAccountRepository chartOfAccountRepository;

    private ChartOfAccount ledger1;
    private ChartOfAccount ledger2;

    @BeforeEach
    @Transactional
    void createLedgers() {
        if (ledger1 != null) return;
        ledger1 = new ChartOfAccount();
        ledger1.setTraderId(101L);
        ledger1.setLedgerName("IT Voucher Ledger A");
        ledger1.setAccountingClass("ASSET");
        ledger1.setClassification("BANK");
        ledger1.setSystem(false);
        ledger1.setLocked(false);
        ledger1.setOpeningBalance(BigDecimal.ZERO);
        ledger1.setCurrentBalance(BigDecimal.ZERO);
        ledger1.setCreatedBy("test");
        ledger1.setLastModifiedBy("test");
        ledger1 = chartOfAccountRepository.save(ledger1);

        ledger2 = new ChartOfAccount();
        ledger2.setTraderId(101L);
        ledger2.setLedgerName("IT Voucher Ledger B");
        ledger2.setAccountingClass("ASSET");
        ledger2.setClassification("CASH");
        ledger2.setSystem(false);
        ledger2.setLocked(false);
        ledger2.setOpeningBalance(BigDecimal.ZERO);
        ledger2.setCurrentBalance(BigDecimal.ZERO);
        ledger2.setCreatedBy("test");
        ledger2.setLastModifiedBy("test");
        ledger2 = chartOfAccountRepository.save(ledger2);
    }

    @Test
    @Transactional
    void getPageReturnsPaginatedList() throws Exception {
        restVoucherHeaderMockMvc
            .perform(get(BASE_URL + "?page=0&size=20&sort=createdDate,desc"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(header().exists("X-Total-Count"))
            .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @Transactional
    void createVoucherReturns201() throws Exception {
        VoucherLineCreateDTO line1 = new VoucherLineCreateDTO();
        line1.setLedgerId(ledger1.getId());
        line1.setDebit(new BigDecimal("100.00"));
        line1.setCredit(BigDecimal.ZERO);

        VoucherLineCreateDTO line2 = new VoucherLineCreateDTO();
        line2.setLedgerId(ledger2.getId());
        line2.setDebit(BigDecimal.ZERO);
        line2.setCredit(new BigDecimal("100.00"));

        VoucherHeaderCreateRequest request = new VoucherHeaderCreateRequest();
        request.setVoucherType(VoucherType.JOURNAL);
        request.setNarration("IT test voucher");
        request.setLines(List.of(line1, line2));

        restVoucherHeaderMockMvc
            .perform(post(BASE_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(header().string("Location", containsString(BASE_URL + "/")))
            .andExpect(jsonPath("$.voucherId").isNotEmpty())
            .andExpect(jsonPath("$.voucherNumber").value(containsString("VP/JV/")))
            .andExpect(jsonPath("$.narration").value("IT test voucher"))
            .andExpect(jsonPath("$.status").value("DRAFT"))
            .andExpect(jsonPath("$.totalDebit").value(100))
            .andExpect(jsonPath("$.totalCredit").value(100))
            .andExpect(jsonPath("$.lines").isArray())
            .andExpect(jsonPath("$.lines.length()").value(2));
    }

    @Test
    @Transactional
    void getByIdReturnsVoucherWithLines() throws Exception {
        VoucherHeader header = new VoucherHeader();
        header.setTraderId(101L);
        header.setVoucherType(VoucherType.RECEIPT);
        header.setVoucherNumber("VP/RV/001");
        header.setVoucherDate(java.time.LocalDate.now());
        header.setNarration("IT get test");
        header.setStatus(com.mercotrace.domain.enumeration.VoucherLifecycleStatus.DRAFT);
        header.setTotalDebit(new BigDecimal("50.00"));
        header.setTotalCredit(new BigDecimal("50.00"));
        header.setIsMigrated(false);
        header.setCreatedBy("test");
        header.setLastModifiedBy("test");
        header = voucherHeaderRepository.save(header);

        restVoucherHeaderMockMvc
            .perform(get(BASE_URL + "/" + header.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.voucherId").value(header.getId().toString()))
            .andExpect(jsonPath("$.voucherNumber").value("VP/RV/001"))
            .andExpect(jsonPath("$.narration").value("IT get test"))
            .andExpect(jsonPath("$.lines").isArray());
    }

    @Test
    @Transactional
    void postThenReverseSucceeds() throws Exception {
        VoucherLineCreateDTO line1 = new VoucherLineCreateDTO();
        line1.setLedgerId(ledger1.getId());
        line1.setDebit(new BigDecimal("25.00"));
        line1.setCredit(BigDecimal.ZERO);

        VoucherLineCreateDTO line2 = new VoucherLineCreateDTO();
        line2.setLedgerId(ledger2.getId());
        line2.setDebit(BigDecimal.ZERO);
        line2.setCredit(new BigDecimal("25.00"));

        VoucherHeaderCreateRequest request = new VoucherHeaderCreateRequest();
        request.setVoucherType(VoucherType.CONTRA);
        request.setNarration("IT post reverse test");
        request.setLines(List.of(line1, line2));

        String createBody = restVoucherHeaderMockMvc
            .perform(post(BASE_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();

        String voucherId = objectMapper.readTree(createBody).get("voucherId").asText();

        restVoucherHeaderMockMvc
            .perform(post(BASE_URL + "/" + voucherId + "/post"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("POSTED"))
            .andExpect(jsonPath("$.postedAt").isNotEmpty());

        restVoucherHeaderMockMvc
            .perform(post(BASE_URL + "/" + voucherId + "/reverse"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("REVERSED"))
            .andExpect(jsonPath("$.reversedAt").isNotEmpty());
    }
}
