# Knex Deployment Issues - Root Cause Analysis

## 🔍 Problems Identified

### Problem 1: **Procfile Uses Wrong Migration Script** ❌

**Current Procfile:**
```
release: npm run migrate:latest
```

**What `migrate:latest` does:**
```json
"migrate:latest": "ts-node -r dotenv/config node_modules/.bin/knex migrate:latest --knexfile src/database/knexfile.ts"
```

**Issues:**
1. ❌ Uses `ts-node` in production (may not work correctly with compiled files)
2. ❌ Points to `src/database/knexfile.ts` which **doesn't exist** in production (only in source)
3. ❌ After `npm run build`, source files are in `dist/`, not `src/`

**What it SHOULD use:**
```json
"migrate:latest:prod": "node -r dotenv/config node_modules/.bin/knex migrate:latest --knexfile dist/database/knexfile.js"
```

✅ This uses compiled `dist/database/knexfile.js` which exists in production

---

### Problem 2: **Path Resolution in Production**

**knexfile.ts code:**
```typescript
const baseDir = __dirname;  // In production: dist/database
const migrationsDir = path.join(baseDir, 'migrations');  // dist/database/migrations
const seedsDir = path.join(baseDir, 'seeds');  // dist/database/seeds
```

**This should work correctly IF:**
- ✅ The script loads `dist/database/knexfile.js` (not `src/database/knexfile.ts`)
- ✅ Compiled migration files exist in `dist/database/migrations/`
- ✅ Migration files are `.js` (which they should be after compilation)

**BUT there's a catch:**
- The migration files are named `0000000000000_initial_schema.ts`
- After compilation: `0000000000000_initial_schema.js`
- The `knex_migrations` table might still have `.ts` entries from previous attempts

---

### Problem 3: **Migration File Extension Mismatch**

**Scenario:**
1. First deployment: Knex sees `.ts` files, records `.ts` in `knex_migrations` table
2. Production needs `.js` files (compiled)
3. Knex looks for `.ts` files but finds `.js` files
4. Error: "migration directory is corrupt, the following files are missing"

**Solution:** The `knex_migrations` table needs to have `.js` entries, not `.ts`

---

### Problem 4: **TypeScript Files Not Compiled to dist/**

**Check if migrations are compiled:**
- Source: `src/database/migrations/*.ts`
- Expected in production: `dist/database/migrations/*.js`

**If migrations aren't in dist/**:
- They won't be found during release phase
- Knex will fail to find migration files

---

## 🔧 Root Causes Summary

| Issue | Current State | Required State | Impact |
|-------|--------------|----------------|--------|
| **Procfile script** | `migrate:latest` (uses ts-node + src/) | `migrate:latest:prod` (uses node + dist/) | ❌ CRITICAL |
| **knexfile path** | Script points to `src/database/knexfile.ts` | Should point to `dist/database/knexfile.js` | ❌ CRITICAL |
| **Migration entries** | May have `.ts` in database | Should have `.js` in database | ⚠️ MEDIUM |
| **File compilation** | Unknown if migrations compile | Must compile to `dist/` | ⚠️ MEDIUM |

---

## ✅ Solutions

### Solution 1: Fix Procfile (REQUIRED)

**Change:**
```
release: npm run migrate:latest:prod
```

Or create a production-specific script that doesn't need ts-node.

### Solution 2: Verify Migration Compilation

Check `tsconfig.json` to ensure migrations are compiled:

```json
{
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "client"]
}
```

✅ Migrations should be included and compiled to `dist/database/migrations/`

### Solution 3: Ensure Database Has .js Entries

If migrations were previously attempted:
- Run `scripts/fix-migration-names.js` to update database entries from `.ts` to `.js`
- Or manually update: `UPDATE knex_migrations SET name = REPLACE(name, '.ts', '.js')`

### Solution 4: Alternative - Use Direct Knex Command

**Procfile:**
```
release: node -r dotenv/config node_modules/.bin/knex migrate:latest --knexfile dist/database/knexfile.js
```

This bypasses npm scripts entirely.

---

## 🧪 Testing Strategy

### Before Deployment:
1. ✅ Build locally: `npm run build`
2. ✅ Verify `dist/database/knexfile.js` exists
3. ✅ Verify `dist/database/migrations/*.js` exist
4. ✅ Check migration names end with `.js`

### During Deployment:
1. ✅ Monitor release phase: `heroku logs --tail --ps release`
2. ✅ Watch for path errors
3. ✅ Check if migrations run successfully

### After Deployment:
1. ✅ Check `knex_migrations` table: `heroku pg:psql -c "SELECT * FROM knex_migrations;"`
2. ✅ Verify entries show `.js` extension
3. ✅ Check application starts: `heroku logs --tail`

---

## 📝 Recommended Changes

1. **Update Procfile:**
   ```
   release: npm run migrate:latest:prod
   ```

2. **Verify package.json script:**
   ```json
   "migrate:latest:prod": "node -r dotenv/config node_modules/.bin/knex migrate:latest --knexfile dist/database/knexfile.js"
   ```

3. **Add migration compilation check script:**
   - Verify migrations compile before deployment
   - Check file existence in `dist/`

4. **Update knexfile.ts comments:**
   - Document that production uses compiled files
   - Note that paths resolve to `dist/` in production

---

## 🎯 Next Steps

1. ✅ Fix Procfile to use production script
2. ✅ Verify TypeScript compilation includes migrations
3. ✅ Test locally with production build
4. ✅ Create pre-deployment checklist
5. ✅ Document the correct deployment process

