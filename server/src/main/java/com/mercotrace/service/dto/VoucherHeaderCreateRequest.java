package com.mercotrace.service.dto;

import com.mercotrace.domain.enumeration.VoucherType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.io.Serializable;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Request body for creating an accounting voucher (DRAFT). */
public class VoucherHeaderCreateRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    @NotNull
    private VoucherType voucherType;

    @NotBlank(message = "Narration is required")
    private String narration;

    private LocalDate voucherDate;

    @Valid
    @NotEmpty(message = "At least one line is required")
    private List<VoucherLineCreateDTO> lines = new ArrayList<>();

    public VoucherType getVoucherType() { return voucherType; }
    public void setVoucherType(VoucherType voucherType) { this.voucherType = voucherType; }
    public String getNarration() { return narration; }
    public void setNarration(String narration) { this.narration = narration; }
    public LocalDate getVoucherDate() { return voucherDate; }
    public void setVoucherDate(LocalDate voucherDate) { this.voucherDate = voucherDate; }
    public List<VoucherLineCreateDTO> getLines() { return lines; }
    public void setLines(List<VoucherLineCreateDTO> lines) { this.lines = lines != null ? lines : new ArrayList<>(); }
}
