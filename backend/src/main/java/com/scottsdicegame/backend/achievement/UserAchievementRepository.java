package com.scottsdicegame.backend.achievement;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserAchievementRepository extends JpaRepository<UserAchievement, UUID> {

    List<UserAchievement> findByUserId(UUID userId);

    long countByUserId(UUID userId);

    void deleteByUserId(UUID userId);
}
