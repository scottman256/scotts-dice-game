CREATE TABLE user_game_preferences (
    user_id UUID PRIMARY KEY,
    theme VARCHAR(40) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_game_preference_user
        FOREIGN KEY (user_id) REFERENCES user_accounts (id) ON DELETE CASCADE,
    CONSTRAINT chk_game_preference_theme CHECK (theme IN (
        'classic', 'rainbow', 'fire', 'beach', 'sky', 'christmas', 'halloween', 'golden',
        'retro-arcade', 'vegas', 'american', 'cosmic-galaxy', 'sixties-tie-dye',
        'world-traveler', 'clockwork', 'baseball'
    ))
);

CREATE TABLE saved_games (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    game_id UUID NOT NULL,
    roll_count INTEGER NOT NULL,
    extra_rolls_used INTEGER NOT NULL,
    status VARCHAR(500) NOT NULL,
    status_tone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_saved_game_user
        FOREIGN KEY (user_id) REFERENCES user_accounts (id) ON DELETE CASCADE,
    CONSTRAINT uk_saved_game_user UNIQUE (user_id),
    CONSTRAINT uk_saved_game_id UNIQUE (game_id),
    CONSTRAINT chk_saved_game_roll_count CHECK (roll_count BETWEEN 0 AND 4),
    CONSTRAINT chk_saved_game_extra_rolls CHECK (extra_rolls_used BETWEEN 0 AND 3),
    CONSTRAINT chk_saved_game_status_tone CHECK (status_tone IN ('normal', 'celebration', 'legendary'))
);

CREATE TABLE saved_game_dice (
    saved_game_id UUID NOT NULL,
    die_position INTEGER NOT NULL,
    face INTEGER,
    held BOOLEAN NOT NULL,
    PRIMARY KEY (saved_game_id, die_position),
    CONSTRAINT fk_saved_game_die
        FOREIGN KEY (saved_game_id) REFERENCES saved_games (id) ON DELETE CASCADE,
    CONSTRAINT chk_saved_game_die_position CHECK (die_position BETWEEN 0 AND 4),
    CONSTRAINT chk_saved_game_die_face CHECK (face IS NULL OR face BETWEEN 1 AND 6),
    CONSTRAINT chk_saved_game_empty_die_not_held CHECK (face IS NOT NULL OR held = FALSE)
);

CREATE TABLE saved_game_scores (
    saved_game_id UUID NOT NULL,
    category_id VARCHAR(40) NOT NULL,
    score INTEGER NOT NULL,
    PRIMARY KEY (saved_game_id, category_id),
    CONSTRAINT fk_saved_game_score
        FOREIGN KEY (saved_game_id) REFERENCES saved_games (id) ON DELETE CASCADE,
    CONSTRAINT chk_saved_game_category_score CHECK (score BETWEEN 0 AND 250)
);

CREATE INDEX idx_saved_games_user_updated
    ON saved_games (user_id, updated_at DESC);
