ALTER TABLE user_game_preferences DROP CONSTRAINT chk_game_preference_theme;

ALTER TABLE user_game_preferences ADD CONSTRAINT chk_game_preference_theme CHECK (theme IN (
    'classic', 'rainbow', 'fire', 'beach', 'sky', 'christmas', 'halloween', 'golden',
    'retro-arcade', 'vegas', 'american', 'cosmic-galaxy', 'sixties-tie-dye',
    'world-traveler', 'clockwork', 'baseball', 'candy-kingdom', 'frozen-crystal'
));

ALTER TABLE game_scores DROP CONSTRAINT chk_game_score_theme;

ALTER TABLE game_scores ADD CONSTRAINT chk_game_score_theme CHECK (
    theme IS NULL OR theme IN (
        'classic', 'rainbow', 'fire', 'beach', 'sky', 'christmas', 'halloween', 'golden',
        'retro-arcade', 'vegas', 'american', 'cosmic-galaxy', 'sixties-tie-dye',
        'world-traveler', 'clockwork', 'baseball', 'candy-kingdom', 'frozen-crystal'
    )
);
