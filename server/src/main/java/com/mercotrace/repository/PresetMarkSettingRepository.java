package com.mercotrace.repository;

import com.mercotrace.domain.PresetMarkSetting;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PresetMarkSettingRepository extends JpaRepository<PresetMarkSetting, Long> {

    List<PresetMarkSetting> findAllByTraderIdOrderByIdAsc(Long traderId);

    boolean existsByTraderIdAndPredefinedMarkIgnoreCase(Long traderId, String predefinedMark);

    boolean existsByTraderIdAndPredefinedMarkIgnoreCaseAndIdNot(Long traderId, String predefinedMark, Long id);
}
