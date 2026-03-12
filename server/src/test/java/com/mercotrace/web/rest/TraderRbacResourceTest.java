package com.mercotrace.web.rest;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mercotrace.security.AuthoritiesConstants;
import com.mercotrace.service.RbacAuthorityService;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.UserService;
import com.mercotrace.service.dto.RoleDTO;
import com.mercotrace.service.mapper.RoleMapper;
import com.mercotrace.web.rest.vm.TraderRbacUserCreateVM;
import com.mercotrace.web.rest.vm.TraderRbacUserUpdateVM;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import com.mercotrace.domain.Role;
import com.mercotrace.domain.Trader;
import com.mercotrace.domain.User;
import com.mercotrace.domain.UserRole;
import com.mercotrace.domain.UserTrader;
import com.mercotrace.repository.RoleRepository;
import com.mercotrace.repository.UserRepository;
import com.mercotrace.repository.UserRoleRepository;
import com.mercotrace.repository.UserTraderRepository;
import com.mercotrace.repository.TraderRepository;
import com.mercotrace.repository.ContactRepository;
import com.mercotrace.admin.identity.AdminUserRepository;

/**
 * Unit tests for the {@link TraderRbacResource} REST controller.
 * Uses standalone MockMvc so the controller is invoked without full Spring Security OAuth2.
 * Covers role CRUD, user create/update/list, role assignment, and validation. Permission (403)
 * behaviour is tested in integration tests (e.g. TraderRbacResourceIT) with full security.
 */
@ExtendWith(MockitoExtension.class)
class TraderRbacResourceTest {

    private static final Long TRADER_ID = 101L;
    private static final String ROLES_URL = "/api/trader/rbac/roles";
    private static final String USERS_URL = "/api/trader/rbac/users";

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @Mock
    private TraderContextService traderContextService;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private RoleMapper roleMapper;

    @Mock
    private UserService userService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserTraderRepository userTraderRepository;

    @Mock
    private UserRoleRepository userRoleRepository;

    @Mock
    private RbacAuthorityService rbacAuthorityService;

    @Mock
    private TraderRepository traderRepository;

    @Mock
    private ContactRepository contactRepository;

    @Mock
    private AdminUserRepository adminUserRepository;

    @BeforeEach
    void setUp() {
        lenient().when(traderContextService.getCurrentTraderId()).thenReturn(TRADER_ID);
        TraderRbacResource resource = new TraderRbacResource(
            traderContextService,
            roleRepository,
            roleMapper,
            userService,
            userRepository,
            userTraderRepository,
            userRoleRepository,
            rbacAuthorityService,
            traderRepository,
            contactRepository,
            adminUserRepository
        );
        mockMvc = MockMvcBuilders.standaloneSetup(resource).build();
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor rbacView() {
        return user("test").authorities(new SimpleGrantedAuthority(AuthoritiesConstants.RBAC_SETTINGS_VIEW));
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor rbacEdit() {
        return user("test").authorities(new SimpleGrantedAuthority(AuthoritiesConstants.RBAC_SETTINGS_EDIT));
    }

    // ---------- Role: list ----------
    @Nested
    @DisplayName("GET /api/trader/rbac/roles (list)")
    class GetTraderRoles {

        @Test
        @DisplayName("listRoles_withRbacSettingsView_returns200")
        void listRoles_withRbacSettingsView_returns200() throws Exception {
            when(roleRepository.findByTraderId(TRADER_ID)).thenReturn(List.of());
            mockMvc.perform(get(ROLES_URL).with(rbacView())).andExpect(status().isOk());
            verify(roleRepository).findByTraderId(TRADER_ID);
        }
    }

    // ---------- Role: create ----------
    @Nested
    @DisplayName("POST /api/trader/rbac/roles (create)")
    class CreateTraderRole {

        @Test
        @DisplayName("createRole_withValidPayload_returns201")
        void createRole_withValidPayload_returns201() throws Exception {
            RoleDTO dto = validRoleDTO(null, "Staff Role", "Description");
            Role entity = new Role();
            entity.setId(1L);
            entity.setRoleName("Staff Role");
            entity.setTraderId(TRADER_ID);
            entity.setCreatedAt(Instant.now());
            RoleDTO resultDto = new RoleDTO();
            resultDto.setId(1L);
            resultDto.setRoleName("Staff Role");
            resultDto.setTraderId(TRADER_ID);

            when(roleMapper.toEntity(any(RoleDTO.class))).thenReturn(entity);
            when(roleRepository.save(any(Role.class))).thenReturn(entity);
            when(roleMapper.toDto(any(Role.class))).thenReturn(resultDto);

            mockMvc
                .perform(
                    post(ROLES_URL)
                        .with(rbacEdit())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(dto))
                )
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/trader/rbac/roles/1"))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.roleName").value("Staff Role"));

            verify(roleRepository).save(any(Role.class));
        }

        @Test
        @DisplayName("createRole_withIdInPayload_returns400")
        void createRole_withIdInPayload_returns400() throws Exception {
            RoleDTO dto = validRoleDTO(99L, "Staff", "Desc");
            mockMvc
                .perform(
                    post(ROLES_URL)
                        .with(rbacEdit())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(dto))
                )
                .andExpect(status().isBadRequest());
            verify(roleRepository, never()).save(any(Role.class));
        }
    }

    // ---------- Role: update ----------
    @Nested
    @DisplayName("PUT /api/trader/rbac/roles/:id (update)")
    class UpdateTraderRole {

        @Test
        @DisplayName("updateRole_withValidPayload_returns200")
        void updateRole_withValidPayload_returns200() throws Exception {
            Long roleId = 1L;
            Role existing = new Role();
            existing.setId(roleId);
            existing.setTraderId(TRADER_ID);
            existing.setRoleName("Old");
            existing.setModulePermissions("{}");
            Role saved = new Role();
            saved.setId(roleId);
            saved.setTraderId(TRADER_ID);
            saved.setRoleName("Updated");
            RoleDTO resultDto = new RoleDTO();
            resultDto.setId(roleId);
            resultDto.setRoleName("Updated");

            when(roleRepository.findById(roleId)).thenReturn(Optional.of(existing));
            when(roleRepository.save(any(Role.class))).thenReturn(saved);
            when(roleRepository.fetchBagRelationships(any(Optional.class))).thenReturn(Optional.of(saved));
            when(roleMapper.toDto(any(Role.class))).thenReturn(resultDto);
            when(userRoleRepository.findByRoleId(roleId)).thenReturn(List.of());

            RoleDTO dto = validRoleDTO(roleId, "Updated", "Desc");
            mockMvc
                .perform(
                    put(ROLES_URL + "/" + roleId)
                        .with(rbacEdit())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(dto))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roleName").value("Updated"));
            verify(roleRepository).save(any(Role.class));
        }
    }

    // ---------- Role: delete ----------
    @Nested
    @DisplayName("DELETE /api/trader/rbac/roles/:id (delete)")
    class DeleteTraderRole {

        @Test
        @DisplayName("deleteRole_withRbacSettingsEdit_returns204")
        void deleteRole_withRbacSettingsEdit_returns204() throws Exception {
            Long roleId = 1L;
            Role role = new Role();
            role.setId(roleId);
            role.setTraderId(TRADER_ID);
            when(roleRepository.findById(roleId)).thenReturn(Optional.of(role));
            when(userRoleRepository.findByRoleId(roleId)).thenReturn(List.of());

            mockMvc
                .perform(delete(ROLES_URL + "/" + roleId).with(rbacEdit()))
                .andExpect(status().isNoContent());
            verify(roleRepository).delete(any(Role.class));
        }
    }

    // ---------- User: list ----------
    @Nested
    @DisplayName("GET /api/trader/rbac/users (list)")
    class GetTraderUsers {

        @Test
        @DisplayName("listUsers_withRbacSettingsView_returns200")
        void listUsers_withRbacSettingsView_returns200() throws Exception {
            when(userTraderRepository.findAllWithUserByTraderIdAndPrimaryMappingTrue(TRADER_ID)).thenReturn(List.of());
            mockMvc.perform(get(USERS_URL).with(rbacView())).andExpect(status().isOk());
            verify(userTraderRepository).findAllWithUserByTraderIdAndPrimaryMappingTrue(TRADER_ID);
        }
    }

    // ---------- User: create ----------
    @Nested
    @DisplayName("POST /api/trader/rbac/users (create)")
    class CreateTraderUser {

        @Test
        @DisplayName("createUser_withValidPayload_returns201")
        void createUser_withValidPayload_returns201() throws Exception {
            TraderRbacUserCreateVM vm = new TraderRbacUserCreateVM();
            vm.setEmail("staff@example.com");
            vm.setFullName("Staff User");
            vm.setPassword("password123");
            vm.setRoleInTrader("STAFF");
            vm.setRoleIds(Set.of());

            User user = new User();
            user.setId(1L);
            user.setLogin("staff@example.com");
            user.setEmail("staff@example.com");
            user.setFirstName("Staff");
            user.setLastName("User");
            user.setActivated(true);
            when(userService.registerUser(any(), eq("password123"))).thenReturn(user);
            when(userRepository.save(any(User.class))).thenReturn(user);

            mockMvc
                .perform(
                    post(USERS_URL)
                        .with(rbacEdit())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(vm))
                )
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/trader/rbac/users/1"))
                .andExpect(jsonPath("$.email").value("staff@example.com"));
            verify(userService).registerUser(any(), eq("password123"));
            verify(rbacAuthorityService).applyTraderAuthoritiesToUser(1L, TRADER_ID);
        }

        @Test
        @DisplayName("createUser_withShortPassword_returns400")
        void createUser_withShortPassword_returns400() throws Exception {
            TraderRbacUserCreateVM vm = new TraderRbacUserCreateVM();
            vm.setEmail("staff@example.com");
            vm.setFullName("Staff");
            vm.setPassword("short");
            vm.setRoleInTrader("STAFF");
            mockMvc
                .perform(
                    post(USERS_URL)
                        .with(rbacEdit())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(vm))
                )
                .andExpect(status().isBadRequest());
            verify(userService, never()).registerUser(any(), any());
        }
    }

    // ---------- User: update (includes role assignment) ----------
    @Nested
    @DisplayName("PUT /api/trader/rbac/users/:id (update and role assignment)")
    class UpdateTraderUser {

        @Test
        @DisplayName("updateUser_withValidPayload_returns200")
        void updateUser_withValidPayload_returns200() throws Exception {
            Long userId = 1L;
            User user = new User();
            user.setId(userId);
            user.setLogin("staff");
            user.setEmail("staff@example.com");
            user.setFirstName("Staff");
            user.setLastName("User");
            user.setActivated(true);
            UserTrader mapping = new UserTrader();
            mapping.setUser(user);
            mapping.setRoleInTrader("STAFF");
            Trader t = new Trader();
            t.setId(TRADER_ID);
            mapping.setTrader(t);

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(userTraderRepository.findFirstByUserIdAndTraderIdAndPrimaryMappingTrue(userId, TRADER_ID)).thenReturn(Optional.of(mapping));
            when(userRepository.save(any(User.class))).thenReturn(user);
            when(userRoleRepository.findByUserId(userId)).thenReturn(List.of());

            TraderRbacUserUpdateVM vm = new TraderRbacUserUpdateVM();
            vm.setFullName("Updated Name");
            vm.setRoleIds(Set.of());

            mockMvc
                .perform(
                    put(USERS_URL + "/" + userId)
                        .with(rbacEdit())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(vm))
                )
                .andExpect(status().isOk());
            verify(userRepository).save(any(User.class));
            verify(rbacAuthorityService).applyTraderAuthoritiesToUser(userId, TRADER_ID);
        }

        @Test
        @DisplayName("assignRolesToUser_viaUpdate_returns200")
        void assignRolesToUser_viaUpdate_returns200() throws Exception {
            Long userId = 1L;
            Long roleId = 10L;
            User user = new User();
            user.setId(userId);
            user.setLogin("staff");
            user.setEmail("staff@example.com");
            user.setFirstName("Staff");
            user.setLastName("User");
            UserTrader mapping = new UserTrader();
            mapping.setUser(user);
            mapping.setRoleInTrader("STAFF");
            Trader t = new Trader();
            t.setId(TRADER_ID);
            mapping.setTrader(t);
            Role role = new Role();
            role.setId(roleId);
            role.setTraderId(TRADER_ID);

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(userTraderRepository.findFirstByUserIdAndTraderIdAndPrimaryMappingTrue(userId, TRADER_ID)).thenReturn(Optional.of(mapping));
            when(userRepository.save(any(User.class))).thenReturn(user);
            when(userRoleRepository.findByUserId(userId)).thenReturn(List.of());
            when(roleRepository.findAllById(Set.of(roleId))).thenReturn(List.of(role));

            TraderRbacUserUpdateVM vm = new TraderRbacUserUpdateVM();
            vm.setRoleIds(Set.of(roleId));

            mockMvc
                .perform(
                    put(USERS_URL + "/" + userId)
                        .with(rbacEdit())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(vm))
                )
                .andExpect(status().isOk());
            verify(userRoleRepository).save(any(UserRole.class));
            verify(rbacAuthorityService).applyTraderAuthoritiesToUser(userId, TRADER_ID);
        }
    }

    private static RoleDTO validRoleDTO(Long id, String name, String description) {
        RoleDTO dto = new RoleDTO();
        dto.setId(id);
        dto.setRoleName(name);
        dto.setDescription(description);
        dto.setModulePermissions(new HashMap<>());
        return dto;
    }
}
