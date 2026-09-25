package com.scottsdicegame.backend.game.repository;

import com.scottsdicegame.backend.game.entity.GameThemeSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameThemeSettingRepository extends JpaRepository<GameThemeSetting, String> {
}
