package com.mercotrace.service;

import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Orchestrates permanent deletion of a trader and all related data.
 * Deletes in FK-safe order. Only allowed for inactive traders.
 */
@Service
public class TraderPermanentDeleteService {

    private static final Logger LOG = LoggerFactory.getLogger(TraderPermanentDeleteService.class);

    private final JdbcTemplate jdbcTemplate;
    private final com.mercotrace.repository.TraderRepository traderRepository;

    public TraderPermanentDeleteService(
        JdbcTemplate jdbcTemplate,
        com.mercotrace.repository.TraderRepository traderRepository
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.traderRepository = traderRepository;
    }

    /**
     * Permanently delete a trader and all associated data.
     * Only allowed when trader is inactive.
     *
     * @param traderId the trader id
     * @throws EntityNotFoundException if trader not found
     * @throws IllegalStateException   if trader is still active
     */
    @Transactional
    public void permanentDelete(Long traderId) {
        var trader = traderRepository.findById(traderId)
            .orElseThrow(() -> new EntityNotFoundException("Trader not found: " + traderId));
        if (Boolean.TRUE.equals(trader.getActive())) {
            throw new IllegalStateException("Cannot permanently delete an active trader. Deactivate first.");
        }

        LOG.info("Permanently deleting trader id={} and all related data", traderId);

        // Order: delete child tables before parents (respect FK constraints)
        // 1. user_role for roles belonging to this trader
        jdbcTemplate.update(
            "DELETE FROM user_role WHERE role_id IN (SELECT id FROM role WHERE trader_id = ?)",
            traderId
        );
        // 2. role (trader-scoped)
        jdbcTemplate.update("DELETE FROM role WHERE trader_id = ?", traderId);
        // 3. user_trader
        jdbcTemplate.update("DELETE FROM user_trader WHERE trader_id = ?", traderId);
        // 4. voucher_line (via voucher_header)
        jdbcTemplate.update(
            "DELETE FROM voucher_line WHERE voucher_header_id IN (SELECT id FROM voucher_header WHERE trader_id = ?)",
            traderId
        );
        // 5. voucher_header
        jdbcTemplate.update("DELETE FROM voucher_header WHERE trader_id = ?", traderId);
        // 6. cdn_items (via cdn)
        jdbcTemplate.update(
            "DELETE FROM cdn_items WHERE cdn_id IN (SELECT id FROM cdn WHERE trader_id = ?)",
            traderId
        );
        // 7. cdn_transfers
        jdbcTemplate.update(
            "DELETE FROM cdn_transfers WHERE sender_trader_id = ? OR receiver_trader_id = ?",
            traderId, traderId
        );
        // 8. cdn
        jdbcTemplate.update("DELETE FROM cdn WHERE trader_id = ?", traderId);
        // 9. chart_of_account
        jdbcTemplate.update("DELETE FROM chart_of_account WHERE trader_id = ?", traderId);
        // 10. ar_ap_document
        jdbcTemplate.update("DELETE FROM ar_ap_document WHERE trader_id = ?", traderId);
        // 11. sales_bill
        jdbcTemplate.update("DELETE FROM sales_bill WHERE trader_id = ?", traderId);
        // 12. stock_purchase_items, stock_purchase_charges (via stock_purchases)
        jdbcTemplate.update(
            "DELETE FROM stock_purchase_items WHERE purchase_id IN (SELECT id FROM stock_purchases WHERE trader_id = ?)",
            traderId
        );
        jdbcTemplate.update(
            "DELETE FROM stock_purchase_charges WHERE purchase_id IN (SELECT id FROM stock_purchases WHERE trader_id = ?)",
            traderId
        );
        // stock_purchases references voucher - may need to null out or delete voucher refs first
        jdbcTemplate.update("UPDATE stock_purchases SET voucher_id = NULL WHERE trader_id = ?", traderId);
        jdbcTemplate.update("DELETE FROM stock_purchases WHERE trader_id = ?", traderId);
        // 13. self_sale_closure
        jdbcTemplate.update("DELETE FROM self_sale_closure WHERE trader_id = ?", traderId);
        // 14. contact
        jdbcTemplate.update("DELETE FROM contact WHERE trader_id = ?", traderId);
        // 15. commodity (and configs - commodity_config, deduction_rule, hamali_slab, dynamic_charge)
        jdbcTemplate.update("DELETE FROM commodity_config WHERE commodity_id IN (SELECT id FROM commodity WHERE trader_id = ?)", traderId);
        jdbcTemplate.update("DELETE FROM deduction_rule WHERE commodity_id IN (SELECT id FROM commodity WHERE trader_id = ?)", traderId);
        jdbcTemplate.update("DELETE FROM hamali_slab WHERE commodity_id IN (SELECT id FROM commodity WHERE trader_id = ?)", traderId);
        jdbcTemplate.update("DELETE FROM dynamic_charge WHERE commodity_id IN (SELECT id FROM commodity WHERE trader_id = ?)", traderId);
        jdbcTemplate.update("DELETE FROM commodity WHERE trader_id = ?", traderId);
        // 16. vehicle cascade: lot -> auction_entry, auction, seller_in_vehicle, vehicle_weight, freight_*, voucher
        List<Long> vehicleIds = jdbcTemplate.query(
            "SELECT id FROM vehicle WHERE trader_id = ?",
            (rs, rowNum) -> rs.getLong("id"),
            traderId
        );
        for (Long vid : vehicleIds) {
            jdbcTemplate.update("DELETE FROM auction_entry WHERE auction_id IN (SELECT id FROM auction WHERE lot_id IN (SELECT id FROM lot WHERE seller_vehicle_id IN (SELECT id FROM seller_in_vehicle WHERE vehicle_id = ?)))", vid);
            jdbcTemplate.update("DELETE FROM auction WHERE lot_id IN (SELECT id FROM lot WHERE seller_vehicle_id IN (SELECT id FROM seller_in_vehicle WHERE vehicle_id = ?))", vid);
            jdbcTemplate.update("DELETE FROM lot WHERE seller_vehicle_id IN (SELECT id FROM seller_in_vehicle WHERE vehicle_id = ?)", vid);
            jdbcTemplate.update("DELETE FROM freight_distribution WHERE freight_id IN (SELECT id FROM freight_calculation WHERE vehicle_id = ?)", vid);
            jdbcTemplate.update("DELETE FROM freight_calculation WHERE vehicle_id = ?", vid);
            jdbcTemplate.update("DELETE FROM voucher WHERE reference_type IN ('FREIGHT','ADVANCE','COOLIE') AND reference_id = ?", vid);
            jdbcTemplate.update("DELETE FROM vehicle_weight WHERE vehicle_id = ?", vid);
            jdbcTemplate.update("DELETE FROM seller_in_vehicle WHERE vehicle_id = ?", vid);
        }
        jdbcTemplate.update("DELETE FROM vehicle WHERE trader_id = ?", traderId);
        // 17. Other trader-scoped tables
        jdbcTemplate.update("DELETE FROM preset_mark_setting WHERE trader_id = ?", traderId);
        jdbcTemplate.update("DELETE FROM daily_serial_allocation WHERE trader_id = ?", traderId);
        jdbcTemplate.update("DELETE FROM sales_patti WHERE trader_id = ?", traderId);
        jdbcTemplate.update("DELETE FROM weighing_session WHERE trader_id = ?", traderId);
        jdbcTemplate.update("DELETE FROM print_log WHERE trader_id = ?", traderId);
        jdbcTemplate.update("DELETE FROM writer_pad_session WHERE trader_id = ?", traderId);
        jdbcTemplate.update("DELETE FROM daily_serial WHERE trader_id = ?", traderId);
        // auction, writers_pad_session reference lots; lot is deleted above - need to delete writer_pad_session by trader
        // auction references lot - lots deleted above; auction lot_id may be nullable
        jdbcTemplate.update("DELETE FROM auction WHERE trader_id = ?", traderId);
        jdbcTemplate.update("DELETE FROM dynamic_charge WHERE trader_id = ?", traderId);

        // 18. trader
        traderRepository.deleteById(traderId);
        LOG.info("Trader id={} permanently deleted", traderId);
    }
}
