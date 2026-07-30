ALTER TABLE user_accounts
    DROP CONSTRAINT chk_manual_user_credentials;

ALTER TABLE user_accounts
    ADD CONSTRAINT chk_account_credentials CHECK (
        (
            auth_provider = 'MANUAL'
            AND username IS NOT NULL
            AND normalized_username IS NOT NULL
            AND password_hash IS NOT NULL
            AND external_subject IS NULL
        )
        OR
        (
            auth_provider IN ('GOOGLE', 'FACEBOOK')
            AND username IS NULL
            AND normalized_username IS NULL
            AND password_hash IS NULL
            AND external_subject IS NOT NULL
        )
        OR
        (
            auth_provider = 'SYSTEM'
            AND username IS NULL
            AND normalized_username IS NULL
            AND password_hash IS NULL
            AND external_subject IS NOT NULL
        )
    );
