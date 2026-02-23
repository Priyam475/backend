package com.mercotrace.web.rest;

import com.mercotrace.service.UserService;
import com.mercotrace.service.MailService;
import com.mercotrace.web.rest.vm.LoginVM;
import com.mercotrace.web.rest.vm.ManagedUserVM;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

/**
 * Module 1 spec — auth paths: /api/auth/register, /api/auth/login, /api/auth/profile.
 * Delegates to existing JHipster auth/account.
 */
@RestController
@RequestMapping("/api/auth")
public class Module1AuthResource {

    private final UserService userService;
    private final MailService mailService;
    private final com.mercotrace.web.rest.AccountResource accountResource;
    private final com.mercotrace.web.rest.AuthenticateController authenticateController;

    public Module1AuthResource(
        UserService userService,
        MailService mailService,
        com.mercotrace.web.rest.AccountResource accountResource,
        com.mercotrace.web.rest.AuthenticateController authenticateController
    ) {
        this.userService = userService;
        this.mailService = mailService;
        this.accountResource = accountResource;
        this.authenticateController = authenticateController;
    }

    /** Module 1 spec: POST /auth/register — Register Trader (Directory Listing only). */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public void register(@Valid @RequestBody ManagedUserVM vm) {
        if (vm.getPassword() == null || vm.getPassword().length() < 4 || vm.getPassword().length() > 100) {
            throw new com.mercotrace.service.InvalidPasswordException();
        }
        var user = userService.registerUser(vm, vm.getPassword());
        mailService.sendActivationEmail(user);
    }

    /** Module 1 spec: POST /auth/login — Login User. Delegates to /api/authenticate. */
    @PostMapping("/login")
    public ResponseEntity<com.mercotrace.web.rest.AuthenticateController.JWTToken> login(@Valid @RequestBody LoginVM loginVM) {
        return authenticateController.authorize(loginVM);
    }

    /** Module 1 spec: GET /auth/profile — Get current user profile. */
    @GetMapping("/profile")
    public com.mercotrace.service.dto.AdminUserDTO getProfile() {
        return accountResource.getAccount();
    }

    /** Module 1 spec: PUT /auth/profile — Update user profile. */
    @PutMapping("/profile")
    public void updateProfile(@RequestBody com.mercotrace.service.dto.AdminUserDTO userDTO) {
        // Delegate to AccountResource without triggering bean validation on AdminUserDTO here.
        // AccountResource will use the current authenticated user and only the updated fields.
        accountResource.saveAccount(userDTO);
    }
}
