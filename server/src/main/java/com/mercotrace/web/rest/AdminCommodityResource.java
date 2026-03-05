package com.mercotrace.web.rest;

import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.service.CommodityService;
import com.mercotrace.service.dto.CommodityDTO;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin-only view of all commodities across traders.
 */
@RestController
@RequestMapping("/api/admin/commodities")
@PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.ADMIN + "\")")
public class AdminCommodityResource {

    private final CommodityService commodityService;

    public AdminCommodityResource(CommodityService commodityService) {
        this.commodityService = commodityService;
    }

    /**
     * {@code GET /api/admin/commodities} : list all commodities for admin overview.
     *
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the list of commodities in body.
     */
    @GetMapping("")
    public ResponseEntity<List<CommodityDTO>> listAllForAdmin() {
        List<CommodityDTO> list = commodityService.findAll();
        return ResponseEntity.ok().body(list);
    }
}

