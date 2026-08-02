ALTER TABLE game_scores ADD COLUMN theme VARCHAR(40);

ALTER TABLE game_scores ADD CONSTRAINT chk_game_score_theme CHECK (
    theme IS NULL OR theme IN (
        'classic', 'rainbow', 'fire', 'beach', 'sky', 'christmas', 'halloween', 'golden',
        'retro-arcade', 'vegas', 'american', 'cosmic-galaxy', 'sixties-tie-dye',
        'world-traveler', 'clockwork', 'baseball'
    )
);

CREATE INDEX idx_game_scores_user_history
    ON game_scores (user_id, completed_at ASC, id);

CREATE TABLE user_achievements (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    achievement_key VARCHAR(80) NOT NULL,
    qualifying_game_score_id UUID NOT NULL,
    achieved_at TIMESTAMP WITH TIME ZONE NOT NULL,
    awarded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_user_achievement_user
        FOREIGN KEY (user_id) REFERENCES user_accounts (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_achievement_game_score
        FOREIGN KEY (qualifying_game_score_id) REFERENCES game_scores (id) ON DELETE CASCADE,
    CONSTRAINT uk_user_achievement_key UNIQUE (user_id, achievement_key)
);

CREATE INDEX idx_user_achievements_display
    ON user_achievements (user_id, achieved_at ASC);
