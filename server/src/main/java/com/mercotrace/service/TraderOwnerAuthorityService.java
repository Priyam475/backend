package com.mercotrace.service;

import com.mercotrace.domain.Authority;
import com.mercotrace.domain.User;
import com.mercotrace.repository.AuthorityRepository;
import com.mercotrace.repository.UserRepository;
import com.mercotrace.security.AuthoritiesConstants;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Central helper for assigning full trader-module authorities to trader owners.
 *
 * This service is intentionally idempotent: calling {@link #ensureTraderOwnerAuthorities(User)}
 * multiple times for the same user will not duplicate authorities.
 */
@Service
@Transactional
public class TraderOwnerAuthorityService {

    private static final Logger LOG = LoggerFactory.getLogger(TraderOwnerAuthorityService.class);

    private static final Set<String> TRADER_OWNER_AUTHORITY_NAMES = buildTraderOwnerAuthorityNames();

    private final AuthorityRepository authorityRepository;
    private final UserRepository userRepository;

    public TraderOwnerAuthorityService(AuthorityRepository authorityRepository, UserRepository userRepository) {
        this.authorityRepository = authorityRepository;
        this.userRepository = userRepository;
    }

    /**
     * Ensure that the given user has the full set of trader-module authorities required
     * for an OWNER, plus {@code ROLE_USER}. Does not grant any global admin authority.
     * <p>
     * This method is transactional and always works on a managed {@link User} with its
     * {@code authorities} collection initialized to avoid {@link org.hibernate.LazyInitializationException}.
     *
     * @param user the (possibly detached) JHipster {@link User} to upgrade
     */
    public void ensureTraderOwnerAuthorities(User user) {
        if (user == null) {
            return;
        }

        User target = user;

        if (user.getId() != null) {
            target = userRepository.findOneWithAuthoritiesById(user.getId()).orElse(user);
        }

        Set<Authority> currentAuthorities = target.getAuthorities();
        if (currentAuthorities == null) {
            currentAuthorities = new HashSet<>();
            target.setAuthorities(currentAuthorities);
        }

        Set<String> existingNames = currentAuthorities.stream().map(Authority::getName).collect(Collectors.toSet());
        Set<String> missingNames = TRADER_OWNER_AUTHORITY_NAMES
            .stream()
            .filter(name -> !existingNames.contains(name))
            .collect(Collectors.toSet());

        if (missingNames.isEmpty()) {
            return;
        }

        List<Authority> toAdd = authorityRepository.findAllById(missingNames);
        if (toAdd.isEmpty()) {
            LOG.warn(
                "No trader-owner authorities found in database for names {}. User {} will not be upgraded.",
                missingNames,
                target.getLogin()
            );
            return;
        }

        currentAuthorities.addAll(toAdd);
        userRepository.save(target);

        LOG.info("Upgraded user {} with trader-owner authorities: {}", target.getLogin(), missingNames);
    }

    private static Set<String> buildTraderOwnerAuthorityNames() {
        Set<String> names = new HashSet<>();
        // Base user role
        names.add(AuthoritiesConstants.USER);

        // Auctions / Sales module
        names.add(AuthoritiesConstants.AUCTIONS_VIEW);
        names.add(AuthoritiesConstants.AUCTIONS_CREATE);
        names.add(AuthoritiesConstants.AUCTIONS_EDIT);
        names.add(AuthoritiesConstants.AUCTIONS_DELETE);
        names.add(AuthoritiesConstants.AUCTIONS_APPROVE);

        // Writer's Pad module
        names.add(AuthoritiesConstants.WRITERS_PAD_VIEW);
        names.add(AuthoritiesConstants.WRITERS_PAD_CREATE);
        names.add(AuthoritiesConstants.WRITERS_PAD_EDIT);
        names.add(AuthoritiesConstants.WRITERS_PAD_DELETE);

        // Weighing module
        names.add(AuthoritiesConstants.WEIGHING_VIEW);
        names.add(AuthoritiesConstants.WEIGHING_CREATE);
        names.add(AuthoritiesConstants.WEIGHING_EDIT);
        names.add(AuthoritiesConstants.WEIGHING_DELETE);

        // Settlement (Puty) module
        names.add(AuthoritiesConstants.SETTLEMENTS_VIEW);
        names.add(AuthoritiesConstants.SETTLEMENTS_CREATE);
        names.add(AuthoritiesConstants.SETTLEMENTS_EDIT);
        names.add(AuthoritiesConstants.SETTLEMENTS_DELETE);
        names.add(AuthoritiesConstants.SETTLEMENTS_APPROVE);

        // Contacts module
        names.add(AuthoritiesConstants.CONTACTS_VIEW);
        names.add(AuthoritiesConstants.CONTACTS_CREATE);
        names.add(AuthoritiesConstants.CONTACTS_EDIT);
        names.add(AuthoritiesConstants.CONTACTS_DELETE);

        // Print logs / print hub module
        names.add(AuthoritiesConstants.PRINT_LOGS_VIEW);
        names.add(AuthoritiesConstants.PRINT_LOGS_CREATE);
        names.add(AuthoritiesConstants.PRINT_LOGS_EDIT);
        names.add(AuthoritiesConstants.PRINT_LOGS_DELETE);

        // Commodity Settings module
        names.add(AuthoritiesConstants.COMMODITY_SETTINGS_VIEW);
        names.add(AuthoritiesConstants.COMMODITY_SETTINGS_CREATE);
        names.add(AuthoritiesConstants.COMMODITY_SETTINGS_EDIT);
        names.add(AuthoritiesConstants.COMMODITY_SETTINGS_DELETE);
        names.add(AuthoritiesConstants.COMMODITY_SETTINGS_APPROVE);

        // Arrivals module
        names.add(AuthoritiesConstants.ARRIVALS_VIEW);
        names.add(AuthoritiesConstants.ARRIVALS_CREATE);
        names.add(AuthoritiesConstants.ARRIVALS_EDIT);
        names.add(AuthoritiesConstants.ARRIVALS_DELETE);
        names.add(AuthoritiesConstants.ARRIVALS_APPROVE);

        // Billing module
        names.add(AuthoritiesConstants.BILLING_VIEW);
        names.add(AuthoritiesConstants.BILLING_CREATE);
        names.add(AuthoritiesConstants.BILLING_EDIT);
        names.add(AuthoritiesConstants.BILLING_DELETE);
        names.add(AuthoritiesConstants.BILLING_APPROVE);

        // Self-Sale module
        names.add(AuthoritiesConstants.SELF_SALE_VIEW);
        names.add(AuthoritiesConstants.SELF_SALE_CREATE);
        names.add(AuthoritiesConstants.SELF_SALE_EDIT);
        names.add(AuthoritiesConstants.SELF_SALE_DELETE);
        names.add(AuthoritiesConstants.SELF_SALE_APPROVE);

        // Stock Purchase module
        names.add(AuthoritiesConstants.STOCK_PURCHASE_VIEW);
        names.add(AuthoritiesConstants.STOCK_PURCHASE_CREATE);
        names.add(AuthoritiesConstants.STOCK_PURCHASE_EDIT);
        names.add(AuthoritiesConstants.STOCK_PURCHASE_DELETE);
        names.add(AuthoritiesConstants.STOCK_PURCHASE_APPROVE);

        // CDN (Delivery Note) module
        names.add(AuthoritiesConstants.CDN_VIEW);
        names.add(AuthoritiesConstants.CDN_CREATE);
        names.add(AuthoritiesConstants.CDN_EDIT);
        names.add(AuthoritiesConstants.CDN_DELETE);
        names.add(AuthoritiesConstants.CDN_APPROVE);

        // Chart of Accounts module
        names.add(AuthoritiesConstants.CHART_OF_ACCOUNTS_VIEW);
        names.add(AuthoritiesConstants.CHART_OF_ACCOUNTS_CREATE);
        names.add(AuthoritiesConstants.CHART_OF_ACCOUNTS_EDIT);
        names.add(AuthoritiesConstants.CHART_OF_ACCOUNTS_DELETE);
        names.add(AuthoritiesConstants.CHART_OF_ACCOUNTS_APPROVE);

        // Vouchers & Payments module
        names.add(AuthoritiesConstants.VOUCHERS_VIEW);
        names.add(AuthoritiesConstants.VOUCHERS_CREATE);
        names.add(AuthoritiesConstants.VOUCHERS_EDIT);
        names.add(AuthoritiesConstants.VOUCHERS_DELETE);
        names.add(AuthoritiesConstants.VOUCHERS_APPROVE);

        // Financial Reports module (read-only)
        names.add(AuthoritiesConstants.FINANCIAL_REPORTS_VIEW);

        // Operational Reports module (read-only)
        names.add(AuthoritiesConstants.REPORTS_VIEW);

        // RBAC Settings module
        names.add(AuthoritiesConstants.RBAC_SETTINGS_VIEW);
        names.add(AuthoritiesConstants.RBAC_SETTINGS_CREATE);
        names.add(AuthoritiesConstants.RBAC_SETTINGS_EDIT);
        names.add(AuthoritiesConstants.RBAC_SETTINGS_DELETE);
        names.add(AuthoritiesConstants.RBAC_SETTINGS_APPROVE);

        // Print Templates module
        names.add(AuthoritiesConstants.PRINT_TEMPLATES_VIEW);
        names.add(AuthoritiesConstants.PRINT_TEMPLATES_CREATE);
        names.add(AuthoritiesConstants.PRINT_TEMPLATES_EDIT);
        names.add(AuthoritiesConstants.PRINT_TEMPLATES_DELETE);
        names.add(AuthoritiesConstants.PRINT_TEMPLATES_APPROVE);

        // Guard rail: DO NOT ever add ROLE_ADMIN or global admin-like authorities here.

        return names;
    }
}

