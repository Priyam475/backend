package com.mercotrace.service.impl;

import com.mercotrace.domain.ChartOfAccount;
import com.mercotrace.domain.Contact;
import com.mercotrace.domain.enumeration.VoucherLifecycleStatus;
import com.mercotrace.repository.ChartOfAccountRepository;
import com.mercotrace.repository.ContactRepository;
import com.mercotrace.repository.VoucherLineRepository;
import com.mercotrace.service.ChartOfAccountService;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.dto.ChartOfAccountCreateRequest;
import com.mercotrace.service.dto.ChartOfAccountDTO;
import com.mercotrace.service.dto.ChartOfAccountUpdateRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service implementation for Chart of Accounts. Maps classification -> accountingClass (frontend contract).
 */
@Service
@Transactional
public class ChartOfAccountServiceImpl implements ChartOfAccountService {

    /** Per-ledger cache by id (ChartOfAccountDTO). */
    public static final String CACHE_COA_BY_ID = "chartOfAccountsById";

    /** Paginated list cache by trader + filters (Page<ChartOfAccountDTO>). */
    public static final String CACHE_COA_PAGE_BY_TRADER = "chartOfAccountsPageByTrader";

    private static final Logger LOG = LoggerFactory.getLogger(ChartOfAccountServiceImpl.class);

    /** From frontend CLASSIFICATION_TO_CLASS. */
    private static final Map<String, String> CLASSIFICATION_TO_CLASS = new HashMap<>();
    static {
        CLASSIFICATION_TO_CLASS.put("RECEIVABLE", "ASSET");
        CLASSIFICATION_TO_CLASS.put("BANK", "ASSET");
        CLASSIFICATION_TO_CLASS.put("CASH", "ASSET");
        CLASSIFICATION_TO_CLASS.put("INVENTORY", "ASSET");
        CLASSIFICATION_TO_CLASS.put("TAX", "ASSET");
        CLASSIFICATION_TO_CLASS.put("CONTROL", "ASSET");
        CLASSIFICATION_TO_CLASS.put("PAYABLE", "LIABILITY");
        CLASSIFICATION_TO_CLASS.put("LOAN", "LIABILITY");
        CLASSIFICATION_TO_CLASS.put("INCOME", "INCOME");
        CLASSIFICATION_TO_CLASS.put("EXPENSE", "EXPENSE");
        CLASSIFICATION_TO_CLASS.put("EQUITY", "EQUITY");
    }

    private final ChartOfAccountRepository repository;
    private final VoucherLineRepository voucherLineRepository;
    private final ContactRepository contactRepository;
    private final TraderContextService traderContextService;
    private final ChartOfAccountArApControlSyncService arApControlSyncService;
    private final CacheManager cacheManager;

    public ChartOfAccountServiceImpl(
        ChartOfAccountRepository repository,
        VoucherLineRepository voucherLineRepository,
        ContactRepository contactRepository,
        TraderContextService traderContextService,
        ChartOfAccountArApControlSyncService arApControlSyncService,
        @Autowired(required = false) CacheManager cacheManager
    ) {
        this.repository = repository;
        this.voucherLineRepository = voucherLineRepository;
        this.contactRepository = contactRepository;
        this.traderContextService = traderContextService;
        this.arApControlSyncService = arApControlSyncService;
        this.cacheManager = cacheManager;
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(
        cacheNames = CACHE_COA_PAGE_BY_TRADER,
        keyGenerator = "chartOfAccountsPageKeyGenerator",
        unless = "#result == null || #result.empty"
    )
    public Page<ChartOfAccountDTO> getPage(Pageable pageable, String search, String accountingClass, String classification) {
        Long traderId = traderContextService.getCurrentTraderId();
        String s = (search != null && !search.isBlank()) ? search.trim() : null;
        String ac = (accountingClass != null && !accountingClass.isBlank()) ? accountingClass.trim() : null;
        String cl = (classification != null && !classification.isBlank()) ? classification.trim() : null;
        return repository.findAllByTraderIdAndFilters(traderId, s, ac, cl, pageable).map(this::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CACHE_COA_BY_ID, key = "#id", unless = "#result == null")
    public ChartOfAccountDTO getById(Long id) {
        Long traderId = traderContextService.getCurrentTraderId();
        ChartOfAccount entity = repository.findOneByTraderIdAndId(traderId, id)
            .orElseThrow(() -> new IllegalArgumentException("Chart of account not found: " + id));
        return toDto(entity);
    }

    @Override
    @Caching(
        put = {
            @CachePut(cacheNames = CACHE_COA_BY_ID, key = "#result.id")
        },
        evict = {
            @CacheEvict(cacheNames = CACHE_COA_PAGE_BY_TRADER, allEntries = true)
        }
    )
    public ChartOfAccountDTO create(ChartOfAccountCreateRequest request) {
        Long traderId = traderContextService.getCurrentTraderId();
        String name = request.getLedgerName().trim();
        if (repository.findOneByTraderIdAndLedgerNameIgnoreCase(traderId, name).isPresent()) {
            throw new IllegalArgumentException("A ledger with this name already exists");
        }
        String classification = request.getClassification().trim();
        String accountingClass = CLASSIFICATION_TO_CLASS.getOrDefault(classification, "ASSET");

        ChartOfAccount entity = new ChartOfAccount();
        entity.setTraderId(traderId);
        entity.setLedgerName(name);
        entity.setAccountingClass(accountingClass);
        entity.setClassification(classification);
        entity.setParentControlId(request.getParentControlId());
        entity.setContactId(request.getContactId());
        entity.setSystem(false);
        entity.setLocked(false);
        BigDecimal ob = request.getOpeningBalance() != null ? request.getOpeningBalance() : BigDecimal.ZERO;
        entity.setOpeningBalance(ob);
        entity.setCurrentBalance(ob);
        entity = repository.save(entity);
        LOG.debug("Created chart of account: id={}, ledgerName={}", entity.getId(), entity.getLedgerName());
        Set<Long> controlIds = arApControlSyncService.syncControlBalancesFromSubledgers(traderId);
        evictCoaCachesForControlSync(controlIds);
        return toDto(entity);
    }

    @Override
    @Caching(
        put = {
            @CachePut(cacheNames = CACHE_COA_BY_ID, key = "#id")
        },
        evict = {
            @CacheEvict(cacheNames = CACHE_COA_PAGE_BY_TRADER, allEntries = true)
        }
    )
    public ChartOfAccountDTO update(Long id, ChartOfAccountUpdateRequest request) {
        Long traderId = traderContextService.getCurrentTraderId();
        ChartOfAccount entity = repository.findOneByTraderIdAndId(traderId, id)
            .orElseThrow(() -> new IllegalArgumentException("Chart of account not found: " + id));
        if (Boolean.TRUE.equals(entity.getSystem())) {
            throw new IllegalArgumentException("System ledgers cannot be updated");
        }
        String name = request.getLedgerName().trim();
        repository.findOneByTraderIdAndLedgerNameIgnoreCase(traderId, name).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new IllegalArgumentException("A ledger with this name already exists");
            }
        });
        String classification = request.getClassification().trim();
        String accountingClass = CLASSIFICATION_TO_CLASS.getOrDefault(classification, entity.getAccountingClass());

        entity.setLedgerName(name);
        entity.setAccountingClass(accountingClass);
        entity.setClassification(classification);
        entity.setParentControlId(request.getParentControlId());
        entity.setContactId(request.getContactId());
        if (request.getOpeningBalance() != null) entity.setOpeningBalance(request.getOpeningBalance());
        if (request.getCurrentBalance() != null) entity.setCurrentBalance(request.getCurrentBalance());
        if (request.getLocked() != null) entity.setLocked(request.getLocked());
        entity = repository.save(entity);
        Set<Long> controlIds = arApControlSyncService.syncControlBalancesFromSubledgers(traderId);
        evictCoaCachesForControlSync(controlIds);
        return toDto(entity);
    }

    @Override
    @Caching(
        evict = {
            @CacheEvict(cacheNames = CACHE_COA_BY_ID, key = "#id"),
            @CacheEvict(cacheNames = CACHE_COA_PAGE_BY_TRADER, allEntries = true)
        }
    )
    public void delete(Long id) {
        Long traderId = traderContextService.getCurrentTraderId();
        ChartOfAccount entity = repository.findOneByTraderIdAndId(traderId, id)
            .orElseThrow(() -> new IllegalArgumentException("Chart of account not found: " + id));
        if (Boolean.TRUE.equals(entity.getSystem())) {
            throw new IllegalArgumentException("System ledgers cannot be deleted");
        }
        repository.delete(entity);
        LOG.debug("Deleted chart of account: id={}", id);
        Set<Long> controlIds = arApControlSyncService.syncControlBalancesFromSubledgers(traderId);
        evictCoaCachesForControlSync(controlIds);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getOpeningBalance(Long ledgerId, LocalDate asOfDate) {
        Long traderId = traderContextService.getCurrentTraderId();
        ChartOfAccount ledger = repository.findOneByTraderIdAndId(traderId, ledgerId)
            .orElseThrow(() -> new IllegalArgumentException("Chart of account not found: " + ledgerId));

        if (asOfDate == null) {
            return ledger.getOpeningBalance() != null ? ledger.getOpeningBalance() : BigDecimal.ZERO;
        }

        BigDecimal storedOpening = ledger.getOpeningBalance() != null ? ledger.getOpeningBalance() : BigDecimal.ZERO;
        BigDecimal sum = voucherLineRepository.sumDebitMinusCreditByLedgerIdAndVoucherDateBefore(
            traderId, ledgerId, asOfDate, VoucherLifecycleStatus.REVERSED
        );
        if (sum == null) sum = BigDecimal.ZERO;

        String ac = ledger.getAccountingClass();
        if ("ASSET".equals(ac) || "EXPENSE".equals(ac)) {
            return storedOpening.add(sum);
        }
        return storedOpening.subtract(sum);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChartOfAccountDTO> getLedgersByContactId(Long contactId) {
        Long traderId = traderContextService.getCurrentTraderId();
        Contact contact = contactRepository
            .findById(contactId)
            .orElseThrow(() -> new IllegalArgumentException("Contact not found or access denied: " + contactId));
        if (contact.getTraderId() != null && !Objects.equals(contact.getTraderId(), traderId)) {
            throw new IllegalArgumentException("Contact not found or access denied: " + contactId);
        }
        return repository.findAllByTraderIdAndContactId(traderId, contactId)
            .stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    private void evictCoaCachesForControlSync(Set<Long> controlLedgerIds) {
        if (cacheManager == null) {
            return;
        }
        Cache page = cacheManager.getCache(CACHE_COA_PAGE_BY_TRADER);
        if (page != null) {
            page.clear();
        }
        Cache byId = cacheManager.getCache(CACHE_COA_BY_ID);
        if (byId != null) {
            for (Long ledgerId : controlLedgerIds) {
                if (ledgerId != null) {
                    byId.evict(ledgerId);
                }
            }
        }
    }

    private ChartOfAccountDTO toDto(ChartOfAccount e) {
        ChartOfAccountDTO d = new ChartOfAccountDTO();
        d.setId(e.getId());
        d.setTraderId(e.getTraderId());
        d.setLedgerName(e.getLedgerName());
        d.setAccountingClass(e.getAccountingClass());
        d.setClassification(e.getClassification());
        d.setParentControlId(e.getParentControlId());
        d.setContactId(e.getContactId());
        d.setSystem(e.getSystem());
        d.setLocked(e.getLocked());
        d.setOpeningBalance(e.getOpeningBalance());
        d.setCurrentBalance(e.getCurrentBalance());
        d.setCreatedAt(e.getCreatedDate());
        d.setCreatedBy(e.getCreatedBy());
        d.setLastModifiedBy(e.getLastModifiedBy());
        return d;
    }
}
