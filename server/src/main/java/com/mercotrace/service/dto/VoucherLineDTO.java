package com.mercotrace.service.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Objects;

/** DTO for voucher line (ledger, debit, credit). Aligned with frontend VoucherLine. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VoucherLineDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String lineId;
    private String voucherId;
    private String ledgerId;
    private String ledgerName;
    private BigDecimal debit;
    private BigDecimal credit;

    public String getLineId() { return lineId; }
    public void setLineId(String lineId) { this.lineId = lineId; }
    public String getVoucherId() { return voucherId; }
    public void setVoucherId(String voucherId) { this.voucherId = voucherId; }
    public String getLedgerId() { return ledgerId; }
    public void setLedgerId(String ledgerId) { this.ledgerId = ledgerId; }
    public String getLedgerName() { return ledgerName; }
    public void setLedgerName(String ledgerName) { this.ledgerName = ledgerName; }
    public BigDecimal getDebit() { return debit; }
    public void setDebit(BigDecimal debit) { this.debit = debit; }
    public BigDecimal getCredit() { return credit; }
    public void setCredit(BigDecimal credit) { this.credit = credit; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof VoucherLineDTO)) return false;
        VoucherLineDTO that = (VoucherLineDTO) o;
        return Objects.equals(lineId, that.lineId);
    }

    @Override
    public int hashCode() { return Objects.hash(lineId); }
}
