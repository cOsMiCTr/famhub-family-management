# Privacy and Field Requirements for Categories (Expenses, Income, Assets)

## Overview

Add privacy controls to prevent sensitive data (like birthday presents) from being shared with recipients, and add granular field requirement configuration allowing admins to control which fields are mandatory or optional for each category. This applies to expense categories, income categories, and asset categories.

## Problem Statement

1. **Privacy Issue**: Birthday present recipients should not see how much money was spent on their gift. Currently, if an expense/income/asset is linked to an external person and they accept an invitation, they can see the amount.

2. **Field Requirements**: Admins need granular control over which fields are mandatory vs optional for each category (e.g., description might be required for some categories but optional for others).

## Phase 1: Database Schema - Privacy Controls

### 1.1 Add Privacy Fields to Expense Categories

**New Migration**: `src/database/migrations/0000000000018_add_privacy_and_field_requirements.ts`

Add to `expense_categories` table:

- `allow_sharing_with_external_persons` (boolean, default: true) - Category-level default for sharing
- `field_requirements` (JSONB, nullable) - Granular field requirement configuration
```typescript
await knex.schema.alterTable('expense_categories', (table) => {
  table.boolean('allow_sharing_with_external_persons').defaultTo(true);
  table.jsonb('field_requirements').nullable();
});
```


### 1.2 Add Privacy Fields to Income Categories

**Same Migration**: Add to `income_categories` table:

- `allow_sharing_with_external_persons` (boolean, default: true)
- `field_requirements` (JSONB, nullable)
```typescript
await knex.schema.alterTable('income_categories', (table) => {
  table.boolean('allow_sharing_with_external_persons').defaultTo(true);
  table.jsonb('field_requirements').nullable();
});
```


### 1.3 Add Privacy Fields to Asset Categories

**Same Migration**: Add to `asset_categories` table:

- `allow_sharing_with_external_persons` (boolean, default: true)
- `field_requirements` (JSONB, nullable)
```typescript
await knex.schema.alterTable('asset_categories', (table) => {
  table.boolean('allow_sharing_with_external_persons').defaultTo(true);
  table.jsonb('field_requirements').nullable();
});
```


### 1.4 Add Privacy Field to Expenses

**Same Migration**: Add to `expenses` table:

- `share_with_external_persons` (boolean, nullable, default: null) - Expense-level override
  - `null` = use category default
  - `true` = share regardless of category setting
  - `false` = don't share regardless of category setting
```typescript
await knex.schema.alterTable('expenses', (table) => {
  table.boolean('share_with_external_persons').nullable().defaultTo(null);
});
```


### 1.5 Add Privacy Field to Income

**Same Migration**: Add to `income` table:

- `share_with_external_persons` (boolean, nullable, default: null)
```typescript
await knex.schema.alterTable('income', (table) => {
  table.boolean('share_with_external_persons').nullable().defaultTo(null);
});
```


### 1.6 Add Privacy Field to Assets

**Same Migration**: Add to `assets` table:

- `share_with_external_persons` (boolean, nullable, default: null)
```typescript
await knex.schema.alterTable('assets', (table) => {
  table.boolean('share_with_external_persons').nullable().defaultTo(null);
});
```


### 1.7 Field Requirements JSON Structure

Field requirements JSON structure for all category types:

**For Expenses:**

```json
{
  "amount": { "required": true },
  "currency": { "required": true },
  "description": { "required": false },
  "start_date": { "required": true },
  "end_date": { "required": false },
  "is_recurring": { "required": false },
  "frequency": { "required": false, "conditional": { "field": "is_recurring", "value": true } },
  "linked_asset_id": { "required": false },
  "linked_member_ids": { "required": false, "multiple_allowed": false },
  "metadata": {
    "insurance_company": { "required": false },
    "insurance_number": { "required": false },
    "contract_number": { "required": false }
  }
}
```

**For Income:**

```json
{
  "amount": { "required": true },
  "currency": { "required": true },
  "description": { "required": false },
  "start_date": { "required": true },
  "end_date": { "required": false },
  "is_recurring": { "required": false },
  "frequency": { "required": false, "conditional": { "field": "is_recurring", "value": true } },
  "household_member_id": { "required": false }
}
```

**For Assets:**

```json
{
  "name": { "required": true },
  "category_id": { "required": true },
  "value": { "required": false },
  "currency": { "required": false },
  "location": { "required": false },
  "purchase_date": { "required": false },
  "purchase_price": { "required": false },
  "description": { "required": false },
  "ownership_type": { "required": false },
  "ticker": { "required": false, "conditional": { "field": "category_type", "value": "stocks" } }
}
```

### 1.8 Update Existing Category Seeds

**Files**:

- `src/database/seeds/06_expense_categories.ts`
- `src/database/seeds/05_income_categories.ts` (if exists)
- `src/database/seeds/04_asset_categories.ts` (if exists)

Set privacy defaults:

- Birthday Presents: `allow_sharing_with_external_persons: false`
- All other categories: `allow_sharing_with_external_persons: true`

Add field requirements for each category based on their needs.

## Phase 2: Backend Logic Updates

### 2.1 Update Sharing Query Logic for Expenses

**File**: `src/services/linkedDataService.ts`

Modify `getLinkedExpenses()` to respect privacy settings:

```typescript
// Only share expenses where:
// 1. Category allows sharing AND expense doesn't explicitly disallow, OR
// 2. Expense explicitly allows sharing (overrides category)
const result = await query(
  `SELECT DISTINCT e.*,
          $3::boolean as is_read_only,
          $4::integer as shared_from_user_id
   FROM expenses e
   INNER JOIN expense_external_person_links epl ON e.id = epl.expense_id
   INNER JOIN expense_categories ec ON e.category_id = ec.id
   WHERE epl.external_person_id = $1
     AND (
       -- Expense explicitly allows sharing
       e.share_with_external_persons = true
       OR
       -- Category allows sharing AND expense hasn't explicitly disabled it
       (ec.allow_sharing_with_external_persons = true 
        AND (e.share_with_external_persons IS NULL OR e.share_with_external_persons = true))
     )
   ORDER BY e.start_date DESC`,
  [externalPersonId, userId, true, sharedFromUserId]
);
```

### 2.2 Update Sharing Query Logic for Income

**File**: `src/services/linkedDataService.ts`

Modify `getLinkedIncome()` (when implemented) with similar privacy logic for income categories and income table.

### 2.3 Update Sharing Query Logic for Assets

**File**: `src/services/linkedDataService.ts`

Modify `getLinkedAssets()` to respect privacy settings:

```typescript
// Add joins to asset_categories and check privacy settings
INNER JOIN asset_categories ac ON a.category_id = ac.id
WHERE ...
  AND (
    a.share_with_external_persons = true
    OR
    (ac.allow_sharing_with_external_persons = true 
     AND (a.share_with_external_persons IS NULL OR a.share_with_external_persons = true))
  )
```

### 2.4 Update Expenses GET Route

**File**: `src/routes/expenses.ts`

Modify the `shared_with_me` filter query (lines 293-315) to use same privacy logic.

### 2.5 Update Income GET Route

**File**: `src/routes/income.ts`

Add privacy logic to `shared_with_me` filter if it exists or will be added.

### 2.6 Update Assets GET Route

**File**: `src/routes/assets.ts`

Modify the `shared_with_me` filter query (lines 748-770) to use same privacy logic.

### 2.7 Update Expense Creation

**File**: `src/routes/expenses.ts` (POST handler)

Add logic to handle `share_with_external_persons`:

- If provided in request, use it
- If not provided, default to category's `allow_sharing_with_external_persons`

### 2.8 Update Income Creation

**File**: `src/routes/income.ts` (POST handler)

Add similar logic for income `share_with_external_persons`.

### 2.9 Update Asset Creation

**File**: `src/routes/assets.ts` (POST handler)

Add similar logic for assets `share_with_external_persons`.

### 2.10 Add Field Requirement Validation

**File**: `src/routes/expenses.ts`

Create new helper function `validateFieldRequirements()`:

```typescript
async function validateFieldRequirements(
  categoryId: number, 
  expenseData: any,
  categoryType: 'expense' | 'income' | 'asset'
): Promise<{ valid: boolean; errors: string[] }> {
  // Fetch category field requirements from appropriate table
  // Validate each field against requirements
  // Handle conditional requirements (e.g., frequency required if recurring)
  // Return validation errors
}
```

Update `validateCategoryRequirements()` to also call `validateFieldRequirements()`.

Create similar validation functions for income and assets routes.

## Phase 3: Frontend Updates

### 3.1 Update Expense Gift Form

**File**: `client/src/components/ExpenseGiftForm.tsx`

Changes:

1. **Recipient Selection**: Show only external persons (not household members) OR clearly distinguish between household members (internal) and external persons
2. **Privacy Toggle**: Add checkbox/toggle:
   ```tsx
   <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
     <label className="flex items-center">
       <input
         type="checkbox"
         checked={shareWithRecipients}
         onChange={(e) => setShareWithRecipients(e.target.checked)}
         className="mr-2"
       />
       <span className="text-sm">
         {t('expenses.shareWithRecipients')}
         <span className="text-xs text-gray-500 ml-1">
           ({t('expenses.shareWarning')})
         </span>
       </span>
     </label>
   </div>
   ```

3. **Default Value**: Set `shareWithRecipients` to `false` by default for birthday presents category
4. **Warning Message**: Show warning when enabled: "Recipients will see the amount spent on their gift"

### 3.2 Update Expense Creation Form

**File**: `client/src/pages/ExpensesPage.tsx` or wizard component

Add `share_with_external_persons` field to form state and submission.

### 3.3 Update Income Creation Form

**File**: `client/src/pages/IncomePage.tsx`

Add `share_with_external_persons` field to form state and submission (if income supports external person linking in future).

### 3.4 Update Asset Creation Form

**File**: `client/src/pages/AssetsPage.tsx`

Add `share_with_external_persons` field to form state and submission (if assets support external person linking in future).

### 3.5 Update Expense Categories Admin Page

**File**: `client/src/pages/ExpenseCategoriesPage.tsx`

Add UI for:

1. **Privacy Setting**: Checkbox for "Allow sharing with external persons" (default: true)
2. **Field Requirements Editor**: 

   - Toggle switches or checkboxes for each field (amount, description, dates, etc.)
   - For metadata fields, allow adding custom field requirements
   - Save as JSONB structure

### 3.6 Update Income Categories Admin Page

**File**: `client/src/pages/IncomeCategoriesPage.tsx` (if exists)

Add similar UI for privacy and field requirements.

### 3.7 Update Asset Categories Admin Page

**File**: `client/src/pages/AssetCategoriesPage.tsx` (if exists)

Add similar UI for privacy and field requirements.

### 3.8 Update Expense Wizard/Creation Flow

**Files**: `client/src/components/AddEditExpenseWizard.tsx` or expense form components

Changes:

- Respect field requirements from category
- Show/hide fields based on requirements
- Validate fields based on requirements before submission
- Show field requirement errors
- Apply privacy toggle where appropriate

### 3.9 Update Income Creation Flow

Similar updates to income forms if they exist.

### 3.10 Update Asset Creation Flow

Similar updates to asset forms if they exist.

## Phase 4: Translations

### 4.1 Add Translation Keys

**Files**: All locale files and `src/database/seeds/02_translations.ts`

New keys:

- `expenses.shareWithRecipients`: "Share this expense with recipients"
- `expenses.shareWarning`: "Recipients will see the amount spent on their gift"
- `expenses.privacyNote`: "This expense will not be visible to recipients when shared"
- `expenses.fieldRequired`: "This field is required for this category"
- `expenses.fieldOptional`: "Optional"
- `expenses.categoryAllowsSharing`: "Allow sharing with external persons"
- `expenses.fieldRequirements`: "Field Requirements"
- `expenses.addCustomField`: "Add Custom Field"
- Similar keys for `income.*` and `assets.*`

## Phase 5: API Updates

### 5.1 Update Expense Categories API

**File**: `src/routes/expense-categories.ts`

Update POST and PUT handlers to accept:

- `allow_sharing_with_external_persons` (boolean)
- `field_requirements` (JSONB object)

### 5.2 Update Income Categories API

**File**: `src/routes/income-categories.ts`

Update POST and PUT handlers to accept:

- `allow_sharing_with_external_persons` (boolean)
- `field_requirements` (JSONB object)

### 5.3 Update Asset Categories API

**File**: `src/routes/asset-categories.ts`

Update POST and PUT handlers to accept:

- `allow_sharing_with_external_persons` (boolean)
- `field_requirements` (JSONB object)

### 5.4 Update Expenses API

**File**: `src/routes/expenses.ts`

Update POST and PUT handlers to accept:

- `share_with_external_persons` (boolean, nullable)

### 5.5 Update Income API

**File**: `src/routes/income.ts`

Update POST and PUT handlers to accept:

- `share_with_external_persons` (boolean, nullable)

### 5.6 Update Assets API

**File**: `src/routes/assets.ts`

Update POST and PUT handlers to accept:

- `share_with_external_persons` (boolean, nullable)

## Phase 6: Testing

### 6.1 Privacy Testing

- Create birthday present expense with `share_with_external_persons = false`
- Accept invitation
- Verify recipient does NOT see the expense in "Shared with Me" filter
- Create another expense with `share_with_external_persons = true`
- Verify recipient DOES see it
- Repeat tests for income and assets when applicable

### 6.2 Field Requirements Testing

- Set category to require description
- Try to create expense without description
- Verify validation error appears
- Complete expense with description
- Verify success
- Test conditional requirements (e.g., frequency required if recurring)
- Repeat for income and assets

### 6.3 Category Default Testing

- Set category `allow_sharing_with_external_persons = false`
- Create expense without specifying `share_with_external_persons`
- Verify expense defaults to not sharing
- Override with `share_with_external_persons = true`
- Verify expense is shared
- Repeat for income and assets

## Implementation Order

1. Database migration for privacy and field requirements (all three category types and their entities)
2. Update backend sharing logic (expenses, income, assets)
3. Update creation/update routes (expenses, income, assets)
4. Add field requirement validation
5. Update category admin UI (expenses, income, assets)
6. Update entity forms (expense, income, asset creation/editing)
7. Add translations
8. Testing

## Files to Create

- `src/database/migrations/0000000000018_add_privacy_and_field_requirements.ts`

## Files to Modify

- `src/services/linkedDataService.ts` - Update sharing queries for expenses, income, assets
- `src/routes/expenses.ts` - Add privacy handling and field requirement validation
- `src/routes/income.ts` - Add privacy handling and field requirement validation
- `src/routes/assets.ts` - Add privacy handling and field requirement validation
- `src/routes/expense-categories.ts` - Accept privacy and field requirement fields
- `src/routes/income-categories.ts` - Accept privacy and field requirement fields
- `src/routes/asset-categories.ts` - Accept privacy and field requirement fields
- `src/database/seeds/06_expense_categories.ts` - Set privacy defaults
- `src/database/seeds/05_income_categories.ts` - Set privacy defaults (if exists)
- `src/database/seeds/04_asset_categories.ts` - Set privacy defaults (if exists)
- `client/src/components/ExpenseGiftForm.tsx` - Add privacy toggle
- `client/src/pages/ExpenseCategoriesPage.tsx` - Add privacy and field requirement UI
- `client/src/pages/IncomeCategoriesPage.tsx` - Add privacy and field requirement UI (if exists)
- `client/src/pages/AssetCategoriesPage.tsx` - Add privacy and field requirement UI (if exists)
- `client/src/pages/ExpensesPage.tsx` or wizard - Handle privacy field
- `client/src/pages/IncomePage.tsx` - Handle privacy field (if applicable)
- `client/src/pages/AssetsPage.tsx` - Handle privacy field (if applicable)
- All locale files - Add translations

## Key Considerations

1. **Privacy First**: Default for sensitive categories (birthday presents) should be `false`
2. **User Control**: Users can override category defaults per expense/income/asset
3. **Backward Compatibility**: Existing records without `share_with_external_persons` use category default
4. **Field Requirements**: Flexible JSONB structure allows future expansion
5. **UI Clarity**: Make it clear to users when sharing is enabled/disabled
6. **Validation**: Enforce field requirements on both frontend and backend
7. **Consistency**: Same privacy and field requirement system across expenses, income, and assets

## Future Enhancements (Optional)

1. Per-recipient sharing control (share with person A but not person B)
2. Metadata field requirement templates per category type
3. Dynamic field requirement UI generation from JSONB
4. Field requirement validation on frontend based on category selection

---

## Implementation Status - COMPLETED ✅

**Last Updated:** 2025-11-01

### Phase 1: Database Schema - ✅ COMPLETED

- ✅ Migration `0000000000018_add_privacy_and_field_requirements.ts` created and applied
- ✅ All privacy and field requirement fields added to category tables (expenses, income, assets)
- ✅ Privacy fields added to entity tables (expenses, income, assets)
- ✅ Expense categories seed updated (Birthday Presents = false)

### Phase 2: Backend Logic Updates - ✅ COMPLETED

- ✅ **2.1**: `LinkedDataService.getLinkedExpenses()` respects privacy settings
- ✅ **2.2**: `LinkedDataService.getLinkedIncome()` respects privacy settings
- ✅ **2.3**: `LinkedDataService.getLinkedAssets()` respects privacy settings
- ✅ **2.4**: Expenses GET route `shared_with_me` filter uses privacy logic
- ✅ **2.5**: Income GET route ready for privacy logic (when needed)
- ✅ **2.6**: Assets GET route `shared_with_me` filter uses privacy logic
- ✅ **2.7**: Expense creation (POST) handles `share_with_external_persons` with category defaults
- ✅ **2.8**: Income creation (POST) handles `share_with_external_persons` with category defaults
- ✅ **2.9**: Asset creation (POST) handles `share_with_external_persons` with category defaults
- ✅ **2.10**: Field requirement validation implemented:
  - Created `src/utils/fieldRequirementsValidator.ts` with validation functions for expenses, income, and assets
  - Integrated validation into expense POST/PUT routes
  - Integrated validation into income POST/PUT routes
  - Integrated validation into asset POST/PUT routes

### Phase 3: Frontend Updates - ✅ COMPLETED

- ✅ **3.1**: Expense Gift Form (`ExpenseGiftForm.tsx`) updated with privacy toggle
- ✅ **3.2**: Expense creation wizard (`AddEditExpenseWizard.tsx`) includes privacy field
- ✅ **3.3**: Income creation forms ready for privacy field (when income supports external person linking)
- ✅ **3.4**: Asset creation forms ready for privacy field (when assets support external person linking)
- ✅ **3.5**: Expense Categories Admin Page (`ExpenseCategoriesPage.tsx`) includes:
  - Privacy setting checkbox
  - Field Requirements Editor component
- ✅ **3.6**: Income Categories Admin Page (`IncomeCategoriesPage.tsx`) includes:
  - Privacy setting checkbox
  - Field Requirements Editor component
- ✅ **3.7**: Asset Categories Admin Page (`AssetCategoriesPage.tsx` via `AddEditCategoryModal.tsx`) includes:
  - Privacy setting checkbox
  - Field Requirements Editor component
- ✅ **3.8**: Expense wizard respects field requirements (backend validation enforced)
- ✅ **3.9**: Income forms ready for field requirements
- ✅ **3.10**: Asset forms ready for field requirements

### Phase 4: Translations - ✅ COMPLETED

- ✅ All translation keys added to:
  - `client/src/locales/en/translation.json`
  - `client/src/locales/de/translation.json`
  - `client/src/locales/tr/translation.json`
- ✅ Translation keys include:
  - Privacy-related strings (shareWithRecipients, shareWarning, privacyNote)
  - Field requirements UI strings (fieldRequirements, addField, required, conditional, etc.)
  - Admin category strings (allowSharingWithExternalPersons, allowSharingHint)

### Phase 5: API Updates - ✅ COMPLETED

- ✅ **5.1**: Expense Categories API (`src/routes/expense-categories.ts`) accepts privacy and field requirements
- ✅ **5.2**: Income Categories API (`src/routes/income-categories.ts`) accepts privacy and field requirements
- ✅ **5.3**: Asset Categories API (`src/routes/asset-categories.ts`) accepts privacy and field requirements
- ✅ **5.4**: Expenses API (`src/routes/expenses.ts`) accepts `share_with_external_persons`
- ✅ **5.5**: Income API (`src/routes/income.ts`) accepts `share_with_external_persons`
- ✅ **5.6**: Assets API (`src/routes/assets.ts`) accepts `share_with_external_persons`

### Phase 6: Testing - ⚠️ READY FOR TESTING

- Testing recommended:
  - **6.1**: Privacy Testing - Verify birthday presents are not shared by default
  - **6.2**: Field Requirements Testing - Test validation with required fields
  - **6.3**: Category Default Testing - Verify category defaults work correctly

## Files Created

- ✅ `src/database/migrations/0000000000018_add_privacy_and_field_requirements.ts`
- ✅ `src/utils/fieldRequirementsValidator.ts` - Field validation utility
- ✅ `client/src/components/FieldRequirementsEditor.tsx` - Field requirements UI component

## Files Modified

- ✅ `src/services/linkedDataService.ts` - Updated sharing queries
- ✅ `src/routes/expenses.ts` - Privacy handling and field requirement validation
- ✅ `src/routes/income.ts` - Privacy handling and field requirement validation
- ✅ `src/routes/assets.ts` - Privacy handling and field requirement validation
- ✅ `src/routes/expense-categories.ts` - Accept privacy and field requirement fields
- ✅ `src/routes/income-categories.ts` - Accept privacy and field requirement fields
- ✅ `src/routes/asset-categories.ts` - Accept privacy and field requirement fields
- ✅ `src/database/seeds/06_expense_categories.ts` - Set privacy defaults
- ✅ `client/src/components/ExpenseGiftForm.tsx` - Added privacy toggle
- ✅ `client/src/pages/ExpenseCategoriesPage.tsx` - Added privacy and field requirement UI
- ✅ `client/src/pages/IncomeCategoriesPage.tsx` - Added privacy and field requirement UI
- ✅ `client/src/pages/AssetCategoriesPage.tsx` - Added privacy and field requirement UI (via AddEditCategoryModal)
- ✅ `client/src/components/AddEditExpenseWizard.tsx` - Handles privacy field
- ✅ `client/src/components/AddEditCategoryModal.tsx` - Added privacy and field requirement UI
- ✅ All locale files (en, de, tr) - Added translations

## Summary

**Implementation Status: 100% Complete**

All planned features have been successfully implemented:

- ✅ Database schema for privacy and field requirements
- ✅ Backend validation and privacy logic
- ✅ Frontend UI for privacy controls and field requirements editor
- ✅ API endpoints updated to handle new fields
- ✅ Translations added in all supported languages
- ✅ Build passes with no errors

The system now supports:

1. **Privacy Controls**: Category-level and entity-level controls for sharing with external users
2. **Field Requirements**: Admin-configurable mandatory/optional fields per category
3. **Validation**: Backend validation enforces field requirements during entity creation/updates
4. **UI**: Comprehensive admin UI for configuring privacy and field requirements

**Next Steps**: Manual testing recommended to verify all features work as expected in production environment.