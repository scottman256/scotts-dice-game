package com.scottsdicegame.backend.game;

import org.springframework.data.jpa.repository.JpaRepository;

public interface GameThemeSettingRepository extends JpaRepository<GameThemeSetting, String> {
}
