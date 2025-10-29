#!/bin/bash

# Local Knex Migration Testing Script
# Tests Knex migrations on a local database

set -e

echo "🧪 Testing Knex Migration System Locally..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set. Using default: postgresql://localhost:5432/famhub_test"
    export DATABASE_URL="postgresql://localhost:5432/famhub_test"
fi

echo "📋 Test Plan:"
echo "  1. Build TypeScript"
echo "  2. Check migration status"
echo "  3. Run migrations"
echo "  4. Verify migrations"
echo "  5. Check tables"
echo ""

# Build
echo "📦 Building TypeScript..."
npm run build
echo "✅ Build complete"
echo ""

# Check migration status
echo "📊 Checking migration status..."
npm run migrate:status || echo "⚠️  No migrations table yet (expected for fresh DB)"
echo ""

# Run migrations
echo "🔄 Running migrations..."
npm run migrate:latest
echo "✅ Migrations complete"
echo ""

# Check status again
echo "📊 Checking migration status after run..."
npm run migrate:status
echo ""

# Verify using psql
echo "🔍 Verifying database state..."
psql $DATABASE_URL <<EOF
-- Check knex_migrations table
SELECT 'Migration Count:' as check_type, COUNT(*)::text as result FROM knex_migrations
UNION ALL
SELECT 'Total Tables:', COUNT(*)::text FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 'Users Table Exists:', CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN 'YES' ELSE 'NO' END
UNION ALL
SELECT 'Currencies Table Exists:', CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'currencies') THEN 'YES' ELSE 'NO' END;
EOF

echo ""
echo "✅ Local testing complete!"
echo ""

