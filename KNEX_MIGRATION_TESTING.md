# Knex Migration System - Testing Guide

This guide explains how to test and verify that the migration to Knex.js has been successful.

## Quick Verification Checklist

- [ ] `knex_migrations` table exists in database
- [ ] 2 migrations show as applied in `knex_migrations` table
- [ ] All 22 user tables exist
- [ ] Application starts without errors
- [ ] Console logs show "🔄 Running database migrations..." (Knex, not old system)
- [ ] Release phase completes successfully on Heroku

## Local Testing

### 1. Test on Fresh Database

```bash
# Create test database
createdb famhub_test

# Set DATABASE_URL
export DATABASE_URL="postgresql://localhost:5432/famhub_test"

# Run automated test script
./scripts/test-knex-local.sh

# OR manually:
npm run build
npm run migrate:latest
npm run migrate:status
```

### 2. Verify Database State

```bash
# Run verification script
./scripts/verify-knex-migration.sh

# OR manually check:
psql $DATABASE_URL -c "SELECT * FROM knex_migrations;"
psql $DATABASE_URL -c "\dt"  # List all tables
```

### 3. Check Application Startup

```bash
npm start
# Look for these log messages:
# - "📊 Database connection established"
# - "🔄 Running database migrations..."
# - "✅ Database migrations completed"
```

## Heroku Testing

### 1. Deploy to Heroku

```bash
# Commit changes
git add .
git commit -m "Migrate to Knex.js migration system"
git push heroku main

# Monitor release phase
heroku logs --tail --ps release
```

### 2. Verify on Heroku

```bash
# Run automated test script
./scripts/test-knex-heroku.sh

# OR manually verify:

# Check migration status
heroku run npm run migrate:status

# Connect to database
heroku pg:psql

# Inside psql:
SELECT * FROM knex_migrations;
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
```

### 3. Check Application Logs

```bash
# Check recent logs
heroku logs --tail

# Check for migration-related logs
heroku logs | grep -E "(migration|Migration|Knex)"
```

## Manual Verification Queries

### Check Migration Tracking

```sql
-- See all applied migrations
SELECT * FROM knex_migrations ORDER BY id;

-- Check migration lock
SELECT * FROM knex_migrations_lock;

-- Expected result: is_locked = 0
```

### Verify All Tables

```sql
-- Count total tables (should be 24: 22 user + 2 Knex)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- List all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Verify Seed Data

```sql
-- Check seed data counts
SELECT 
  'currencies' as table_name,
  COUNT(*) as count 
FROM currencies
UNION ALL
SELECT 'translations', COUNT(*) FROM translations
UNION ALL
SELECT 'income_categories', COUNT(*) FROM income_categories
UNION ALL
SELECT 'asset_categories', COUNT(*) FROM asset_categories;
```

## Success Indicators

### ✅ Positive Signs

1. **knex_migrations table exists** with 2 rows:
   - `0000000000000_initial_schema`
   - `0000000000001_create_indexes`

2. **Application logs show Knex messages**:
   - `🔄 Running database migrations...`
   - `✅ Database migrations completed`

3. **All tables accessible** - No "table does not exist" errors

4. **Release phase succeeds** on Heroku (check release logs)

### ❌ Warning Signs

1. **knex_migrations table missing** - Migrations didn't run
2. **Old migration logs** - Still seeing `runMigrations()` messages
3. **Tables missing** - Application errors about missing tables
4. **Release phase fails** - Deployment blocked

## Troubleshooting

### Migrations Not Running

```bash
# Check if migrations are detected
npm run migrate:status

# Force run migrations
npm run migrate:latest

# Check for errors
npm run build
```

### ts-node Not Available on Heroku

If `ts-node` is missing (moved to dependencies), ensure it's installed:

```bash
# Check Heroku dependencies
heroku run npm list ts-node

# If missing, ensure package.json has ts-node in dependencies
```

### Migration Lock Issues

If migrations are stuck:

```sql
-- Check lock status
SELECT * FROM knex_migrations_lock;

-- Manually release lock (if needed)
UPDATE knex_migrations_lock SET is_locked = 0;
```

## Rollback Plan

If migration fails:

```bash
# Rollback last migration
npm run migrate:rollback

# OR on Heroku:
heroku run npm run migrate:rollback

# Restore from backup
heroku pg:backups:restore <backup-url>
```

## Next Steps After Successful Migration

1. **Monitor for 24 hours** - Watch for any migration-related issues
2. **Test all features** - Ensure application works correctly
3. **Remove old code** - Delete `runMigrations()` function from `database.ts`
4. **Update documentation** - Document new migration workflow

## Testing Scripts

Two automated scripts are available:

1. **Local Testing**: `./scripts/test-knex-local.sh`
   - Tests migrations on local database
   - Verifies table creation
   - Checks seed data

2. **Heroku Testing**: `./scripts/test-knex-heroku.sh`
   - Tests migrations on Heroku
   - Verifies migration tracking
   - Checks application state

3. **Verification**: `./scripts/verify-knex-migration.sh`
   - Comprehensive verification
   - Database state check
   - Seed data verification

## Support

If you encounter issues:

1. Check Heroku logs: `heroku logs --tail`
2. Verify database connection: `heroku pg:info`
3. Check migration status: `heroku run npm run migrate:status`
4. Review release phase logs: `heroku releases:info`

