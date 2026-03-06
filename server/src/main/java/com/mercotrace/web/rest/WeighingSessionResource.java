package com.mercotrace.web.rest;

import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.service.WeighingSessionService;
import com.mercotrace.service.dto.WeighingSessionCreateRequest;
import com.mercotrace.service.dto.WeighingSessionDTO;
import jakarta.validation.Valid;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import tech.jhipster.web.util.PaginationUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * REST controller for weighing sessions (post-auction).
 * Base path: /api/weighing-sessions. Aligned with WeighingPage.tsx.
 */
@RestController
@RequestMapping("/api/weighing-sessions")
@Tag(name = "Weighing Sessions", description = "Post-auction weighing sessions")
public class WeighingSessionResource {

    private static final Logger LOG = LoggerFactory.getLogger(WeighingSessionResource.class);

    private final WeighingSessionService weighingSessionService;

    public WeighingSessionResource(WeighingSessionService weighingSessionService) {
        this.weighingSessionService = weighingSessionService;
    }

    @PostMapping
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.WEIGHING_CREATE + "\")")
    @Operation(summary = "Create weighing session", description = "Save completed weighing session from frontend")
    public ResponseEntity<WeighingSessionDTO> create(@Valid @RequestBody WeighingSessionCreateRequest request) {
        LOG.debug("REST request to create WeighingSession for bid {}", request.getBidNumber());
        WeighingSessionDTO dto = weighingSessionService.create(request);
        return ResponseEntity.ok(dto);
    }

    @GetMapping
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.WEIGHING_VIEW + "\")")
    @Operation(summary = "List sessions", description = "Paginated list of weighing sessions for current trader")
    public ResponseEntity<List<WeighingSessionDTO>> list(
        @org.springdoc.core.annotations.ParameterObject Pageable pageable
    ) {
        LOG.debug("REST request to get WeighingSession page: {}", pageable);
        Page<WeighingSessionDTO> page = weighingSessionService.list(pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.WEIGHING_VIEW + "\")")
    @Operation(summary = "Get session by id")
    public ResponseEntity<WeighingSessionDTO> getById(@PathVariable Long id) {
        return weighingSessionService.getById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-bid/{bidNumber}")
    @PreAuthorize("hasAuthority(\"" + AuthoritiesConstants.WEIGHING_VIEW + "\")")
    @Operation(summary = "Get session by bid number")
    public ResponseEntity<WeighingSessionDTO> getByBidNumber(@PathVariable Integer bidNumber) {
        return weighingSessionService.getByBidNumber(bidNumber)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
