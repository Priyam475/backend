package com.mercotrace.repository;

import com.mercotrace.domain.VoucherLine;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * JPA repository for voucher lines (ledger debit/credit lines).
 */
@Repository
public interface VoucherLineRepository extends JpaRepository<VoucherLine, Long> {

    List<VoucherLine> findAllByVoucherHeaderIdOrderById(Long voucherHeaderId);
}
