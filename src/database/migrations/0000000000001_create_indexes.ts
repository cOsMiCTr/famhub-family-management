import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create indexes for users table
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_users_household ON users(household_id)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(account_locked_until)`);

  // Create indexes for assets table
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_assets_household ON assets(household_id)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_assets_member ON assets(household_member_id)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_assets_ownership ON assets(ownership_type)`);

  // Create indexes for asset_valuation_history table
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_asset_valuation_history_asset ON asset_valuation_history(asset_id)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_asset_valuation_history_date ON asset_valuation_history(valuation_date)`);

  // Create indexes for contracts table
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_contracts_household ON contracts(household_id)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)`);

  // Create indexes for notifications table
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read)`);

  // Create indexes for exchange_rates table
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency)`);

  // Create indexes for currencies table
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_currencies_type ON currencies(currency_type)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_currencies_active ON currencies(is_active)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_currencies_display_order ON currencies(display_order)`);

  // Create indexes for invitation_tokens table
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_invitation_tokens_token ON invitation_tokens(token)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_invitation_tokens_email ON invitation_tokens(email)`);

  // Create indexes for login_attempts table
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at)`);

  // Create indexes for admin_notifications table
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at)`);

  // Create indexes for user_activity table (with DESC ordering)
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_user_activity_user_created ON user_activity(user_id, created_at DESC)`);
  await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_user_activity_action ON user_activity(action_type)`);
}

export async function down(knex: Knex): Promise<void> {
  // Drop indexes in reverse order
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_user_activity_action`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_user_activity_user_created`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_admin_notifications_created_at`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_admin_notifications_read`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_login_attempts_created_at`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_login_attempts_user_id`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_login_attempts_email`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_invitation_tokens_email`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_invitation_tokens_token`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_currencies_display_order`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_currencies_active`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_currencies_type`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_exchange_rates_currencies`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_notifications_user`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_contracts_status`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_contracts_household`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_asset_valuation_history_date`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_asset_valuation_history_asset`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_assets_ownership`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_assets_status`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_assets_category`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_assets_member`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_assets_household`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_users_locked_until`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_users_account_status`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_users_household`);
  await knex.schema.raw(`DROP INDEX IF EXISTS idx_users_email`);
}

