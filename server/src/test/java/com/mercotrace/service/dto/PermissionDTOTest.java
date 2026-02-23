package com.mercotrace.service.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.mercotrace.web.rest.TestUtil;
import org.junit.jupiter.api.Test;

class PermissionDTOTest {

    @Test
    void dtoEqualsVerifier() throws Exception {
        TestUtil.equalsVerifier(PermissionDTO.class);
        PermissionDTO permissionDTO1 = new PermissionDTO();
        permissionDTO1.setId(1L);
        PermissionDTO permissionDTO2 = new PermissionDTO();
        assertThat(permissionDTO1).isNotEqualTo(permissionDTO2);
        permissionDTO2.setId(permissionDTO1.getId());
        assertThat(permissionDTO1).isEqualTo(permissionDTO2);
        permissionDTO2.setId(2L);
        assertThat(permissionDTO1).isNotEqualTo(permissionDTO2);
        permissionDTO1.setId(null);
        assertThat(permissionDTO1).isNotEqualTo(permissionDTO2);
    }
}
