#!/bin/bash

# Knex Migration Verification Script
# This script verifies that Knex migrations are working correctly

set -e

echo "🔍 Verifying Knex Migration System..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL environment variable is not set${NC}"
    exit 1
fi

echo -e "${GREEN}✅ DATABASE_URL is set${NC}"
echo ""

# Check if knex_migrations table exists
echo "1. Checking knex_migrations table..."
MIGRATIONS_EXISTS=$(psql $DATABASE_URL -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'knex_migrations');" 2>/dev/null | xargs)

if [ "$MIGRATIONS_EXISTS" = "t" ]; then
    echo -e "${GREEN}   ✅ knex_migrations table exists${NC}"
    
    # Count migrations
    MIGRATION_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM knex_migrations;" 2>/dev/null | xargs)
    echo -e "${GREEN}   ✅ Found $MIGRATION_COUNT applied migration(s)${NC}"
    
    # List migrations
    echo "   Applied migrations:"
    psql $DATABASE_URL -c "SELECT id, name, batch, migration_time FROM knex_migrations ORDER BY id;" 2>/dev/null || echo "   (Could not retrieve migration list)"
else
    echo -e "${YELLOW}   ⚠️  knex_migrations table does not exist${NC}"
    echo -e "${YELLOW}   💡 Run 'npm run migrate:latest' to create it${NC}"
fi

echo ""

# Check knex_migrations_lock table
echo "2. Checking knex_migrations_lock table..."
LOCK_EXISTS=$(psql $DATABASE_URL -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'knex_migrations_lock');" 2>/dev/null | xargs)

if [ "$LOCK_EXISTS" = "t" ]; then
    echo -e "${GREEN}   ✅ knex_migrations_lock table exists${NC}"
    
    IS_LOCKED=$(psql $DATABASE_URL -t -c "SELECT is_locked FROM knex_migrations_lock;" 2>/dev/null | xargs)
    if [ "$IS_LOCKED" = "0" ]; then
        echo -e "${GREEN}   ✅ Migration lock is released (migrations can run)${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Migration lock is active (migrations may be running)${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  knex_migrations_lock table does not exist${NC}"
fi

echo ""

# Count total tables
echo "3. Checking total tables..."
TABLE_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null | xargs)
echo "   Found $TABLE_COUNT table(s)"

if [ -n "$TABLE_COUNT" ]; then
    if [ "$TABLE_COUNT" -ge 22 ]; then
        echo -e "${GREEN}   ✅ Expected at least 22 user tables (found $TABLE_COUNT)${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Expected at least 22 user tables, but found $TABLE_COUNT${NC}"
    fi
fi

echo ""

# Verify key tables exist
echo "4. Verifying key tables exist..."
KEY_TABLES=("users" "households" "currencies" "assets" "translations" "income_categories" "asset_categories")

for table in "${KEY_TABLES[@]}"; do
    EXISTS=$(psql $DATABASE_URL -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" 2>/dev/null | xargs)
    if [ "$EXISTS" = "t" ]; then
        echo -e "${GREEN}   ✅ $table exists${NC}"
    else
        echo -e "${RED}   ❌ $table is missing${NC}"
    fi
done

echo ""

# Check seed data (if tables exist)
echo "5. Checking seed data..."
CURRENCY_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM currencies;" 2>/dev/null | xargs 2>/dev/null)
if [ -n "$CURRENCY_COUNT" ] && [ "$CURRENCY_COUNT" -gt 0 ]; then
    echo -e "${GREEN}   ✅ Currencies seeded ($CURRENCY_COUNT found)${NC}"
else
    echo -e "${YELLOW}   ⚠️  No currencies found (may need seeding)${NC}"
fi

TRANSLATION_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM translations;" 2>/dev/null | xargs 2>/dev/null)
if [ -n "$TRANSLATION_COUNT" ] && [ "$TRANSLATION_COUNT" -gt 0 ]; then
    echo -e "${GREEN}   ✅ Translations seeded ($TRANSLATION_COUNT found)${NC}"
else
    echo -e "${YELLOW}   ⚠️  No translations found (may need seeding)${NC}"
fi

echo ""
echo -e "${GREEN}✅ Verification complete!${NC}"
echo ""

