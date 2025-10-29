<!-- 91466788-b2f4-40c7-8daa-264ce5e5998b a6319bfb-7ab9-40c0-8cc9-26b7500526d9 -->
# Knex Migration System Implementation Plan

## Overview

Migrate from custom `runMigrations()` function to Knex.js for production-ready, versioned database migrations. This plan covers installation, migration conversion, seed management, query helper integration, and deployment strategy.

## Current State Analysis

### Current Architecture

- **Database**: PostgreSQL via `pg` library (node-postgres)
- **Migrations**: Single `runMigrations()` function in `src/config/database.ts` (~700 lines)
- **Pattern**: `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- **Seeds**: 4 seed files in `src/migrations/` (currencies, translations, income_categories, asset_categories)
- **Query Helper**: `export async function query()` used in 26+ files
- **Pool Usage**: `pool` exported and used in some services (e.g., `currencyHelpers.ts`)
- **Startup**: `initializeDatabase()` called in `src/server.ts` before server starts

### Tables Identified (21 tables)

1. users (with complex constraints, arrays, timestamps)
2. households
3. household_permissions
4. household_members (with user_id foreign key)
5. asset_categories (with JSONB column)
6. assets (with multiple foreign keys, ownership types)
7. asset_valuation_history
8. shared_ownership_distribution
9. contract_categories
10. contracts
11. notifications
12. exchange_rates
13. currencies
14. invitation_tokens
15. login_attempts
16. admin_notifications
17. translations
18. income_categories
19. income
20. income_history
21. user_activity

### Complex PostgreSQL Features Used

- JSONB columns (`allowed_currency_types`, `backup_codes`, `old_values`, `new_values`)
- ARRAY types (`password_history TEXT[]`, `assigned_member_ids INTEGER[]`)
- CHECK constraints (enum-like validation)
- SERIAL primary keys
- Foreign keys with CASCADE/SET NULL
- Multiple indexes (17+ indexes)

## Phase 1: Knex Installation and Configuration

### 1.1 Install Dependencies

**File**: `package.json`

- Add `knex` to dependencies
- Add `@types/knex` to devDependencies
- Update scripts: add `"knex": "knex --knexfile src/database/knexfile.ts"`, `"migrate:latest": "knex migrate:latest --knexfile src/database/knexfile.ts"`, `"migrate:rollback": "knex migrate:rollback --knexfile src/database/knexfile.ts"`, `"seed:run": "knex seed:run --knexfile src/database/knexfile.ts"`

### 1.2 Create Knex Configuration

**New File**: `src/database/knexfile.ts`

- Import environment variables (DATABASE_URL from Heroku)
- Configure development, staging, production environments
- Production: Use `process.env.DATABASE_URL` directly (Heroku provides this)
- SSL configuration for production: `{ rejectUnauthorized: false }` (conditional based on `NODE_ENV === 'production'`)
- Migration directory: `src/database/migrations`
- Seed directory: `src/database/seeds`
- Connection pooling: Match existing pool settings exactly:
  - `max: 20` connections
  - `idleTimeoutMillis: 30000` (30 seconds)
  - `connectionTimeoutMillis: 2000` (2 seconds)
- **Disable transactions for DDL operations**: Set `config.transaction = false` or disable per-migration (Knex wraps in transactions by default, but DDL can cause issues)
- **TypeScript support**: Configure to use `ts-node` for running migrations (project has `ts-node@^10.9.1` in devDependencies)

### 1.3 Create Knex Instance

**New File**: `src/database/connection.ts`

- Export Knex instance for application use
- Import from `knexfile.ts`
- Maintain compatibility with existing `pool` export (for backward compatibility during transition)

## Phase 2: Convert Existing Schema to Knex Migrations

### 2.1 Create Migration Tracking Table

**New Migration**: `src/database/migrations/0000000000000_initial_schema.ts`

- This will be the baseline migration
- Creates all 21 tables with exact current schema
- Includes all foreign keys, constraints, indexes
- Handles table creation order (respect dependencies)
- Use Knex schema builder: `table.jsonb()`, `table.specificType()` for arrays
- Transaction support where possible

### 2.2 Migration Strategy

**Approach**: Create baseline migration that matches current state

- Extract all `CREATE TABLE` statements from `runMigrations()` (22 tables total: users, households, household_permissions, household_members, asset_categories, assets, asset_valuation_history, shared_ownership_distribution, contract_categories, contracts, notifications, exchange_rates, currencies, invitation_tokens, login_attempts, admin_notifications, translations, income_categories, income, income_history, user_activity)
- Convert to Knex schema builder syntax
- Preserve all constraints, defaults, foreign keys
- Convert PostgreSQL-specific types:
  - `TEXT[]` → `table.specificType('column_name', 'TEXT[]')` with `defaultTo('ARRAY[]::TEXT[]')`
  - `INTEGER[]` → `table.specificType('column_name', 'INTEGER[]')` with `defaultTo('ARRAY[]::INTEGER[]')`
  - `JSONB` → `table.jsonb('column_name')` with appropriate default (e.g., `defaultTo('["fiat"]'::jsonb)`)
  - `CHECK` constraints → `table.check('constraint_name', ['SQL expression'])` with named constraint support
  - `SERIAL` → `table.increments('id').primary()`
- **DECIMAL Precision Preservation**: Ensure exact precision matching:
  - `DECIMAL(15,2)` for amounts, purchase_price, current_value (assets, income tables)
  - `DECIMAL(15,8)` for exchange_rates.rate
  - `DECIMAL(5,2)` for ownership_percentage
- **CHECK Constraints with Range Conditions**: Preserve `CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100)`
- **Composite Indexes with DESC Ordering**: Preserve `idx_user_activity_user_created` with `(user_id, created_at DESC)` pattern using `table.index(['user_id', { column: 'created_at', order: 'desc' }])` or raw SQL

### 2.3 UNIQUE Constraints

**All UNIQUE constraints must be preserved**:

- `users.email` UNIQUE
- `currencies.code` UNIQUE
- `invitation_tokens.token` UNIQUE
- `translations.translation_key` UNIQUE
- `exchange_rates(from_currency, to_currency)` UNIQUE composite
- `household_permissions(household_id, user_id)` UNIQUE composite
- `shared_ownership_distribution(asset_id, household_member_id)` UNIQUE composite

Use Knex `table.unique()` or `table.unique(['col1', 'col2'])` for composite constraints

### 2.3 Table Creation Order

Must respect foreign key dependencies:

1. users (no dependencies)
2. households (depends on users for created_by_admin_id)
3. household_permissions, household_members (depend on households, users)
4. asset_categories (no dependencies)
5. assets (depends on users, households, household_members, asset_categories)
6. asset_valuation_history, shared_ownership_distribution (depend on assets)
7. contract_categories (no dependencies)
8. contracts (depends on households, contract_categories, users)
9. Other tables following dependency chain

## Phase 3: Convert Column Additions and Data Migrations

### 3.1 Identify Column Addition History

**From** `runMigrations()` function, extract all `addColumnIfNotExists()` and `addColumnToTable()` calls:

- users table: must_change_password, password_changed_at, account_status, failed_login_attempts, last_failed_login_at, account_locked_until, last_login_at, last_activity_at, password_history, created_at, two_factor_enabled, two_factor_secret, backup_codes
- assets: household_member_id, name, purchase_date, purchase_price, purchase_currency, current_value, last_valuation_date, valuation_method, ownership_type, ownership_percentage, status, location, notes, photo_url, linked_loan_id, linked_contract_id
- household_members: user_id
- contracts: assigned_member_ids
- asset_categories: category_type, icon, requires_ticker, depreciation_enabled, allowed_currency_types

### 3.2 Identify Data Migration Operations

**Data Backfill Operations Found**:

1. **Users created_at backfill** (lines 527-536):

   - `UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL`
   - This must run AFTER `created_at` column is added
   - Include in migration that adds `created_at` column

2. **Assets name backfill and constraint** (lines 604-606):

   - `UPDATE assets SET name = COALESCE(description, 'Unnamed Asset') WHERE name IS NULL`
   - `ALTER TABLE assets ALTER COLUMN name SET NOT NULL`
   - This is a data migration + constraint change combo
   - Must handle in same migration: add nullable column, backfill data, then make NOT NULL

### 3.3 Create Sequential Column Addition Migrations

**New Migrations**: `0000000000001_add_user_security_columns.ts`, `0000000000002_add_asset_enhancements.ts`, etc.

- Each migration adds specific columns to specific tables
- Use `table.hasColumn()` check before adding (Knex doesn't have IF NOT EXISTS for columns)
- Include `down()` function for rollback (drop columns)
- **Handle data migrations**:
  - For `users.created_at`: Add column, then backfill with UPDATE, then continue
  - For `assets.name`: Add nullable column, backfill data, then alter to NOT NULL
- Preserve data: nullable columns first, then populate, then make required if needed
- Use Knex `raw()` for complex UPDATE statements or data migrations

## Phase 4: Index Creation Migration

### 4.1 Extract Index Creation

**From** `runMigrations()`: Identify all 17+ `CREATE INDEX IF NOT EXISTS` statements

**New Migration**: `000000000000X_create_indexes.ts`

- Convert all indexes to Knex syntax
- Use `table.index()` or raw `CREATE INDEX IF NOT EXISTS` if needed
- Include `down()` function to drop indexes

## Phase 5: Foreign Key Constraint Updates

### 5.1 Extract Constraint Modifications

**From** `runMigrations()`: Identify constraint additions/updates (e.g., CASCADE updates)

**Separate FK Constraint Additions Found**:

- `asset_valuation_history`: 2 foreign keys added separately (lines 240-262)
  - `asset_valuation_history_asset_id_fkey` (with try-catch error handling)
  - `asset_valuation_history_created_by_fkey` (with try-catch error handling)
- `shared_ownership_distribution`: 2 foreign keys added separately (lines 277-300)
  - `shared_ownership_distribution_asset_id_fkey` (with try-catch error handling)
  - `shared_ownership_distribution_household_member_id_fkey` (with try-catch error handling)
- `users.household_id`: FK constraint added (lines 538-550)
  - Uses error code checking (42710 = duplicate constraint)
- `login_attempts.user_id`: DROP + ADD pattern to change to CASCADE (lines 553-567)
- `admin_notifications.user_id`: DROP + ADD pattern to change to CASCADE (lines 569-583)

**Error Handling Pattern**:

- PostgreSQL error codes: `42701` (duplicate column), `42710` (duplicate constraint)
- Error message string matching: `e.message.includes('already exists')`
- Try-catch blocks with specific error handling

**New Migration**: `000000000000X_update_foreign_key_constraints.ts`

- Handle constraint updates (DROP + ADD pattern)
- Include rollback support
- Preserve error handling logic (try-catch with error code checking)
- Test constraint changes carefully
- For separate FK additions, use `hasConstraint()` checks or try-catch pattern

## Phase 6: Seed Conversion

### 6.1 Restructure Seed Files

**Move**: `src/migrations/seed*.ts` → `src/database/seeds/`

**Rename**: Following Knex naming convention

- `seedCurrencies.ts` → `01_currencies.ts`
- `seedTranslations.ts` → `02_translations.ts`
- `seedIncomeCategories.ts` → `03_income_categories.ts`
- `seedAssetCategories.ts` → `04_asset_categories.ts`

### 6.2 Convert Seed Functions to Knex

**Files**: All `src/database/seeds/*.ts`

- Replace `pool.connect()` with Knex instance
- Replace `client.query()` with Knex query builder or `.raw()`
- Make seeds idempotent: check if data exists before inserting
- Export `seed()` function: `export async function seed(knex: Knex) { }`

### 6.3 Update Seed Logic

- **currencies.ts**: Check `await knex('currencies').where('code', currency.code).first()` before insert
- **translations.ts**: Check translation_key existence, use `knex.insert().onConflict('translation_key').merge()` or manual check
- **income_categories.ts**: Check name uniqueness before insert
- **asset_categories.ts**: Check name uniqueness before insert

## Phase 7: Query Helper Integration and Direct Pool Usage

### 7.1 Analyze Query Helper Usage

**Current**: `export async function query(text: string, params?: any[])` in `database.ts`

**Used in**: 26+ files across routes, services, migrations

**Direct Pool Usage Identified**:

- `src/utils/currencyHelpers.ts`: Uses `pool.query()` directly (5 functions)
- `src/migrations/seedCurrencies.ts`: Uses `pool.connect()` and `client.query()`
- `src/routes/currencies.ts`: Uses `pool.query()` (36 instances)
- `src/scripts/syncTranslationsToJson.ts`: Creates its own Pool instance

### 7.2 Dual Support Strategy

**Approach**: Provide both helpers during transition

**File**: `src/config/database.ts`

- Keep existing `query()` function (for backward compatibility)
- Keep `pool` export (still used in currencyHelpers, seedCurrencies, currencies routes)
- Add new `knexQuery()` wrapper that uses Knex instance (optional)
- All direct pool usage will continue working (pool remains exported)

### 7.3 Script Files Update

**File**: `src/scripts/syncTranslationsToJson.ts`

- Option A: Keep standalone Pool (works independently)
- Option B: Import shared pool from `database.ts` (recommended for connection reuse)
- Update to use shared `pool` import instead of creating new instance

### 7.4 Optional: Knex Query Builder Adoption

**Future enhancement** (not required for migration):

- Replace raw SQL in routes/services with Knex query builder
- Benefits: Type safety, SQL injection protection, better maintainability
- Timeline: Post-migration optimization

## Phase 8: Update Database Initialization

### 8.1 Modify `initializeDatabase()`

**File**: `src/config/database.ts`

- Remove `runMigrations()` call
- Add Knex migration check: `await knex.migrate.latest()`
- Keep seed logic but use Knex seeds: `await knex.seed.run()` (only if tables empty)
- Preserve existing seed conditional logic (only seed if empty)

### 8.2 Migration Safety Checks

- Check if migrations table exists before running
- Handle migration errors gracefully
- Log migration status

## Phase 9: Heroku Deployment Configuration

### 9.1 Update Build Scripts

**File**: `package.json`

- Ensure `heroku-postbuild` runs migrations: Add `npm run migrate:latest` after build
- Or use Heroku release phase (recommended): Create `Procfile` entry `release: npm run migrate:latest`

### 9.2 Environment Variables

- Verify `DATABASE_URL` is available (Heroku auto-provides)
- Test SSL connection settings
- Verify connection pooling works on Heroku

### 9.3 Migration Execution Strategy

**Production approach**:

- Option A: Run migrations in release phase (recommended for zero-downtime)
- Option B: Run migrations in `initializeDatabase()` on startup (simpler but slower startup)
- Choose based on Heroku tier and app requirements

## Phase 10: Testing and Validation

### 10.1 Local Testing

- Fresh database: Run all migrations, verify schema matches
- Existing database: Test migration detection (should skip already-created tables)
- Rollback testing: Verify `down()` functions work
- Seed testing: Verify seeds are idempotent

### 10.2 Staging Deployment

- Deploy to staging Heroku instance
- Run migrations in release phase
- Verify all tables created correctly
- Verify data integrity
- Test rollback capability

### 10.3 Production Deployment

- Create database backup before migration
- Deploy with migrations
- Monitor for errors
- Verify application functionality
- Have rollback plan ready

## Phase 11: Cleanup (Post-Migration)

### 11.1 Remove Old Migration Code

**File**: `src/config/database.ts`

- Remove `runMigrations()` function (after successful migration)
- Keep `query()` helper (still used in 26+ files)
- Keep `pool` export (if still used)

### 11.2 Update Documentation

- Document new migration workflow
- Update developer onboarding docs
- Document seed process
- Create migration best practices guide

## Implementation Details

### PostgreSQL-Specific Type Handling in Knex

```typescript
// JSONB
table.jsonb('allowed_currency_types').defaultTo('["fiat"]');

// ARRAY types
table.specificType('password_history', 'TEXT[]').defaultTo('ARRAY[]::TEXT[]');
table.specificType('assigned_member_ids', 'INTEGER[]').defaultTo('ARRAY[]::INTEGER[]');

// CHECK constraints
table.check('role IN (\'admin\', \'user\')', [], 'users_role_check');
```

### Migration Naming Convention

Use timestamp-based: `YYYYMMDDHHMMSS_description.ts`

Example: `20250129120000_create_users_table.ts`

### Seed Idempotency Pattern

```typescript
export async function seed(knex: Knex) {
  const existing = await knex('currencies').where('code', 'USD').first();
  if (!existing) {
    await knex('currencies').insert([...]);
  }
}
```

## Risk Mitigation

### Data Safety

- All migrations include `down()` functions for rollback
- Test migrations on production copy before real deployment
- Database backup before production migration

### Backward Compatibility

- Keep existing `query()` helper during transition
- Old migrations won't run twice (Knex tracks applied migrations)
- Seeds check for existing data before inserting

### Deployment Safety

- Use Heroku release phase for migrations (runs before dyno restart)
- Monitor migration logs
- Have rollback script ready

## Success Criteria

1. All 21 tables created via Knex migrations
2. All indexes created
3. All foreign keys and constraints applied
4. Seeds work idempotently
5. Existing `query()` helper still works
6. Migrations tracked in `knex_migrations` table
7. Zero-downtime deployment on Heroku
8. All existing routes/services continue working
9. Application passes all functionality tests

## Timeline Estimate

- Phase 1-2: Knex setup and baseline migration (2-3 hours)
- Phase 3-5: Column and constraint migrations (2-3 hours)
- Phase 6: Seed conversion (1-2 hours)
- Phase 7-8: Integration and initialization updates (1-2 hours)
- Phase 9: Heroku configuration (1 hour)
- Phase 10: Testing (2-3 hours)
- Phase 11: Cleanup (1 hour)

**Total**: 10-15 hours of focused work

## Notes

- This is a foundation-building change: proper migrations enable future scaling
- Can be done incrementally: set up Knex alongside existing system, then switch
- No breaking changes: existing code continues to work
- Knex is query builder, not full ORM: can still use raw SQL when needed

### To-dos

- [ ] Install knex and @types/knex packages, update package.json scripts
- [ ] Create src/database/knexfile.ts with Heroku-compatible configuration for development, staging, and production environments
- [ ] Create src/database/connection.ts to export Knex instance and maintain backward compatibility with existing pool export
- [ ] Create 0000000000000_initial_schema.ts migration with all 21 tables, respecting foreign key dependencies and converting PostgreSQL-specific types (JSONB, ARRAY, CHECK constraints)
- [ ] Create sequential migrations for all column additions (user security columns, asset enhancements, etc.) with proper down() functions
- [ ] Create migration for all 17+ indexes with down() functions
- [ ] Create migration for foreign key constraint updates (CASCADE changes) with rollback support
- [ ] Move seed files from src/migrations/ to src/database/seeds/ and rename to Knex convention (01_currencies.ts, etc.)
- [ ] Convert all 4 seed files to use Knex instance, make idempotent with existence checks before insert
- [ ] Update initializeDatabase() to use knex.migrate.latest() instead of runMigrations(), preserve seed conditional logic with Knex seeds
- [ ] Update Procfile with release phase for migrations or update heroku-postbuild script, verify DATABASE_URL usage
- [ ] Test migrations on fresh database and existing database locally, verify all tables/indexes created correctly
- [ ] Deploy to staging Heroku instance, run migrations in release phase, verify data integrity and functionality
- [ ] Create database backup, deploy to production with migrations, monitor for errors, verify application functionality
- [ ] Remove runMigrations() function from database.ts after successful production migration, keep query() helper and pool export