ALTER TABLE user_accounts ADD COLUMN normalized_email VARCHAR(254);

UPDATE user_accounts
SET email = NULL
WHERE email IS NOT NULL AND TRIM(email) = '';

UPDATE user_accounts
SET email = 'test@test.com'
WHERE normalized_username = 'test' AND email IS NULL;

UPDATE user_accounts
SET email = 'admin@admin.com'
WHERE normalized_username = 'admin' AND email IS NULL;

UPDATE user_accounts
SET normalized_email = LOWER(TRIM(email))
WHERE email IS NOT NULL;

ALTER TABLE user_accounts ADD CONSTRAINT uk_user_normalized_email UNIQUE (normalized_email);

ALTER TABLE user_accounts ADD CONSTRAINT chk_user_email_normalization CHECK (
    (email IS NULL AND normalized_email IS NULL)
    OR
    (email IS NOT NULL AND normalized_email = LOWER(TRIM(email)))
);
