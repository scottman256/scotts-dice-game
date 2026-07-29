CREATE TABLE user_accounts (
    id UUID PRIMARY KEY,
    username VARCHAR(32),
    normalized_username VARCHAR(32),
    password_hash VARCHAR(100),
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(254),
    photo_url VARCHAR(1000),
    auth_provider VARCHAR(20) NOT NULL,
    external_subject VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_user_normalized_username UNIQUE (normalized_username),
    CONSTRAINT uk_user_external_identity UNIQUE (auth_provider, external_subject),
    CONSTRAINT chk_manual_user_credentials CHECK (
        (auth_provider = 'MANUAL' AND username IS NOT NULL AND normalized_username IS NOT NULL AND password_hash IS NOT NULL)
        OR
        (auth_provider <> 'MANUAL' AND external_subject IS NOT NULL)
    )
);

CREATE TABLE game_scores (
    id UUID PRIMARY KEY,
    game_id UUID NOT NULL,
    user_id UUID NOT NULL,
    score INTEGER NOT NULL,
    new_personal_best BOOLEAN NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_game_score_user FOREIGN KEY (user_id) REFERENCES user_accounts (id) ON DELETE CASCADE,
    CONSTRAINT uk_game_score_user_game UNIQUE (user_id, game_id),
    CONSTRAINT chk_game_score_range CHECK (score BETWEEN 0 AND 2000)
);

CREATE INDEX idx_game_scores_user_ranking
    ON game_scores (user_id, score DESC, completed_at ASC);

CREATE INDEX idx_game_scores_global_ranking
    ON game_scores (score DESC, completed_at ASC);
