# Heroku Deployment with Knex Migrations

## Quick Start

### 1. Pre-Deployment Checklist

- [ ] Code committed and pushed
- [ ] `ts-node` is in `dependencies` (not `devDependencies`)
- [ ] `Procfile` has release phase: `release: npm run migrate:latest`
- [ ] Migrations are in `src/database/migrations/`
- [ ] Seeds are in `src/database/seeds/`

### 2. Deploy to Heroku

```bash
# Commit all changes
git add .
git commit -m "Migrate to Knex.js migration system"

# Deploy
git push heroku main
```

### 3. Monitor Release Phase

```bash
# Watch release phase in real-time (CRITICAL)
heroku logs --tail --ps release

# What to look for:
# ✅ "🔄 Running database migrations..."
# ✅ "✅ Database migrations completed"
# ❌ Any errors or timeouts
```

### 4. Verify Migration Success

```bash
# Option 1: Use automated script
./scripts/test-knex-heroku.sh

# Option 2: Manual verification
heroku pg:psql -c "SELECT * FROM knex_migrations;"
heroku run npm run migrate:status
```

## Release Phase Details

The `Procfile` contains:

```
release: npm run migrate:latest
web: npm start
```

**Important**: 
- Release phase runs **before** dynos restart
- If migrations fail, deployment is **blocked**
- Monitor release phase logs carefully
- Migrations use `ts-node` (now in dependencies)

## Verification Commands

### Check Migration Status

```bash
heroku run npm run migrate:status
```

### Connect to Database

```bash
heroku pg:psql
```

Inside psql:
```sql
-- See applied migrations
SELECT * FROM knex_migrations ORDER BY id;

-- Count tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verify key tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'currencies', 'knex_migrations');
```

### Check Application Logs

```bash
# Recent logs
heroku logs --tail

# Filter for migration messages
heroku logs | grep -E "(migration|Migration)"
```

## Troubleshooting

### Release Phase Fails

**Symptom**: Deployment blocked, release phase error

**Solution**:
1. Check logs: `heroku logs --tail --ps release`
2. Common causes:
   - Missing `ts-node` in dependencies
   - Database connection issues
   - Migration syntax errors
3. Fix and redeploy

### Migrations Not Applied

**Symptom**: `knex_migrations` table empty or missing

**Solution**:
```bash
# Force run migrations
heroku run npm run migrate:latest

# Verify
heroku pg:psql -c "SELECT * FROM knex_migrations;"
```

### ts-node Not Found

**Symptom**: `Cannot find module 'ts-node'`

**Solution**:
```bash
# Verify ts-node is in dependencies
grep -A 20 '"dependencies"' package.json | grep ts-node

# If missing, move from devDependencies to dependencies
# Then redeploy
```

### Database Connection Issues

**Symptom**: Connection timeout or SSL errors

**Solution**:
```bash
# Check DATABASE_URL
heroku config:get DATABASE_URL

# Verify database is accessible
heroku pg:info

# Check SSL settings in knexfile.ts
```

## Success Criteria

✅ Migration successful if:

1. Release phase completes without errors
2. `knex_migrations` table has 2 entries:
   - `0000000000000_initial_schema`
   - `0000000000001_create_indexes`
3. Application starts successfully
4. All API endpoints respond correctly
5. No "table does not exist" errors in logs

## Rollback Procedure

If migration fails critically:

```bash
# 1. Rollback last migration
heroku run npm run migrate:rollback

# 2. OR restore from backup
heroku pg:backups:restore <backup-url>

# 3. Redeploy previous version
git revert <commit-hash>
git push heroku main
```

## Post-Deployment Monitoring

After successful deployment:

1. **Monitor logs** for 24 hours
   ```bash
   heroku logs --tail
   ```

2. **Test all features**:
   - Login/authentication
   - Dashboard
   - Assets management
   - Settings
   - API endpoints

3. **Check for errors**:
   ```bash
   heroku logs --tail | grep -i error
   ```

4. **Verify database**:
   ```bash
   heroku pg:psql -c "SELECT COUNT(*) FROM users;"
   ```

## Migration Commands Reference

```bash
# Check status
npm run migrate:status

# Run migrations
npm run migrate:latest

# Rollback
npm run migrate:rollback

# Run seeds
npm run seed:run

# On Heroku (with heroku run prefix)
heroku run npm run migrate:status
heroku run npm run migrate:latest
```

## Configuration Files

- **knexfile.ts**: Migration configuration (`src/database/knexfile.ts`)
- **Procfile**: Release phase configuration
- **package.json**: Migration scripts and dependencies

## Support

For issues:
1. Check Heroku release logs
2. Verify database connectivity
3. Check migration status
4. Review application logs for errors

