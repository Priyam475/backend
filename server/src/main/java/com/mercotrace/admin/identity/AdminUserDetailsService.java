package com.mercotrace.admin.identity;

import com.mercotrace.security.DomainUserDetailsService;
import java.util.Locale;
import org.hibernate.validator.internal.constraintvalidators.hv.EmailValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component("adminUserDetailsService")
public class AdminUserDetailsService implements UserDetailsService {

    private static final Logger LOG = LoggerFactory.getLogger(AdminUserDetailsService.class);

    private final AdminUserRepository adminUserRepository;

    public AdminUserDetailsService(AdminUserRepository adminUserRepository) {
        this.adminUserRepository = adminUserRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String login) {
        LOG.debug("Authenticating admin {}", login);

        if (new EmailValidator().isValid(login, null)) {
            return adminUserRepository
                .findOneWithAuthoritiesByEmailIgnoreCase(login)
                .map(user -> createSpringSecurityUser(login, user))
                .orElseThrow(() -> new UsernameNotFoundException("Admin with email " + login + " was not found in the database"));
        }

        String lowercaseLogin = login.toLowerCase(Locale.ENGLISH);
        return adminUserRepository
            .findOneWithAuthoritiesByLogin(lowercaseLogin)
            .map(user -> createSpringSecurityUser(lowercaseLogin, user))
            .orElseThrow(() -> new UsernameNotFoundException("Admin " + lowercaseLogin + " was not found in the database"));
    }

    private org.springframework.security.core.userdetails.User createSpringSecurityUser(String lowercaseLogin, AdminUser user) {
        if (!user.isActivated()) {
            throw new UsernameNotFoundException("Admin " + lowercaseLogin + " was not activated");
        }

        return new DomainUserDetailsService.UserWithId(
            user.getLogin(),
            user.getPassword(),
            user
                .getAuthorities()
                .stream()
                .map(AdminAuthority::getName)
                .map(org.springframework.security.core.authority.SimpleGrantedAuthority::new)
                .toList(),
            user.getId()
        );
    }
}

