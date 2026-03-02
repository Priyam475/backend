package com.mercotrace.service;

import com.mercotrace.domain.enumeration.VoucherLifecycleStatus;
import com.mercotrace.domain.enumeration.VoucherType;
import com.mercotrace.service.dto.VoucherHeaderCreateRequest;
import com.mercotrace.service.dto.VoucherHeaderDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/** Service for accounting voucher headers (create, list, get, post, reverse). */
public interface VoucherHeaderService {

    Page<VoucherHeaderDTO> getPage(Pageable pageable, VoucherType voucherType, VoucherLifecycleStatus status, String search);
    VoucherHeaderDTO getById(Long id);
    VoucherHeaderDTO create(VoucherHeaderCreateRequest request);
    VoucherHeaderDTO post(Long id);
    VoucherHeaderDTO reverse(Long id);
}
