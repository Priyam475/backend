package com.mercotrace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mercotrace.domain.Authority;
import com.mercotrace.domain.Trader;
import com.mercotrace.domain.User;
import com.mercotrace.domain.UserTrader;
import com.mercotrace.domain.enumeration.ApprovalStatus;
import com.mercotrace.repository.AuthorityRepository;
import com.mercotrace.repository.UserRepository;
import com.mercotrace.repository.UserTraderRepository;
import com.mercotrace.security.AuthoritiesConstants;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;

@ExtendWith(MockitoExtension.class)
class TraderOwnerAuthorityServiceTest {

    @Mock
    private AuthorityRepository authorityRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserTraderRepository userTraderRepository;

    @Mock
    private CacheManager cacheManager;

    @Mock
    private Cache usersByLoginCache;

    @Mock
    private Cache usersByEmailCache;

    @InjectMocks
    private TraderOwnerAuthorityService traderOwnerAuthorityService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setLogin("owner@example.com");
        user.setEmail("owner@example.com");
        user.setAuthorities(new HashSet<>());

        when(cacheManager.getCache(UserRepository.USERS_BY_LOGIN_CACHE)).thenReturn(usersByLoginCache);
        when(cacheManager.getCache(UserRepository.USERS_BY_EMAIL_CACHE)).thenReturn(usersByEmailCache);
    }

    @Test
    void ensureTraderOwnerAuthorities_forApprovedTrader_upgradesAuthoritiesAndClearsCaches() {
        // given approved trader mapping
        Trader trader = new Trader();
        trader.setId(10L);
        trader.setApprovalStatus(ApprovalStatus.APPROVED);

        UserTrader mapping = new UserTrader();
        mapping.setUser(user);
        mapping.setTrader(trader);

        when(userRepository.findOneWithAuthoritiesById(1L)).thenReturn(Optional.of(user));
        when(userTraderRepository.findFirstByUserIdAndPrimaryMappingTrueAndActiveTrue(1L)).thenReturn(Optional.of(mapping));

        // return at least USER authority plus another module authority so that there are missingNames
        Authority roleUser = new Authority();
        roleUser.setName(AuthoritiesConstants.USER);
        Authority roleContactsView = new Authority();
        roleContactsView.setName(AuthoritiesConstants.CONTACTS_VIEW);

        when(authorityRepository.findAllById(anyIterable())).thenReturn(List.of(roleUser, roleContactsView));

        // when
        traderOwnerAuthorityService.ensureTraderOwnerAuthorities(user);

        // then
        verify(userRepository).save(any(User.class));
        verify(usersByLoginCache).evictIfPresent("owner@example.com");
        verify(usersByEmailCache).evictIfPresent("owner@example.com");

        assertThat(user.getAuthorities()).extracting(Authority::getName).contains(AuthoritiesConstants.USER);
    }

    @Test
    void ensureTraderOwnerAuthorities_forUnapprovedTrader_ensuresRoleUserAndClearsCaches() {
        // given pending trader mapping
        Trader trader = new Trader();
        trader.setId(11L);
        trader.setApprovalStatus(ApprovalStatus.PENDING);

        UserTrader mapping = new UserTrader();
        mapping.setUser(user);
        mapping.setTrader(trader);

        when(userRepository.findOneWithAuthoritiesById(1L)).thenReturn(Optional.of(user));
        when(userTraderRepository.findFirstByUserIdAndPrimaryMappingTrueAndActiveTrue(1L)).thenReturn(Optional.of(mapping));

        Authority roleUser = new Authority();
        roleUser.setName(AuthoritiesConstants.USER);
        when(authorityRepository.findById(AuthoritiesConstants.USER)).thenReturn(Optional.of(roleUser));

        // when
        traderOwnerAuthorityService.ensureTraderOwnerAuthorities(user);

        // then
        verify(userRepository).save(any(User.class));
        verify(usersByLoginCache).evictIfPresent("owner@example.com");
        verify(usersByEmailCache).evictIfPresent("owner@example.com");

        assertThat(user.getAuthorities()).extracting(Authority::getName).contains(AuthoritiesConstants.USER);
    }
}

