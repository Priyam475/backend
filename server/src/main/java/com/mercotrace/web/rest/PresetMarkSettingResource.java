package com.mercotrace.web.rest;

import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.service.PresetMarkSettingService;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.dto.PresetMarkSettingDTO;
import com.mercotrace.web.rest.errors.BadRequestAlertException;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import tech.jhipster.web.util.HeaderUtil;

/**
 * REST controller for Preset Mark Settings (Auction margin presets).
 * Trader-scoped; base path /api/trader/preset-marks.
 * <p>
 * Security: All endpoints require authentication (enforced by SecurityConfiguration for /api/trader/**).
 * Access is restricted by Preset Settings or Auctions authorities:
 * <ul>
 *   <li>List: PRESET_SETTINGS_VIEW (manage page) or AUCTIONS_VIEW (auction page) or trader owner</li>
 *   <li>Create/Update/Delete: PRESET_SETTINGS_CREATE, PRESET_SETTINGS_EDIT, PRESET_SETTINGS_DELETE or trader owner</li>
 * </ul>
 * Trader owners always have full access (no RBAC); trader users (staff) require the above role permissions.
 */
@RestController
@RequestMapping("/api/trader/preset-marks")
public class PresetMarkSettingResource {

    private static final Logger LOG = LoggerFactory.getLogger(PresetMarkSettingResource.class);
    private static final String ENTITY_NAME = "presetMarkSetting";

    private final PresetMarkSettingService presetMarkSettingService;
    private final TraderContextService traderContextService;

    public PresetMarkSettingResource(
        PresetMarkSettingService presetMarkSettingService,
        TraderContextService traderContextService
    ) {
        this.presetMarkSettingService = presetMarkSettingService;
        this.traderContextService = traderContextService;
    }

    @GetMapping
    @PreAuthorize("@traderOwnerAccess.isCurrentUserTraderOwner() or hasAnyAuthority(\"" + AuthoritiesConstants.PRESET_SETTINGS_VIEW + "\", \"" + AuthoritiesConstants.AUCTIONS_VIEW + "\")")
    public ResponseEntity<List<PresetMarkSettingDTO>> list() {
        Long traderId = traderContextService.getCurrentTraderId();
        List<PresetMarkSettingDTO> list = presetMarkSettingService.findAllByTrader(traderId);
        return ResponseEntity.ok(list);
    }

    @PostMapping
    @PreAuthorize("@traderOwnerAccess.isCurrentUserTraderOwner() or hasAuthority(\"" + AuthoritiesConstants.PRESET_SETTINGS_CREATE + "\")")
    public ResponseEntity<PresetMarkSettingDTO> create(@Valid @RequestBody PresetMarkSettingDTO dto) {
        Long traderId = traderContextService.getCurrentTraderId();
        if (dto.getId() != null) {
            throw new BadRequestAlertException("A new preset must not have an id", ENTITY_NAME, "idexists");
        }
        PresetMarkSettingDTO created = presetMarkSettingService.create(traderId, dto);
        return ResponseEntity.created(URI.create("/api/trader/preset-marks/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@traderOwnerAccess.isCurrentUserTraderOwner() or hasAuthority(\"" + AuthoritiesConstants.PRESET_SETTINGS_EDIT + "\")")
    public ResponseEntity<PresetMarkSettingDTO> update(
        @PathVariable Long id,
        @Valid @RequestBody PresetMarkSettingDTO dto
    ) {
        Long traderId = traderContextService.getCurrentTraderId();
        PresetMarkSettingDTO updated = presetMarkSettingService.update(traderId, id, dto);
        return ResponseEntity.ok()
            .headers(HeaderUtil.createEntityUpdateAlert("Merco", false, ENTITY_NAME, id.toString()))
            .body(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@traderOwnerAccess.isCurrentUserTraderOwner() or hasAuthority(\"" + AuthoritiesConstants.PRESET_SETTINGS_DELETE + "\")")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long traderId = traderContextService.getCurrentTraderId();
        presetMarkSettingService.delete(traderId, id);
        return ResponseEntity.noContent().build();
    }
}
