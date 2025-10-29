#!/bin/bash

# Heroku Knex Migration Testing Script
# Tests and verifies Knex migrations on Heroku

set -e

echo "🚀 Testing Knex Migration System on Heroku..."
echo ""

# Check if Heroku CLI is available
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI is not installed"
    exit 1
fi

# Get app name from git remote or prompt
APP_NAME=$(git remote -v | grep heroku | head -1 | awk '{print $1}' | xargs -I {} git remote get-url {} | sed 's/.*://;s/\.git$//')

if [ -z "$APP_NAME" ]; then
    echo "⚠️  Could not detect Heroku app name from git remote"
    read -p "Enter Heroku app name: " APP_NAME
fi

echo "📱 Heroku App: $APP_NAME"
echo ""

echo "📋 Test Plan:"
echo "  1. Check migration status"
echo "  2. Verify knex_migrations table"
echo "  3. Verify all tables exist"
echo "  4. Check application logs"
echo "  5. Verify seed data"
echo ""

# Check migration status
echo "📊 Checking migration status..."
heroku run npm run migrate:status --app $APP_NAME || echo "⚠️  Migration status check failed (may need ts-node)"
echo ""

# Verify migrations table via psql
echo "🔍 Verifying knex_migrations table..."
heroku pg:psql --app $APP_NAME <<EOF
SELECT 
  'Migration Count' as check_type,
  COUNT(*)::text as result
FROM knex_migrations
UNION ALL
SELECT 
  'Migrations Lock',
  is_locked::text
FROM knex_migrations_lock;
EOF

echo ""

# List applied migrations
echo "📋 Applied migrations:"
heroku pg:psql --app $APP_NAME -c "SELECT id, name, batch, migration_time FROM knex_migrations ORDER BY id;" || echo "Could not retrieve migrations"
echo ""

# Check tables
echo "🔍 Verifying key tables..."
heroku pg:psql --app $APP_NAME <<EOF
SELECT 
  table_name,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = t.table_name
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (VALUES 
  ('users'),
  ('households'),
  ('currencies'),
  ('assets'),
  ('translations'),
  ('income_categories'),
  ('asset_categories'),
  ('knex_migrations'),
  ('knex_migrations_lock')
) AS t(table_name);
EOF

echo ""

# Check seed data
echo "🌱 Checking seed data..."
heroku pg:psql --app $APP_NAME <<EOF
SELECT 
  'Currencies' as data_type,
  COUNT(*)::text as count
FROM currencies
UNION ALL
SELECT 
  'Translations',
  COUNT(*)::text
FROM translations
UNION ALL
SELECT 
  'Income Categories',
  COUNT(*)::text
FROM income_categories
UNION ALL
SELECT 
  'Asset Categories',
  COUNT(*)::text
FROM asset_categories;
EOF

echo ""

# Check recent logs for migration messages
echo "📋 Checking recent logs for migration activity..."
heroku logs --num 50 --app $APP_NAME | grep -E "(migration|Migration|Knex|knex)" || echo "No migration-related logs found"
echo ""

echo "✅ Heroku verification complete!"
echo ""
echo "💡 To see real-time release phase logs:"
echo "   heroku logs --tail --ps release --app $APP_NAME"

