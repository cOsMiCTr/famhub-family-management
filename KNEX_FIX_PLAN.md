# Knex Deployment Fix Plan

## ✅ Verification Complete

**Good News:**
- ✅ Migrations ARE compiled: `dist/database/migrations/*.js` exist
- ✅ Seeds ARE compiled: `dist/database/seeds/*.js` exist  
- ✅ knexfile.js IS compiled: `dist/database/knexfile.js` exists
- ✅ TypeScript compilation is working correctly

## 🎯 Primary Issue: Procfile Uses Wrong Script

### Current (BROKEN):
```bash
release: npm run migrate:latest
```

This runs:
```bash
ts-node -r dotenv/config node_modules/.bin/knex migrate:latest --knexfile src/database/knexfile.ts
```

**Problems:**
1. ❌ Uses `ts-node` (not needed in production with compiled files)
2. ❌ Points to `src/database/knexfile.ts` (doesn't exist after build)
3. ❌ Source directory isn't deployed to Heroku, only `dist/` is

### Fixed (CORRECT):
```bash
release: npm run migrate:latest:prod
```

This runs:
```bash
node -r dotenv/config node_modules/.bin/knex migrate:latest --knexfile dist/database/knexfile.js
```

**Why this works:**
1. ✅ Uses `node` (normal JS execution)
2. ✅ Points to `dist/database/knexfile.js` (exists after build)
3. ✅ Uses compiled files that are actually deployed

---

## 📋 Implementation Steps

### Step 1: Update Procfile
```diff
- release: npm run migrate:latest
+ release: npm run migrate:latest:prod
```

### Step 2: Verify package.json Script
Ensure this script exists:
```json
"migrate:latest:prod": "node -r dotenv/config node_modules/.bin/knex migrate:latest --knexfile dist/database/knexfile.js"
```

✅ **Confirmed**: Script already exists in package.json

### Step 3: Test Locally (Before Deploy)
```bash
# Build
npm run build

# Verify files exist
ls dist/database/migrations/*.js
ls dist/database/knexfile.js

# Test production migration script
npm run migrate:latest:prod
```

### Step 4: Handle Existing Migration Records (If Any)
If `knex_migrations` table already has `.ts` entries:
```bash
# Option 1: Run fix script (after deployment)
heroku run node scripts/fix-migration-names.js

# Option 2: Clear and start fresh (ONLY if safe)
heroku pg:psql -c "DELETE FROM knex_migrations;"
```

---

## 🔍 Secondary Issues to Check

### Issue A: Migration Table May Have Wrong Entries
**Risk**: If previous deployment attempts recorded `.ts` files

**Check:**
```bash
heroku pg:psql -c "SELECT * FROM knex_migrations;"
```

**Fix if needed:**
- Run `fix-migration-names.js` script
- Or manually: `UPDATE knex_migrations SET name = REPLACE(name, '.ts', '.js');`

### Issue B: Migration Detection Logic
**Code in `0000000000000_initial_schema.ts`:**
```typescript
const usersTableExists = await knex.schema.hasTable('users');
if (usersTableExists) {
  console.log('⚠️  Tables already exist. Skipping schema creation.');
  return;
}
```

**This is GOOD** - prevents trying to create existing tables

---

## ✅ Pre-Deployment Checklist

- [x] Migrations compile to `dist/database/migrations/*.js`
- [x] Seeds compile to `dist/database/seeds/*.js`
- [x] `knexfile.js` exists in `dist/database/`
- [x] `migrate:latest:prod` script exists in package.json
- [ ] **TODO**: Update Procfile to use `migrate:latest:prod`
- [ ] **TODO**: Test locally with production build
- [ ] **TODO**: Check `knex_migrations` table for existing `.ts` entries

---

## 🚀 Deployment Process (After Fix)

### 1. Update Procfile
```bash
# Edit Procfile
release: npm run migrate:latest:prod
```

### 2. Commit and Deploy
```bash
git add Procfile
git commit -m "Fix Knex deployment: use production migration script"
git push heroku master
```

### 3. Monitor Release Phase
```bash
heroku logs --tail --ps release
```

**Expected output:**
```
Running release command...
Using knexfile: dist/database/knexfile.js
✅ Database migrations completed
```

### 4. Verify Success
```bash
# Check migrations applied
heroku run npm run migrate:status:prod

# Check application starts
heroku logs --tail
```

---

## 🔧 Alternative: Direct Knex Command (If Script Fails)

If `migrate:latest:prod` still has issues, use direct command:

**Procfile:**
```
release: cd dist && node -r dotenv/config ../node_modules/.bin/knex migrate:latest --knexfile database/knexfile.js
```

Or:
```
release: NODE_ENV=production node -r dotenv/config node_modules/.bin/knex migrate:latest --knexfile dist/database/knexfile.js
```

---

## 📊 Summary

| Component | Status | Action Needed |
|-----------|--------|---------------|
| TypeScript compilation | ✅ Working | None |
| Migration files in dist/ | ✅ Present | None |
| knexfile.js in dist/ | ✅ Present | None |
| package.json script | ✅ Exists | None |
| **Procfile** | ❌ **WRONG** | **CHANGE TO**: `migrate:latest:prod` |
| Database migration entries | ⚠️ Unknown | Check after deploy |

---

## 🎯 The ONE Fix Needed

**Change Procfile from:**
```
release: npm run migrate:latest
```

**To:**
```
release: npm run migrate:latest:prod
```

That's it! The rest should work correctly.

