package com.mercotrace.web.rest;

import static org.hamcrest.Matchers.emptyString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mercotrace.IntegrationTest;
import com.mercotrace.domain.User;
import com.mercotrace.repository.UserRepository;
import com.mercotrace.web.rest.vm.LoginVM;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/**
 * Login module tests for {@link AuthenticateController}: POST /api/authenticate (login),
 * GET /api/authenticate (isAuthenticated). Positive and negative cases.
 * Run alone: mvn test -Dtest=AuthenticateControllerTest
 */
@AutoConfigureMockMvc
@IntegrationTest
class AuthenticateControllerTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private MockMvc mockMvc;

    // ----- POST /api/authenticate (login) - positive -----

    @Test
    @Transactional
    void login_withValidCredentials_returns200() throws Exception {
        User user = new User();
        user.setLogin("login-valid");
        user.setEmail("login-valid@example.com");
        user.setActivated(true);
        user.setPassword(passwordEncoder.encode("validpass"));

        userRepository.saveAndFlush(user);

        LoginVM login = new LoginVM();
        login.setUsername("login-valid");
        login.setPassword("validpass");

        mockMvc
            .perform(
                post("/api/authenticate").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsBytes(login))
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id_token").isString())
            .andExpect(jsonPath("$.id_token").value(not(emptyString())))
            .andExpect(header().string(AUTHORIZATION, not(nullValue())))
            .andExpect(header().string(AUTHORIZATION, not(emptyString())));
    }

    @Test
    @Transactional
    void login_withValidCredentialsAndRememberMe_returns200() throws Exception {
        User user = new User();
        user.setLogin("login-remember");
        user.setEmail("login-remember@example.com");
        user.setActivated(true);
        user.setPassword(passwordEncoder.encode("validpass"));

        userRepository.saveAndFlush(user);

        LoginVM login = new LoginVM();
        login.setUsername("login-remember");
        login.setPassword("validpass");
        login.setRememberMe(true);

        mockMvc
            .perform(
                post("/api/authenticate").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsBytes(login))
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id_token").isString())
            .andExpect(jsonPath("$.id_token").value(not(emptyString())))
            .andExpect(header().string(AUTHORIZATION, not(nullValue())));
    }

    // ----- POST /api/authenticate (login) - negative -----

    @Test
    void login_withInvalidPassword_returns401() throws Exception {
        LoginVM login = new LoginVM();
        login.setUsername("wrong-user");
        login.setPassword("wrong-password");

        mockMvc
            .perform(
                post("/api/authenticate").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsBytes(login))
            )
            .andExpect(status().isUnauthorized())
            .andExpect(header().doesNotExist(AUTHORIZATION));
    }

    @Test
    @Transactional
    void login_withDisabledUser_returns401() throws Exception {
        User user = new User();
        user.setLogin("login-disabled");
        user.setEmail("login-disabled@example.com");
        user.setActivated(false);
        user.setPassword(passwordEncoder.encode("validpass"));

        userRepository.saveAndFlush(user);

        LoginVM login = new LoginVM();
        login.setUsername("login-disabled");
        login.setPassword("validpass");

        mockMvc
            .perform(
                post("/api/authenticate").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsBytes(login))
            )
            .andExpect(status().isUnauthorized());
    }

    @Test
    void login_withMissingUsername_returns400() throws Exception {
        String json = "{\"password\":\"validpass123\",\"rememberMe\":false}";

        mockMvc
            .perform(post("/api/authenticate").contentType(MediaType.APPLICATION_JSON).content(json))
            .andExpect(status().isBadRequest());
    }

    @Test
    void login_withEmptyUsername_returns400() throws Exception {
        LoginVM login = new LoginVM();
        login.setUsername("");
        login.setPassword("validpass123");

        mockMvc
            .perform(
                post("/api/authenticate").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsBytes(login))
            )
            .andExpect(status().isBadRequest());
    }

    @Test
    void login_withShortPassword_returns400() throws Exception {
        LoginVM login = new LoginVM();
        login.setUsername("someuser");
        login.setPassword("abc"); // min is 4

        mockMvc
            .perform(
                post("/api/authenticate").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsBytes(login))
            )
            .andExpect(status().isBadRequest());
    }

    @Test
    void login_withMissingPassword_returns400() throws Exception {
        String json = "{\"username\":\"someuser\",\"rememberMe\":false}";

        mockMvc
            .perform(post("/api/authenticate").contentType(MediaType.APPLICATION_JSON).content(json))
            .andExpect(status().isBadRequest());
    }

    // ----- GET /api/authenticate (isAuthenticated) -----

    @Test
    void isAuthenticated_withoutCredentials_returns401() throws Exception {
        mockMvc.perform(get("/api/authenticate")).andExpect(status().isUnauthorized());
    }

    @Test
    @Transactional
    void isAuthenticated_withValidToken_returns204() throws Exception {
        User user = new User();
        user.setLogin("login-check");
        user.setEmail("login-check@example.com");
        user.setActivated(true);
        user.setPassword(passwordEncoder.encode("validpass"));

        userRepository.saveAndFlush(user);

        LoginVM login = new LoginVM();
        login.setUsername("login-check");
        login.setPassword("validpass");

        ResultActions loginResult = mockMvc
            .perform(
                post("/api/authenticate").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsBytes(login))
            )
            .andExpect(status().isOk());

        String authHeader = loginResult.andReturn().getResponse().getHeader(AUTHORIZATION);
        String token = authHeader != null && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;

        mockMvc.perform(get("/api/authenticate").header(AUTHORIZATION, "Bearer " + token)).andExpect(status().isNoContent());
    }
}
