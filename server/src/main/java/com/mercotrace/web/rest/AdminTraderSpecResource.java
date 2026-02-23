package com.mercotrace.web.rest;

import com.mercotrace.domain.enumeration.ApprovalStatus;
import com.mercotrace.service.TraderQueryService;
import com.mercotrace.service.TraderService;
import com.mercotrace.service.criteria.TraderCriteria;
import com.mercotrace.service.dto.TraderDTO;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import tech.jhipster.web.util.PaginationUtil;
import tech.jhipster.web.util.ResponseUtil;

/**
 * Module 1 spec — admin trader paths: GET/PATCH /api/admin/traders, GET /api/admin/traders/{id}, PATCH /api/admin/traders/{id}/approve.
 */
@RestController
@RequestMapping("/api/admin/traders")
public class AdminTraderSpecResource {

    private final TraderService traderService;
    private final TraderQueryService traderQueryService;

    public AdminTraderSpecResource(TraderService traderService, TraderQueryService traderQueryService) {
        this.traderService = traderService;
        this.traderQueryService = traderQueryService;
    }

    /** Module 1 spec: GET /admin/traders — List all traders with approval status. */
    @GetMapping("")
    public ResponseEntity<List<TraderDTO>> listTraders(TraderCriteria criteria, Pageable pageable) {
        Page<TraderDTO> page = traderQueryService.findByCriteria(criteria, pageable);
        return ResponseEntity.ok().headers(PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page)).body(page.getContent());
    }

    /** Module 1 spec: GET /admin/traders/{id} — Get trader details. */
    @GetMapping("/{id}")
    public ResponseEntity<TraderDTO> getTrader(@PathVariable Long id) {
        return ResponseUtil.wrapOrNotFound(traderService.findOne(id));
    }

    /** Module 1 spec: PATCH /admin/traders/{id}/approve — Approve Trader (enables transactional features). */
    @PatchMapping("/{id}/approve")
    public ResponseEntity<TraderDTO> approveTrader(@PathVariable Long id) {
        return traderService
            .findOne(id)
            .map(dto -> {
                dto.setApprovalStatus(ApprovalStatus.APPROVED);
                return ResponseEntity.ok(traderService.update(dto));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
