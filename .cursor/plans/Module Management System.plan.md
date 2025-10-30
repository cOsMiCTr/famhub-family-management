<!-- 91466788-b2f4-40c7-8daa-264ce5e5998b a52cdd3e-9132-4e0a-b880-d93263f7399e -->
# Module Management System Implementation Plan

## Overview

Implement a token-based modular access control system where users purchase tokens (1 token = 1 module for 1 month) and activate modules themselves. Modules expire automatically after 1 month based on activation order (FIFO). When tokens expire, modules deactivate in the order they were activated. Admins can manage user token accounts and grant tokens. The system controls visibility in sidebar, dashboard KPIs, API endpoints, and feature access throughout the application, and must be future-proof for easy module additions.

## Current State Analysis

### Existing Features That Will Become Modules

**Free/Default Modules** (always available):

- Dashboard (overview page)
- Settings (user preferences)
- Family Members/Household Management

**Paid Modules** (controlled):

- Income (tracking and management)
- Assets (asset management and tracking)

**Admin-Only Features** (role-based, not module-based):

- User Management
- Currency Management
- Translation Management
- Asset/Income Categories
- Security Dashboard
- Admin Dashboard

### Current Navigation Structure

**File**: `client/src/components/Layout.tsx`

Current navigation array:

```typescript
const navigation = [
  { name: t('navigation.dashboard'), href: '/dashboard', icon: HomeIcon },
  { name: t('navigation.income'), href: '/income', icon: BanknotesIcon },
  { name: t('navigation.assets'), href: '/assets', icon: CurrencyDollarIcon },
  { name: t('navigation.settings'), href: '/settings', icon: Cog6ToothIcon },
];
```

### Dashboard KPIs That Need Module Gating

**File**: `client/src/pages/DashboardPage.tsx`

Current stats cards include:

- Total Assets (requires Assets module)
- Monthly Income (requires Income module)
- Family Members (free)
- Active Assets (requires Assets module)

## Phase 1: Database Schema

### 1.1 Create Modules Table

**New Migration**: `src/database/migrations/XXXXXX_create_modules_table.ts`

```typescript
// Modules registry table - defines all available modules in the system
table.string('module_key', 50).primary(); // e.g., 'income', 'assets', 'contracts'
table.string('name', 100).notNullable(); // Display name
table.text('description').nullable();
table.string('category', 50).defaultTo('premium'); // 'free', 'premium'
table.integer('display_order').defaultTo(0);
table.boolean('is_active').defaultTo(true); // Enable/disable module system-wide
table.jsonb('metadata').nullable(); // Future: pricing, features, etc.
table.timestamps(true, true);
```

### 1.2 Create User Token Account Table

**Same Migration**: Include `user_token_account` table

```typescript
// User token balance - tracks available tokens for module activation (supports partial tokens for refunds)
table.increments('id').primary();
table.integer('user_id').notNullable().unique().references('users.id').onDelete('CASCADE');
table.decimal('balance', 10, 2).defaultTo(0).notNullable(); // Current token balance (decimal for partial refunds)
table.decimal('total_tokens_purchased', 10, 2).defaultTo(0); // Lifetime tokens purchased
table.timestamps(true, true);

// Index for fast lookup
table.index('user_id');
```

### 1.3 Create Module Activations Table

**Same Migration**: Include `module_activations` table

```typescript
// Tracks active module activations with expiration dates (FIFO-based expiration)
table.increments('id').primary();
table.integer('user_id').notNullable().references('users.id').onDelete('CASCADE');
table.string('module_key', 50).notNullable().references('modules.module_key').onDelete('CASCADE');
table.timestamp('activated_at').notNullable().defaultTo(knex.fn.now());
table.timestamp('expires_at').notNullable(); // Exactly 1 month from activation
table.integer('activation_order').notNullable(); // FIFO order for expiration priority
table.boolean('is_active').defaultTo(true); // Active until expires_at or manually revoked
table.integer('token_used').defaultTo(1); // Number of tokens consumed (always 1 for now, future: multi-token modules)
table.timestamps(true, true);

// Indexes for performance
table.index('user_id');
table.index('module_key');
table.index(['user_id', 'is_active', 'expires_at']); // Fast lookup for active modules
table.index(['user_id', 'module_key', 'expires_at']); // Check existing active modules
table.index('expires_at'); // For expiration cleanup queries
```

### 1.4 Create Voucher Codes Table

**Same Migration**: Include `voucher_codes` table

```typescript
// Voucher codes (Gutschein codes) that reduce token purchase price
table.increments('id').primary();
table.string('code', 50).notNullable().unique(); // Voucher code (e.g., "WELCOME2024")
table.string('description', 255).nullable();
table.integer('discount_percentage').defaultTo(0); // Percentage discount (0-100)
table.decimal('discount_amount', 10, 2).defaultTo(0); // Fixed discount amount
table.decimal('minimum_purchase', 10, 2).nullable(); // Minimum purchase required
table.integer('max_uses').nullable(); // Maximum number of times code can be used
table.integer('used_count').defaultTo(0); // Current usage count
table.timestamp('valid_from').notNullable();
table.timestamp('valid_until').nullable(); // Null = no expiration
table.boolean('is_active').defaultTo(true);
table.integer('created_by').nullable().references('users.id').onDelete('SET NULL'); // Admin or user who created
table.timestamps(true, true);

// Indexes
table.index('code');
table.index(['is_active', 'valid_until']);
```

### 1.5 Create Voucher Usage Table

**Same Migration**: Include `voucher_usages` table

```typescript
// Track voucher code usage per user
table.increments('id').primary();
table.integer('voucher_id').notNullable().references('voucher_codes.id').onDelete('CASCADE');
table.integer('user_id').notNullable().references('users.id').onDelete('CASCADE');
table.integer('tokens_purchased').notNullable(); // Number of tokens purchased with this voucher
table.decimal('original_price', 10, 2).notNullable();
table.decimal('discount_applied', 10, 2).notNullable();
table.decimal('final_price', 10, 2).notNullable();
table.timestamp('used_at').notNullable().defaultTo(knex.fn.now());

// Indexes
table.index(['voucher_id', 'user_id']); // Prevent duplicate use per user per voucher
table.index('user_id');
```

### 1.6 Seed Initial Modules

**New Seed**: `src/database/seeds/05_modules.ts`

Seed default modules:

```typescript
const modules = [
  { module_key: 'income', name: 'Income Management', category: 'premium', display_order: 1 },
  { module_key: 'assets', name: 'Assets Management', category: 'premium', display_order: 2 },
];
```

Note: Dashboard, Settings, and Family Members are not modules - they are always available.

## Phase 2: Backend Module System

### 2.1 Create Module Service

**New File**: `src/services/moduleService.ts`

Core functions:

- `getAllModules()`: Fetch all registered modules
- `getUserModules(userId)`: Get user's granted modules (return array of module_key strings)
- `hasModuleAccess(userId, moduleKey)`: Check if user has access to specific module
- `grantModule(userId, moduleKey, grantedBy, reason)`: Grant module access
- `revokeModule(userId, moduleKey)`: Revoke module access
- `bulkUpdateUserModules(userId, moduleUpdates)`: Update multiple modules at once

Key implementation:

- For free modules (Dashboard, Settings, Family Members): Always return `true` in `hasModuleAccess`
- Cache user modules in memory with TTL for performance (optional)
- Use transactions for bulk updates

### 2.2 Create Module Middleware

**New File**: `src/middleware/moduleAuth.ts`

```typescript
// Middleware to protect routes by module access
export const requireModule = (moduleKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Free modules always allowed
    const freeModules = ['dashboard', 'settings', 'family_members'];
    if (freeModules.includes(moduleKey)) {
      return next();
    }
    
    const hasAccess = await ModuleService.hasModuleAccess(user.id, moduleKey);
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Module access required',
        requiredModule: moduleKey 
      });
    }
    
    next();
  };
};
```

### 2.3 Update API Routes with Module Protection

**Files to Update**:

1. **`src/routes/income.ts`**

   - Add `requireModule('income')` middleware to all routes (GET, POST, PUT, DELETE)

2. **`src/routes/assets.ts`**

   - Add `requireModule('assets')` middleware to all routes

3. **`src/routes/dashboard.ts`**

   - Modify `/dashboard/summary` to filter out module-restricted data:
     - If user doesn't have 'income': exclude `monthly_income`, income-related stats
     - If user doesn't have 'assets': exclude `total_assets`, asset-related stats
     - If user doesn't have 'contracts': exclude `active_contracts`

### 2.4 Create Admin Module Management Routes

**New File**: `src/routes/modules.ts`

Endpoints:

- `GET /api/admin/modules`: List all modules
- `GET /api/admin/users/:id/modules`: Get user's module access
- `PUT /api/admin/users/:id/modules`: Update user's module access (bulk)
- `POST /api/admin/users/:id/modules/:moduleKey/grant`: Grant single module
- `POST /api/admin/users/:id/modules/:moduleKey/revoke`: Revoke single module

## Phase 3: Frontend Module Context

### 3.1 Create Module Context

**New File**: `client/src/contexts/ModuleContext.tsx`

Provide:

- `userModules`: Array of module_key strings user has access to
- `hasModule(moduleKey)`: Boolean helper function
- `isLoading`: Loading state
- `refreshModules()`: Refresh user's modules from API

**Key Implementation**:

- Fetch on login and store in context
- Cache in localStorage with expiration
- Always include free modules: `['dashboard', 'settings', 'family_members']`

### 3.2 Create Module Hook

**New File**: `client/src/hooks/useModule.ts`

```typescript
export const useModule = (moduleKey: string) => {
  const { hasModule, userModules } = useModuleContext();
  return {
    hasAccess: hasModule(moduleKey),
    isGranted: userModules.includes(moduleKey),
  };
};
```

## Phase 4: Frontend Visibility Controls

### 4.1 Update Sidebar Navigation

**File**: `client/src/components/Layout.tsx`

Update navigation array to filter by module access:

```typescript
const { hasModule } = useModuleContext();

const navigation = [
  { name: t('navigation.dashboard'), href: '/dashboard', icon: HomeIcon, module: null }, // Always show
  { name: t('navigation.income'), href: '/income', icon: BanknotesIcon, module: 'income' },
  { name: t('navigation.assets'), href: '/assets', icon: CurrencyDollarIcon, module: 'assets' },
  { name: t('navigation.settings'), href: '/settings', icon: Cog6ToothIcon, module: null }, // Always show
].filter(item => !item.module || hasModule(item.module));
```

### 4.2 Update Dashboard Page

**File**: `client/src/pages/DashboardPage.tsx`

Filter stats cards by module access:

```typescript
const { hasModule } = useModuleContext();

const statsCards = [
  { title: 'Total Assets', value: formatCurrency(...), module: 'assets', linkTo: '/assets' },
  { title: 'Monthly Income', value: formatCurrency(...), module: 'income', linkTo: '/income' },
  { title: 'Active Contracts', value: stats.activeContracts, module: 'contracts', linkTo: '/contracts' },
  { title: 'Family Members', value: stats.totalMembers, module: null, linkTo: '/family-members' }, // Always show
  { title: 'Active Assets', value: activeAssets.length, module: 'assets', linkTo: '/assets' },
].filter(card => !card.module || hasModule(card.module));
```

Also filter dashboard summary API response handling - don't display KPIs for modules user doesn't have.

### 4.3 Protect Routes

**File**: `client/src/App.tsx`

Update `ProtectedRoute` component or create `ModuleProtectedRoute`:

```typescript
const ModuleProtectedRoute: React.FC<{ 
  children: React.ReactNode;
  requiredModule?: string;
}> = ({ children, requiredModule }) => {
  const { hasModule } = useModuleContext();
  
  if (requiredModule && !hasModule(requiredModule)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};
```

Apply to routes:

- `/income` → `requiredModule="income"`
- `/assets` → `requiredModule="assets"`
- `/contracts` → `requiredModule="contracts"`

### 4.4 Update Auth Context

**File**: `client/src/contexts/AuthContext.tsx`

On login, fetch user's modules and store:

- Add `modules` field to user object
- Fetch modules after successful login
- Store modules in context and localStorage

## Phase 5: Admin Module Management Interface

### 5.1 Create Module Management Component

**New File**: `client/src/components/UserModuleManagement.tsx`

Features:

- Table/grid showing all modules with checkboxes per user
- Bulk update capability (check/uncheck multiple modules)
- Visual indicators for granted/revoked modules
- Search and filter users
- Module metadata display (category, description)

### 5.2 Integrate into User Management Page

**File**: `client/src/pages/UserManagementPage.tsx`

Add new tab or section:

```typescript
<Tab name="Modules">
  <UserModuleManagement userId={selectedUser.id} />
</Tab>
```

Or add module management column/row expander in users table.

### 5.3 Module Management Modal/Page

**Option A**: Modal in UserManagementPage for selected user

**Option B**: Dedicated section in user edit form

**Option C**: Expandable row in users table

Recommended: **Option A** - Add "Manage Modules" button in user row actions that opens modal.

### 5.4 Module Management UI Features

- Toggle switches for each module (granted/revoked)
- Module categories grouped (Free, Premium)
- Visual badges: "Granted", "Not Granted", "Trial" (future)
- Audit trail display (who granted, when, reason)
- Bulk operations: "Grant All Premium", "Revoke All", "Reset to Default"

## Phase 6: Future-Proofing

### 6.1 Module Registration System

**File**: `src/services/moduleRegistry.ts`

Central registry of all modules:

```typescript
export const MODULE_REGISTRY = {
  income: {
    key: 'income',
    name: 'Income Management',
    category: 'premium',
    routes: ['/income'],
    apiEndpoints: ['/api/income'],
    dashboardKpis: ['monthlyIncome'],
    sidebarKey: 'navigation.income',
  },
  assets: {
    key: 'assets',
    name: 'Assets Management',
    category: 'premium',
    routes: ['/assets'],
    apiEndpoints: ['/api/assets'],
    dashboardKpis: ['totalAssets', 'activeAssets'],
    sidebarKey: 'navigation.assets',
  },
  // ... more modules
};
```

### 6.2 Dynamic Module Discovery

When adding a new module:

1. Insert into `modules` table via migration/seed
2. Add to `MODULE_REGISTRY` in code
3. System automatically:

   - Shows/hides in sidebar based on access
   - Protects routes
   - Filters dashboard KPIs
   - Protects API endpoints

No need to modify:

- User management UI (automatically shows new module)
- Module context (automatically includes new module)
- Admin interface (automatically displays new module checkbox)

### 6.3 Module Metadata Support

**File**: `src/database/migrations/XXXXXX_add_module_metadata.ts`

Add columns to `modules` table:

- `icon_name` (Heroicon name)
- `route_patterns` (JSONB: array of route patterns)
- `api_patterns` (JSONB: array of API endpoint patterns)
- `kpi_keys` (JSONB: array of dashboard KPI keys)
- `dependencies` (JSONB: array of module_key dependencies)

Future: Modules can declare their own routes, KPIs, dependencies.

## Phase 7: Testing and Validation

### 7.1 Module Access Scenarios

Test cases:

1. User with no modules: Only sees Dashboard, Settings, Family Members
2. User with Income only: Sees Dashboard, Settings, Family Members, Income
3. User with Assets only: Sees Dashboard, Settings, Family Members, Assets
4. User with all modules: Sees everything
5. Admin: Always sees all modules (or configurable)
6. Module revoke: User loses access immediately (logout/login or refresh)
7. Module grant: User gains access after refresh

### 7.2 API Protection Tests

- Request `/api/income` without module: Returns 403
- Request `/api/assets` without module: Returns 403
- Dashboard summary: Excludes module-restricted data

### 7.3 Dashboard Filtering Tests

- User without Income: No Monthly Income KPI
- User without Assets: No Total Assets KPI
- User without Contracts: No Active Contracts KPI

## Phase 8: Translation Updates

### 8.1 Add Module-Related Translations

**Files**: `client/src/locales/en/translation.json`, `de/translation.json`, `tr/translation.json`

Add keys:

- `modules.title`: "Module Management"
- `modules.income`: "Income Management"
- `modules.assets`: "Assets Management"
- `modules.contracts`: "Contract Management"
- `modules.granted`: "Granted"
- `modules.notGranted`: "Not Granted"
- `modules.required`: "Module access required"
- `modules.missingAccess`: "You don't have access to this module"

### 8.2 Update Seed Translations

**File**: `src/database/seeds/02_translations.ts`

Add all module-related translation keys to seed data.

## Phase 9: Admin UX Enhancements

### 9.1 Module Statistics

In User Management page, show:

- Total modules granted per user
- Module utilization metrics (which modules are most granted)
- Module status badges (Active, Inactive, Trial)

### 9.2 Bulk Module Operations

- Select multiple users → Grant/Revoke module
- Select multiple modules → Grant/Revoke for user
- Preset module packages: "Basic", "Premium", "Enterprise"

### 9.3 Module Audit Log

**Optional**: Track module access changes in `user_activity` table or new `module_access_history` table.

## Implementation Checklist

- [ ] Create database migration for `modules` and `user_module_access` tables
- [ ] Create seed file for initial modules (income, assets, contracts)
- [ ] Create `ModuleService` with CRUD operations
- [ ] Create `requireModule` middleware
- [ ] Protect income routes with module middleware
- [ ] Protect assets routes with module middleware
- [ ] Protect contracts routes with module middleware
- [ ] Update dashboard summary endpoint to filter by module access
- [ ] Create ModuleContext and Provider
- [ ] Create `useModule` hook
- [ ] Update AuthContext to fetch and store user modules on login
- [ ] Update Layout sidebar to filter navigation by module access
- [ ] Update DashboardPage to filter KPIs by module access
- [ ] Protect frontend routes with ModuleProtectedRoute
- [ ] Create UserModuleManagement component
- [ ] Integrate module management into UserManagementPage
- [ ] Create admin API routes for module management
- [ ] Add module-related translations to all languages
- [ ] Update seed translations with module keys
- [ ] Test all module access scenarios
- [ ] Test API protection
- [ ] Test dashboard filtering
- [ ] Document module registration process for future modules

## Files to Create

1. `src/database/migrations/XXXXXX_create_modules_tables.ts`
2. `src/database/seeds/05_modules.ts`
3. `src/services/moduleService.ts`
4. `src/middleware/moduleAuth.ts`
5. `src/routes/modules.ts`
6. `client/src/contexts/ModuleContext.tsx`
7. `client/src/hooks/useModule.ts`
8. `client/src/components/UserModuleManagement.tsx`

## Files to Modify

1. `src/routes/income.ts` - Add module middleware
2. `src/routes/assets.ts` - Add module middleware
3. `src/routes/contracts.ts` - Add module middleware
4. `src/routes/dashboard.ts` - Filter summary by modules
5. `src/routes/admin.ts` - Add module management endpoints (or create separate route)
6. `src/routes/auth.ts` - Return user modules on login
7. `client/src/components/Layout.tsx` - Filter navigation
8. `client/src/pages/DashboardPage.tsx` - Filter KPIs
9. `client/src/pages/UserManagementPage.tsx` - Add module management UI
10. `client/src/App.tsx` - Add ModuleProtectedRoute
11. `client/src/contexts/AuthContext.tsx` - Fetch modules on login
12. `client/src/locales/*/translation.json` - Add module translations
13. `src/database/seeds/02_translations.ts` - Add module translation seeds

## Success Criteria

1. Admins can grant/revoke modules per user in User Management
2. Sidebar navigation filters based on module access
3. Dashboard KPIs only show for modules user has access to
4. API endpoints return 403 for modules user doesn't have
5. Frontend routes redirect to dashboard if module not granted
6. New modules can be added by inserting into database and updating registry
7. System is fully future-proof for monetization
8. All translations are in place

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