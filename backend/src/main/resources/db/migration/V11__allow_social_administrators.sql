ALTER TABLE user_accounts DROP CONSTRAINT chk_admin_auth_provider;
ALTER TABLE user_accounts ADD CONSTRAINT chk_admin_auth_provider CHECK (
    account_role <> 'ADMIN' OR auth_provider <> 'SYSTEM'
);
