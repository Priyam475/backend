package com.mercotrace.repository;

import com.mercotrace.domain.Voucher;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VoucherRepository extends JpaRepository<Voucher, Long> {

    List<Voucher> findAllByTraderId(Long traderId);

    void deleteByReferenceTypeAndReferenceId(String referenceType, Long referenceId);
}

