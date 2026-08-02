CREATE TABLE completed_game_category_scores (
    game_score_id UUID NOT NULL,
    category_id VARCHAR(40) NOT NULL,
    score INTEGER NOT NULL,
    PRIMARY KEY (game_score_id, category_id),
    CONSTRAINT fk_completed_category_game_score
        FOREIGN KEY (game_score_id) REFERENCES game_scores (id) ON DELETE CASCADE,
    CONSTRAINT chk_completed_category_score CHECK (score BETWEEN 0 AND 250)
);

CREATE INDEX idx_completed_category_lookup
    ON completed_game_category_scores (category_id, score);
