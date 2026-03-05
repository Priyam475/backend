package com.mercotrace.admin.identity;

import com.mercotrace.security.SecurityUtils;
import com.mercotrace.service.dto.AdminUserDTO;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AdminUserService {

    private final AdminUserRepository adminUserRepository;

    public AdminUserService(AdminUserRepository adminUserRepository) {
        this.adminUserRepository = adminUserRepository;
    }

    @Transactional(readOnly = true)
    public Optional<AdminUser> getCurrentAdminWithAuthorities() {
        return SecurityUtils
            .getCurrentUserLogin()
            .flatMap(login -> adminUserRepository.findOneWithAuthoritiesByLogin(login));
    }

    @Transactional(readOnly = true)
    public Optional<AdminUserDTO> getCurrentAdminDto() {
        return getCurrentAdminWithAuthorities().map(AdminUserDTO::new);
    }
}

