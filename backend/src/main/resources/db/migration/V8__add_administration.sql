ALTER TABLE user_accounts ADD COLUMN account_role VARCHAR(20) DEFAULT 'USER' NOT NULL;

ALTER TABLE user_accounts ADD CONSTRAINT chk_admin_auth_provider CHECK (
    account_role <> 'ADMIN' OR auth_provider = 'MANUAL'
);

ALTER TABLE game_scores ADD COLUMN default_seed BOOLEAN DEFAULT FALSE NOT NULL;

UPDATE game_scores
SET default_seed = TRUE
WHERE id IN (
    CAST('10000000-0000-4000-8000-000000000001' AS UUID),
    CAST('10000000-0000-4000-8000-000000000002' AS UUID),
    CAST('10000000-0000-4000-8000-000000000003' AS UUID),
    CAST('10000000-0000-4000-8000-000000000004' AS UUID),
    CAST('10000000-0000-4000-8000-000000000005' AS UUID),
    CAST('10000000-0000-4000-8000-000000000006' AS UUID),
    CAST('10000000-0000-4000-8000-000000000007' AS UUID),
    CAST('10000000-0000-4000-8000-000000000008' AS UUID),
    CAST('10000000-0000-4000-8000-000000000009' AS UUID),
    CAST('10000000-0000-4000-8000-000000000010' AS UUID)
);

CREATE INDEX idx_game_scores_default_seed ON game_scores (default_seed);

CREATE TABLE game_theme_settings (
    theme_id VARCHAR(40) PRIMARY KEY,
    enabled BOOLEAN NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT chk_classic_theme_enabled CHECK (theme_id <> 'classic' OR enabled = TRUE)
);

INSERT INTO game_theme_settings (theme_id, enabled, updated_at) VALUES
    ('classic', TRUE, CURRENT_TIMESTAMP),
    ('rainbow', TRUE, CURRENT_TIMESTAMP),
    ('fire', TRUE, CURRENT_TIMESTAMP),
    ('beach', TRUE, CURRENT_TIMESTAMP),
    ('sky', TRUE, CURRENT_TIMESTAMP),
    ('christmas', TRUE, CURRENT_TIMESTAMP),
    ('halloween', TRUE, CURRENT_TIMESTAMP),
    ('golden', TRUE, CURRENT_TIMESTAMP),
    ('retro-arcade', TRUE, CURRENT_TIMESTAMP),
    ('vegas', TRUE, CURRENT_TIMESTAMP),
    ('american', TRUE, CURRENT_TIMESTAMP),
    ('cosmic-galaxy', TRUE, CURRENT_TIMESTAMP),
    ('sixties-tie-dye', TRUE, CURRENT_TIMESTAMP),
    ('world-traveler', TRUE, CURRENT_TIMESTAMP),
    ('clockwork', TRUE, CURRENT_TIMESTAMP),
    ('baseball', TRUE, CURRENT_TIMESTAMP),
    ('candy-kingdom', TRUE, CURRENT_TIMESTAMP),
    ('frozen-crystal', TRUE, CURRENT_TIMESTAMP);
