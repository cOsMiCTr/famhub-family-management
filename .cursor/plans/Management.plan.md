# Module Management System - Management Interface Plan

## Overview

This plan focuses on the management interfaces for the token-based module system, including admin tools for managing user modules and token accounts, voucher code generation, and user-facing module activation/deactivation interfaces in Settings.

## Phase 0: Database Schema for Management

The following tables are needed for the management system (from main plan):

### 0.1 User Token Account Table

Already defined in main plan - `user_token_account` table with:

- `balance` (decimal 10,2) - Current token balance
- `total_tokens_purchased` (decimal 10,2) - Lifetime tokens purchased

### 0.2 Module Activations Table

Already defined in main plan - `module_activations` table with:

- FIFO expiration tracking
- Support for stacking/extending activations

### 0.3 Voucher Codes Tables

Already defined in main plan:

- `voucher_codes` table
- `voucher_usages` table

## Phase 1: Token Account Management

### 1.1 Token Account Service

**New File**: `src/services/tokenAccountService.ts`

Core functions:

- `getUserTokenAccount(userId)`: Get user's token account (balance, total purchased)
- `addTokens(userId, amount, source, reason)`: Add tokens to user account (admin grants or purchases)
- `deductTokens(userId, amount, reason)`: Deduct tokens from account (module activation)
- `refundTokens(userId, amount, reason)`: Refund tokens (early deactivation)
- `getTokenPrice()`: Get current token price from settings
- `setTokenPrice(price)`: Admin sets token price

### 1.2 Token Account API Routes

**New File**: `src/routes/tokenAccount.ts` or extend `src/routes/modules.ts`

Admin endpoints (also see Phase 2.4 from main plan):

- `GET /api/admin/modules`: List all modules
- `GET /api/admin/users/:id/modules`: Get user's module access
- `PUT /api/admin/users/:id/modules`: Update user's module access (bulk)
- `POST /api/admin/users/:id/modules/:moduleKey/grant`: Grant single module
- `POST /api/admin/users/:id/modules/:moduleKey/revoke`: Revoke single module
- `GET /api/admin/users/:id/token-account`: Get user's token account details
- `POST /api/admin/users/:id/tokens/grant`: Grant tokens to user (admin only)

User endpoints:

- `GET /api/token-account`: Get own token account details
- `GET /api/token-price`: Get current token price
- `GET /api/modules/available`: Get list of available modules to activate

## Phase 2: User-Facing Module Activation Interface

### 2.1 Settings "Modules" Section

**New File**: `client/src/components/settings/ModulesSection.tsx`

Features:

- Display current token balance prominently
- List of available modules with activation status
- Show active modules with expiration dates
- Activate module button (consumes 1 token)
- Deactivate module button (refunds 0.5 tokens if < 15 days, otherwise no refund)
- Display activation order (FIFO)
- Warning when tokens are low

UI Structure:

```typescript
<TokenBalanceCard>
  <TokenBalanceDisplay balance={tokenBalance} />
  <PurchaseTokensButton />
</TokenBalanceCard>

<AvailableModulesList>
  {modules.map(module => (
    <ModuleCard 
      key={module.key}
      module={module}
      isActive={isActive(module.key)}
      expiresAt={getExpiration(module.key)}
      onActivate={() => activateModule(module.key)}
      onDeactivate={() => deactivateModule(module.key)}
      canDeactivate={canDeactivate(module.key)}
    />
  ))}
</AvailableModulesList>
```

### 2.2 Module Activation API Endpoints

**Extend**: `src/routes/modules.ts`

User endpoints:

- `POST /api/modules/:moduleKey/activate`: Activate module (consumes 1 token)
- `POST /api/modules/:moduleKey/deactivate`: Deactivate module (refunds if < 15 days)
- `GET /api/modules/my-modules`: Get user's active modules with expiration dates

Activation logic:

1. Check token balance >= 1
2. Create module_activation record with:

   - `activated_at`: now
   - `expires_at`: now + 30 days
   - `activation_order`: next FIFO order
   - Deduct 1 token from balance

3. If module already active: extend expiration by 1 month (stacking)

Deactivation logic:

1. Calculate days since activation
2. If < 15 days: refund 0.5 tokens
3. Mark activation as inactive
4. Update token balance (decimal support)

### 2.3 Token Balance Display Component

**New File**: `client/src/components/TokenBalance.tsx`

Display:

- Current balance (with decimals: e.g., "2.5 tokens")
- Formatted currency equivalent (if applicable)
- Low balance warning (< 1 token)
- Link to purchase tokens

## Phase 3: Admin Module Management Interface

### 3.1 User Management Integration

**File**: `client/src/pages/UserManagementPage.tsx`

Add "Module Management" tab or section:

- View user's current active modules
- View user's token account
- Grant/revoke modules directly (bypasses token system for admins)
- Grant tokens to user
- View module activation history

### 3.2 Admin Module Management Component

**New File**: `client/src/components/admin/AdminModuleManagement.tsx`

Also refer to: `client/src/components/UserModuleManagement.tsx` from main plan

Features:

- Table showing all users with module access summary
- Individual user module management modal
- Bulk module operations
- Token account management per user
- Grant tokens to single or multiple users
- Module utilization statistics
- Table/grid showing all modules with checkboxes per user
- Bulk update capability (check/uncheck multiple modules)
- Visual indicators for granted/revoked modules
- Search and filter users
- Module metadata display (category, description)
- Toggle switches for each module (granted/revoked)
- Module categories grouped (Free, Premium)
- Visual badges: "Granted", "Not Granted", "Trial" (future)
- Audit trail display (who granted, when, reason)
- Bulk operations: "Grant All Premium", "Revoke All", "Reset to Default"

UI Structure:

```typescript
<UsersModuleTable>
  <UserRow>
    <UserName />
    <TokenBalance />
    <ActiveModules badges={activeModules} />
    <Actions>
      <ManageModulesButton />
      <GrantTokensButton />
    </Actions>
  </UserRow>
</UsersModuleTable>
```

## Phase 4: Voucher Code Management

### 4.1 Voucher Code Service

**New File**: `src/services/voucherCodeService.ts`

Core functions:

- `generateVoucherCode(settings)`: Generate unique voucher code
- `validateVoucherCode(code, userId)`: Validate and get discount info
- `applyVoucherCode(code, userId, tokensToPurchase)`: Apply voucher to purchase
- `getVoucherCodes(filters)`: List all voucher codes (admin)
- `createVoucherCode(params)`: Create new voucher code
- `updateVoucherCode(id, params)`: Update voucher code
- `deleteVoucherCode(id)`: Deactivate/delete voucher code

### 4.2 Voucher Code API Routes

**New File**: `src/routes/voucherCodes.ts`

Admin endpoints:

- `GET /api/admin/voucher-codes`: List all voucher codes
- `POST /api/admin/voucher-codes`: Create new voucher code
- `PUT /api/admin/voucher-codes/:id`: Update voucher code
- `DELETE /api/admin/voucher-codes/:id`: Delete/deactivate voucher code

User endpoints:

- `POST /api/voucher-codes/validate`: Validate voucher code (check if valid, get discount)
- `POST /api/voucher-codes/:code/apply`: Apply voucher code to token purchase

### 4.3 Admin Voucher Code Management UI

**New File**: `client/src/components/admin/VoucherCodeManagement.tsx`

Features:

- Table of all voucher codes
- Create new voucher code form
- Edit existing voucher codes
- View usage statistics per code
- Generate voucher code with settings:
  - Discount type (percentage or fixed amount)
  - Discount value
  - Minimum purchase requirement
  - Max uses
  - Valid from/until dates
  - Description

### 4.4 User Voucher Code Input

**Integration**: Token purchase flow in Settings

Add voucher code input field:

```typescript
<VoucherCodeInput
  onApply={(code) => applyVoucherCode(code)}
  discount={calculatedDiscount}
/>
```

## Phase 5: Token Purchase Flow

### 5.1 Token Purchase Service

**New File**: `src/services/tokenPurchaseService.ts`

Core functions:

- `initiatePurchase(userId, tokenAmount, voucherCode?)`: Start purchase
- `processPayment(userId, paymentData)`: Process payment (Stripe/PayPal)
- `completePurchase(userId, purchaseId)`: Add tokens after successful payment
- `calculatePrice(tokenAmount, voucherCode?)`: Calculate final price with discount

### 5.2 Token Purchase API Routes

**Extend**: `src/routes/tokenAccount.ts`

Endpoints:

- `POST /api/tokens/purchase`: Initiate token purchase
- `POST /api/tokens/purchase/:id/complete`: Complete purchase after payment
- `POST /api/tokens/purchase/:id/cancel`: Cancel purchase

### 5.3 Token Purchase UI

**New File**: `client/src/components/settings/PurchaseTokensModal.tsx`

Features:

- Select number of tokens to purchase
- Display base price
- Voucher code input field
- Calculate discounted price
- Payment integration (Stripe/PayPal)
- Success/error handling

## Phase 6: Module Expiration Management

### 6.1 Expiration Check Service

**New File**: `src/services/moduleExpirationService.ts`

Core functions:

- `checkExpiredModules()`: Find and deactivate expired modules (FIFO)
- `getUserActiveModules(userId)`: Get active modules with expiration dates
- `scheduleExpirationCheck()`: Scheduled task to check expirations (cron or interval)

### 6.2 Expiration Check on API Requests

**Integration**: Module middleware or service

On every protected API request:

1. Check if user has active module activation
2. Verify `expires_at > now()`
3. If expired, deactivate and return 403

### 6.3 Expiration Check on Login

**Integration**: `src/routes/auth.ts` or `client/src/contexts/AuthContext.tsx`

On login/refresh:

1. Fetch user's active modules
2. Filter expired modules
3. Update module context with only active modules

## Phase 7: Early Deactivation & Refunds

### 7.1 Early Deactivation Logic

**File**: `src/services/moduleService.ts` or new file

Function: `deactivateModuleEarly(userId, moduleKey)`

Logic:

1. Find active module activation
2. Calculate days since `activated_at`
3. If < 15 days:

   - Calculate refund: 0.5 tokens
   - Add to token account balance
   - Mark activation as inactive (`is_active = false`)

4. If >= 15 days:

   - No refund
   - Still allow deactivation (just mark inactive)

5. If multiple activations (stacked):

   - Refund only the most recent activation if applicable
   - Others remain active

### 7.2 Deactivation UI Warning

**Component**: `client/src/components/settings/ModulesSection.tsx`

Show warning when user tries to deactivate:

- "Deactivating within 15 days will refund 0.5 tokens"
- "Deactivating after 15 days will not refund tokens"
- Confirmation dialog

## Phase 8: Settings Integration

### 8.1 Settings Page Structure

**File**: `client/src/pages/SettingsPage.tsx`

Add "Modules" section/tab:

```typescript
<SettingsTabs>
  <Tab name="Profile" />
  <Tab name="Modules" /> {/* New */}
  <Tab name="Preferences" />
</SettingsTabs>
```

### 8.2 Modules Section Layout

**Component**: `client/src/components/settings/ModulesSection.tsx`

Sections:

1. **Token Account Card**

   - Balance display
   - Purchase tokens button
   - Transaction history link

2. **My Modules**

   - Active modules list with expiration dates
   - Deactivate buttons (with refund warnings)
   - Activation order indicator

3. **Available Modules**

   - Inactive modules user can activate
   - Activate buttons (disabled if insufficient tokens)

## Phase 9: Admin Dashboard Enhancements

### 9.1 Module Statistics Dashboard

**New File**: `client/src/components/admin/ModuleStatistics.tsx`

Metrics:

- Total active modules (all users)
- Most popular modules
- Token sales statistics
- Voucher code usage statistics
- Module expiration timeline
- Revenue metrics (if applicable)

### 9.2 Bulk Module Operations

**Component**: `client/src/components/admin/AdminModuleManagement.tsx`

Bulk actions:

- Grant tokens to multiple users
- Grant module access to multiple users
- Revoke module access from multiple users
- Generate multiple voucher codes
- Export module usage report
- Select multiple users → Grant/Revoke module
- Select multiple modules → Grant/Revoke for user
- Preset module packages: "Basic", "Premium", "Enterprise"

### 9.3 Module Audit Log

**Optional**: Track module access changes in `user_activity` table or new `module_access_history` table.

Features:

- Who granted/revoked modules
- When changes were made
- Reason for grant/revoke
- Token account changes
- Module activation/deactivation history

## Implementation Checklist

### Token & Account Management

- [ ] Create token account service with balance management
- [ ] Create token purchase service with payment integration
- [ ] Create voucher code service
- [ ] Create module expiration check service
- [ ] Implement token account API routes
- [ ] Implement token purchase API routes
- [ ] Implement module activation/deactivation API routes
- [ ] Implement voucher code API routes
- [ ] Add admin API routes for module management (from main plan Phase 2.4)

### User Interfaces

- [ ] Create Settings Modules section component
- [ ] Create TokenBalance display component
- [ ] Create PurchaseTokensModal component
- [ ] Create VoucherCodeInput component
- [ ] Integrate Modules section into Settings page

### Admin Interfaces

- [ ] Create AdminModuleManagement component
- [ ] Create UserModuleManagement component (from main plan Phase 5.1)
- [ ] Create VoucherCodeManagement component
- [ ] Create ModuleStatistics dashboard component
- [ ] Integrate module management into UserManagementPage (tab or modal)
- [ ] Add module management UI features (checkboxes, badges, bulk operations)

### Expiration & Access Control

- [ ] Add expiration check on API requests
- [ ] Add expiration check on login/refresh
- [ ] Implement early deactivation with refund logic
- [ ] Add scheduled task for expiration cleanup

### Translations & Testing

- [ ] Add module-related translations
- [ ] Test token purchase flow
- [ ] Test voucher code application
- [ ] Test module activation/deactivation
- [ ] Test early deactivation refunds
- [ ] Test module expiration
- [ ] Test admin grant/revoke operations
- [ ] Test bulk module operations

## Files to Create

1. `src/services/tokenAccountService.ts`
2. `src/services/tokenPurchaseService.ts`
3. `src/services/voucherCodeService.ts`
4. `src/services/moduleExpirationService.ts`
5. `src/routes/tokenAccount.ts`
6. `src/routes/voucherCodes.ts`
7. `client/src/components/settings/ModulesSection.tsx`
8. `client/src/components/TokenBalance.tsx`
9. `client/src/components/settings/PurchaseTokensModal.tsx`
10. `client/src/components/admin/AdminModuleManagement.tsx`
11. `client/src/components/admin/VoucherCodeManagement.tsx`
12. `client/src/components/admin/ModuleStatistics.tsx`
13. `client/src/components/VoucherCodeInput.tsx`
14. `client/src/components/UserModuleManagement.tsx` (from main plan - may overlap with AdminModuleManagement)

## Files to Modify

1. `client/src/pages/SettingsPage.tsx` - Add Modules tab/section
2. `client/src/pages/UserManagementPage.tsx` - Add module management tab/section with UserModuleManagement component
3. `src/routes/modules.ts` - Add activation/deactivation endpoints and admin management endpoints
4. `src/routes/auth.ts` - Add expiration check on login
5. `src/services/moduleService.ts` - Add early deactivation logic and grant/revoke functions
6. `client/src/locales/*/translation.json` - Add management translations
7. `src/database/seeds/02_translations.ts` - Add management translation keys

Note: Routes from main plan Phase 2.4 should be integrated into `src/routes/modules.ts`:

- `GET /api/admin/modules`: List all modules
- `GET /api/admin/users/:id/modules`: Get user's module access
- `PUT /api/admin/users/:id/modules`: Update user's module access (bulk)
- `POST /api/admin/users/:id/modules/:moduleKey/grant`: Grant single module
- `POST /api/admin/users/:id/modules/:moduleKey/revoke`: Revoke single module

## Success Criteria

1. Users can view token balance in Settings
2. Users can purchase tokens with payment integration
3. Users can activate/deactivate modules themselves
4. Users receive partial refunds for early deactivation (< 15 days)
5. Admins can grant tokens to users
6. Admins can grant/revoke modules directly
7. Admins can create and manage voucher codes
8. Users can apply voucher codes to token purchases
9. Modules expire automatically after 1 month (FIFO)
10. Expired modules are checked on login and API requests
11. All management interfaces are accessible and functional
12. All translations are in place