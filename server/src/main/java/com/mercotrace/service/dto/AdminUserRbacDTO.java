package com.mercotrace.service.dto;

import com.mercotrace.admin.identity.AdminUser;
import java.io.Serializable;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * DTO exposing admin users and their assigned admin role IDs for RBAC management.
 */
public class AdminUserRbacDTO implements Serializable {

    private Long id;

    private String login;

    private String email;

    private String firstName;

    private String lastName;

    private String mobile;

    private boolean activated;

    private Set<Long> roles;

    public AdminUserRbacDTO() {}

    public AdminUserRbacDTO(AdminUser user) {
        this.id = user.getId();
        this.login = user.getLogin();
        this.email = user.getEmail();
        this.firstName = user.getFirstName();
        this.lastName = user.getLastName();
        this.mobile = user.getMobile();
        this.activated = user.isActivated();
        this.roles =
            user
                .getRoles()
                .stream()
                .filter(r -> r.getId() != null)
                .map(r -> r.getId())
                .collect(Collectors.toSet());
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getLogin() {
        return login;
    }

    public void setLogin(String login) {
        this.login = login;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Set<Long> getRoles() {
        return roles;
    }

    public void setRoles(Set<Long> roles) {
        this.roles = roles;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public boolean isActivated() {
        return activated;
    }

    public void setActivated(boolean activated) {
        this.activated = activated;
    }
}

