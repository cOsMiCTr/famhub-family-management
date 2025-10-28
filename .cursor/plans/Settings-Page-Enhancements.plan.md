# Settings Page Enhancements

## Overview

Redesign the Settings page to include household information, account deletion with share redistribution, PDF data export, 2FA with Google Authenticator, activity log, and move family members management into settings.

## Files to Modify

### Frontend

1. **`client/src/pages/SettingsPage.tsx`**
   - Add household name display from user.household relationship
   - Add "Member Since" with user creation timestamp
   - Remove "Master Admin" tab
   - Replace "Sign Out" with "Delete Account" button
   - Add Delete Account confirmation modal with username input
   - Implement Family Members tab content inline
   - Add PDF Export functionality
   - Add 2FA Setup with QR code generation
   - Add Activity Log display
   - Add Data Privacy information view

2. **`client/src/components/DeleteAccountModal.tsx`** (NEW)
   - Modal with username confirmation input
   - Warning messages about data deletion
   - Progress indicator during deletion
   - Redirect to login after success

3. **`client/src/components/TwoFactorSetupModal.tsx`** (NEW)
   - QR code display for Google Authenticator
   - Setup instructions
   - Verify code input before activation
   - Backup codes generation

4. **`client/src/utils/pdfGenerator.ts`** (NEW)
   - Generate PDF with user data
   - Include assets, income, contracts, transactions
   - Format with proper sections

### Backend

1. **`src/routes/users.ts`** (NEW or update existing)
   - POST /api/users/delete-account endpoint
   - Validate username confirmation
   - Redistribute shared ownership assets
   - Delete or anonymize user data
   - Handle household membership cleanup
   - Return success/error

2. **`src/routes/activity.ts`** (NEW)
   - GET /api/activity endpoint
   - Fetch user activity log
   - Include timestamps, actions, descriptions

3. **`src/routes/twoFactor.ts`** (NEW)
   - POST /api/two-factor/setup - Generate secret and QR
   - POST /api/two-factor/verify - Verify code and enable
   - POST /api/two-factor/disable - Disable 2FA
   - GET /api/two-factor/backup-codes - Get backup codes

4. **`src/routes/export.ts`** (NEW)
   - GET /api/export/pdf - Generate PDF export
   - Include all user data (assets, income, contracts, etc.)

5. **`src/services/twoFactorService.ts`** (NEW)
   - Generate TOTP secret
   - Create QR code for Google Authenticator
   - Verify TOTP codes
   - Generate backup codes

6. **`src/services/shareRedistributionService.ts`** (NEW)
   - Calculate share redistribution on user deletion
   - Distribute percentages to existing shareholders
   - Handle cases where user is sole owner (reassign or delete)
   - Update asset_ownership_distribution table

7. **`src/config/database.ts`**
   - Add `two_factor_enabled` column to users
   - Add `two_factor_secret` column to users (encrypted)
   - Add `backup_codes` column to users (encrypted JSONB array)
   - Add `user_activity` table (user_id, action, description, timestamp)

## Implementation Details

### Household Display
- Query user's household name from database
- Display household name in Profile tab
- Show "Member Since: {user.created_at}" as timestamp

### Delete Account Flow
1. User clicks "Delete Account" button
2. Modal opens with username input
3. User must type exact username to confirm
4. Show warning about data deletion
5. On confirmation:
   - Check all assets where user is owner or has shares
   - For each asset:
     - If sole owner: show error or transfer to household
     - If shared: redistribute shares proportionally to other members with >=1%
     - Preserve 100% total
   - Delete or anonymize income entries
   - Remove from household_members if linked
   - Delete user account
   - Logout and redirect to login

### Share Redistribution Logic
```typescript
// For each asset with shared ownership
1. Get all shareholders
2. Calculate total shares of remaining members
3. If user's share is 0 or user is only owner: skip
4. For each remaining member with share > 0:
   - Calculate their portion: (their_current_share / total_of_others) * user_share
   - Add to their percentage
5. Update asset_ownership_distribution table
```

### Family Members Tab
- Embed HouseholdMembersPage content directly into Settings
- Remove from sidebar navigation
- Keep same CRUD functionality
- Add as Settings tab instead of separate route

### PDF Export
- Use library like jsPDF or pdfmake
- Include sections:
  - User profile information
  - Household information
  - Assets list with valuations
  - Income history
  - Contracts overview
  - Activity log
- Format as readable PDF with proper headers

### Two-Factor Authentication
- Use `speakeasy` library for TOTP generation
- Use `qrcode` library for QR code generation
- Flow:
  1. User clicks "Enable 2FA"
  2. Generate secret and QR code
  3. Show QR code and manual entry code
  4. User scans with Google Authenticator
  5. User enters verification code
  6. Verify and enable 2FA
  7. Generate backup codes (8 codes)
- Store encrypted secret and backup codes
- Require 2FA code on login if enabled

### Activity Log
- Track user actions:
  - Login/logout
  - Settings changes
  - Asset creation/updates
  - Income entries
  - Contract actions
  - Password changes
- Display in chronological order
- Show action type, description, timestamp

### Data Privacy Information
- Display what data is collected:
  - Personal information
  - Asset data
  - Income information
  - Transaction history
  - Activity logs
- Show data retention policies
- GDPR compliance information
- Right to deletion already implemented

### Additional Settings Options
Consider adding:
- Backup/Restore settings (future)
- API keys management (future)
- Data retention preferences
- Email notifications preferences
- Currency preferences (already exists)

## Database Changes

1. Add columns to `users` table:
   - `two_factor_enabled BOOLEAN DEFAULT false`
   - `two_factor_secret TEXT` (encrypted)
   - `backup_codes JSONB` (encrypted array)

2. Create `user_activity` table:
   ```sql
   CREATE TABLE user_activity (
     id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
     action_type VARCHAR(50),
     description TEXT,
     ip_address VARCHAR(45),
     user_agent TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

3. Create indexes:
   - Index on user_activity(user_id, created_at DESC)
   - Index on users(two_factor_enabled)

## Security Considerations
- Encrypt 2FA secrets at rest
- Hash backup codes before storage
- Require username confirmation for account deletion
- Log all deletion activities for audit
- Enforce password before sensitive operations
- Implement rate limiting on 2FA verification attempts
- Use secure random generation for secrets

## Testing Requirements
1. Test account deletion with various ownership scenarios
2. Verify share redistribution maintains 100% total
3. Test 2FA setup and verification flow
4. Verify PDF export contains all user data
5. Test activity log records all actions
6. Verify household information displays correctly
7. Test delete account with shared assets edge cases

## Translation Keys to Add
- settings.deleteAccount
- settings.deleteAccountConfirm
- settings.deleteAccountWarning
- settings.enterUsernameToConfirm
- settings.accountDeleted
- settings.pdfExport
- settings.exportData
- settings.twoFactorAuth
- settings.enable2FA
- settings.backupCodes
- settings.activityLog
- settings.dataPrivacy
- settings.householdName
- settings.memberSince

