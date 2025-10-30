# Enhanced Expenses Module Implementation Plan

## Overview

Implement a complete expenses tracking module as a separate premium module (like assets and income), with full feature parity to the income module including recurring expenses, filters, summaries, history tracking, and category management. Additionally, support detailed expense categories with custom linking relationships (to household members and real estate assets) and provide category-specific custom interfaces for different expense types.

## Phase 1: Database Schema

### 1.1 Create Expense Categories Table

**New Migration**: `src/database/migrations/0000000000009_create_expense_tables.ts` (COMPLETED)

Create `expense_categories` table mirroring `income_categories`:

- `id` (primary key, auto-increment)
- `name_en`, `name_de`, `name_tr` (multilingual names)
- `is_default` (boolean)
- `created_at` (timestamp)

### 1.2 Create Expenses Table

**Same Migration**: Create `expenses` table mirroring `income` structure:

- `id` (primary key)
- `household_id` (foreign key to households)
- `household_member_id` (foreign key to household_members, nullable)
- `category_id` (foreign key to expense_categories)
- `amount` (decimal 15,2)
- `currency` (string, 4 chars) with CHECK constraint for valid currencies
- `source_currency` (string, 4 chars, nullable) with CHECK constraint
- `description` (text, nullable)
- `start_date` (date, not null)
- `end_date` (date, nullable)
- `is_recurring` (boolean, default false)
- `frequency` (string, 20 chars, nullable)
- `created_by_user_id` (foreign key to users)
- `created_at`, `updated_at` (timestamps)

Add currency CHECK constraints similar to income table.

### 1.3 Create Expense History Table

**Same Migration**: Create `expense_history` table for change tracking:

- `id` (primary key)
- `expense_id` (foreign key to expenses, CASCADE delete)
- `changed_by_user_id` (foreign key to users)
- `change_type` (string, 20 - 'created', 'updated', 'deleted')
- `old_values` (jsonb, nullable)
- `new_values` (jsonb, nullable)
- `changed_at` (timestamp)

### 1.4 Create Indexes

Add indexes for performance:

- `expenses.household_id`
- `expenses.household_member_id`
- `expenses.category_id`
- `expenses.start_date`, `expenses.end_date`
- `expenses.created_by_user_id`
- `expense_history.expense_id`

## Phase 1A: Database Schema Enhancements (NEW)

### 1A.1 Update Expenses Table

**New Migration**: `src/database/migrations/XXXXXX_add_expense_linking_fields.ts`

Add linking and metadata fields to `expenses` table:

- `linked_asset_id` (integer, nullable, foreign key to assets.id, ON DELETE SET NULL) - For linking expenses to real estate/property
- `credit_use_type` (string, nullable) - Enum: 'free_use', 'renovation', 'property_purchase', 'other' (for credit expenses)
- `metadata` (JSONB, nullable) - Flexible storage for category-specific custom fields (e.g., bill_type, tax_type, interest_rate, contract_number)

### 1A.2 Update Expense Categories Table

**Same Migration**: Add fields to `expense_categories`:

- `category_type` (string, nullable) - Enum: 'gift', 'credit', 'bill', 'tax', 'insurance', 'subscription', 'school', 'bausparvertrag', 'other'
- `has_custom_form` (boolean, default false) - Flag to indicate if category needs custom interface
- `requires_asset_link` (boolean, default false) - Flag for categories that must link to assets (bills, tax, bausparvertrag)
- `requires_member_link` (boolean, default false) - Flag for categories that must link to members (gifts)
- `allows_multiple_members` (boolean, default false) - Flag for categories that can link to multiple members

### 1A.3 Create Expense Member Links Table

**Same Migration**: Create `expense_member_links` table (for many-to-many relationship between expenses and household members):

- `id` (primary key)
- `expense_id` (foreign key to expenses, CASCADE delete)
- `household_member_id` (foreign key to household_members, CASCADE delete)
- `created_at` (timestamp)

This allows linking one expense (e.g., birthday present) to multiple people.

### 1A.4 Add Additional Indexes

Add indexes for performance:

- `expenses.linked_asset_id`
- `expense_member_links.expense_id`
- `expense_member_links.household_member_id`
- `expense_categories.category_type`

## Phase 2: Enhanced Expense Categories

### 2.1 Update Default Expense Categories Seed

**File**: `src/database/seeds/06_expense_categories.ts`

Update categories with new structure including category types and flags:

**Detailed Categories**:

1. **Birthday Presents** (category_type: 'gift')

   - `has_custom_form`: true
   - `requires_member_link`: true
   - `allows_multiple_members`: true
   - Multilingual names: "Birthday Presents" (EN), "Geburtstagsgeschenke" (DE), "Doğum Günü Hediyeleri" (TR)

2. **Insurance** (category_type: 'insurance')

   - `has_custom_form`: false
   - Sub-categories: Health, Life, Property, Auto, Other
   - Multilingual names

3. **Subscriptions** (category_type: 'subscription')

   - `has_custom_form`: false
   - Examples: Streaming, Magazine, Gym, Software, Other
   - Multilingual names

4. **Credits** (category_type: 'credit')

   - `has_custom_form`: true
   - `requires_asset_link`: false (optional)
   - `credit_use_type` required: free_use, renovation, property_purchase, other
   - Multilingual names: "Credits" (EN), "Kredite" (DE), "Krediler" (TR)

5. **Bausparvertrag** (category_type: 'bausparvertrag')

   - `has_custom_form`: true
   - `requires_asset_link`: true (typically linked to real estate)
   - Multilingual names: "Bausparvertrag" (EN/DE), "Bausparvertrag" (TR)

6. **School Expenses** (category_type: 'school')

   - `has_custom_form`: false
   - Can optionally link to household members (students)
   - Multilingual names

7. **Bills** (category_type: 'bill')

   - `has_custom_form`: true
   - `requires_asset_link`: true (utilities, rent, maintenance linked to property)
   - Multilingual names: "Bills" (EN), "Rechnungen" (DE), "Faturalar" (TR)
   - Sub-categories: Electricity, Water, Gas, Maintenance, Rent, Other (stored in metadata)

8. **Tax** (category_type: 'tax')

   - `has_custom_form`: true
   - `requires_asset_link`: false (optional - property tax links to real estate)
   - Sub-categories: Income Tax, Property Tax, Other (stored in metadata)
   - Multilingual names: "Tax" (EN), "Steuer" (DE), "Vergi" (TR)

9. **Food & Groceries** (category_type: 'other')

   - Default category
   - Multilingual names

10. **Utilities** (category_type: 'bill')

    - `requires_asset_link`: true (linked to property)
    - Multilingual names

11. **Transportation** (category_type: 'other')

    - Default category

12. **Housing/Rent** (category_type: 'bill')

    - `requires_asset_link`: true (linked to property)

13. **Healthcare** (category_type: 'other')

    - Default category

14. **Education** (category_type: 'school')

    - Can optionally link to household members

15. **Entertainment** (category_type: 'other')

    - Default category

16. **Clothing** (category_type: 'other')

    - Default category

17. **Other** (category_type: 'other')

    - Default fallback category

### 2.2 Add Subcategories Support

Store subcategories in metadata field or as separate category entries with parent_category_id (if adding hierarchy support).

## Phase 3: Backend Routes (COMPLETED - Basic Routes)

### 3.1 Expense Categories Routes

**File**: `src/routes/expense-categories.ts` (COMPLETED)

Basic routes implemented:

- `GET /api/expense-categories` - Get all expense categories (with language support)
- `POST /api/expense-categories` - Create new category (admin only)
- `PUT /api/expense-categories/:id` - Update category (admin only)
- `DELETE /api/expense-categories/:id` - Delete category (admin only)

### 3.2 Expenses Routes

**File**: `src/routes/expenses.ts` (COMPLETED - Basic Routes)

Basic routes implemented:

- `GET /api/expenses` - Get expenses with filters
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
- `GET /api/expenses/summary` - Get expense summary

## Phase 3A: Backend API Enhancements (NEW)

### 3A.1 Update Expenses Routes

**File**: `src/routes/expenses.ts`

**Enhanced POST `/api/expenses`**:

- Validate category requirements (requires_asset_link, requires_member_link)
- Handle `linked_asset_id` (validate asset belongs to household and is real estate type)
- Handle `linked_member_ids` (array of household member IDs, validate all belong to household)
- Handle `credit_use_type` (only for credit category)
- Store category-specific metadata in `metadata` JSONB field (bill_type, tax_type, interest_rate, contract_number, etc.)
- Insert expense_member_links records for each linked member
- Validate asset category type (only real estate assets can be linked for bills, tax, bausparvertrag)

**Enhanced GET `/api/expenses`**:

- LEFT JOIN with assets table for `linked_asset_id`
- LEFT JOIN with expense_member_links and household_members to get linked members
- Include asset name, category in response
- Include linked member names in response
- Filter by `linked_asset_id` (optional query param)
- Filter by `linked_member_ids` (optional query param - array)
- Filter by `credit_use_type` (optional query param for credit category)
- Filter by `category_type` (optional query param)

**Enhanced PUT `/api/expenses/:id`**:

- Update all linking fields
- Delete old expense_member_links and create new ones if member links changed
- Validate all relationships still valid
- Update metadata field

**New GET `/api/expenses/linkable-assets`**:

- Return list of real estate assets (category_type = 'real_estate') for current household
- Filter to only real estate assets
- For use in dropdowns when linking expenses to assets

**New GET `/api/expenses/linkable-members`**:

- Return list of household members for current household
- For use in dropdowns when linking expenses to members

**Enhanced GET `/api/expenses/summary`**:

- Include breakdown by category_type
- Include breakdown by linked assets (show expenses per property)
- Include breakdown by credit use type (for credit category)
- Calculate average expense per property (if linked to assets)

### 3A.2 Update Expense Categories Routes

**File**: `src/routes/expense-categories.ts`

**Enhanced GET `/api/expense-categories`**:

- Include `category_type`, `has_custom_form`, `requires_asset_link`, `requires_member_link`, `allows_multiple_members` in response

**Enhanced POST `/api/expense-categories`**:

- Validate and store new category type fields
- Validate category_type enum values

**Enhanced PUT `/api/expense-categories/:id`**:

- Update category type fields

### 3A.3 Validation Middleware

Create validation helpers:

- `validateAssetLink(assetId, householdId)` - Ensure asset belongs to household and is real estate type
- `validateMemberLinks(memberIds, householdId)` - Ensure all members belong to household
- `validateCategoryRequirements(categoryId, expenseData)` - Check if expense meets category requirements
- `validateCreditUseType(creditUseType, linkedAssetId)` - Validate credit use type matches asset link requirements

## Phase 4: Frontend Implementation (COMPLETED - Basic Pages)

### 4.1 Expenses Page Component

**File**: `client/src/pages/ExpensesPage.tsx` (COMPLETED - Basic Implementation)

Basic features implemented:

- State management for expenses, categories, members, summary
- Filter state (date range, member, category, recurring)
- Form state for add/edit
- Modal states (add, edit, delete, summary)
- Debounced date filter updates
- Loading and error states

### 4.2 Expense Categories Admin Page

**File**: `client/src/pages/ExpenseCategoriesPage.tsx` (COMPLETED)

Basic features implemented.

## Phase 4A: Frontend Custom Interfaces (NEW)

### 4A.1 Update ExpensesPage Component

**File**: `client/src/pages/ExpensesPage.tsx`

**Enhanced Expense Entry Interface**:

```typescript
interface ExpenseEntry {
  // ... existing fields ...
  linked_asset_id?: number;
  linked_asset_name?: string;
  linked_member_ids?: number[];
  linked_member_names?: string[];
  credit_use_type?: 'free_use' | 'renovation' | 'property_purchase' | 'other';
  metadata?: Record<string, any>;
  category_type?: string;
  has_custom_form?: boolean;
  requires_asset_link?: boolean;
  requires_member_link?: boolean;
  allows_multiple_members?: boolean;
}
```

**Dynamic Form Component**:

- Create `ExpenseCategoryForm` component that renders different forms based on `category_type`
- Conditional rendering for:
  - **Birthday Presents**: Multi-select for household members (allows_multiple_members = true)
  - **Credits**: Dropdown for credit_use_type, optional asset selector (if renovation/property_purchase)
  - **Bills**: Required asset selector (real estate only), bill type dropdown (optional)
  - **Tax**: Optional asset selector (for property tax), tax type dropdown
  - **Bausparvertrag**: Required asset selector (real estate only), optional fields (interest_rate, contract_number)
  - **Default**: Standard expense form

**Custom Form Sections**:

1. **Gift Form** (`ExpenseGiftForm.tsx`):

   - Multi-select dropdown for recipients (household members)
   - Required field: at least one recipient
   - Display selected recipients as badges

2. **Credit Form** (`ExpenseCreditForm.tsx`):

   - Dropdown for `credit_use_type`: Free Use, Renovation, Property Purchase, Other
   - Conditional asset selector (shown if renovation or property_purchase selected)
   - Display selected asset name
   - Validation: asset required if use type is renovation or property_purchase

3. **Bill Form** (`ExpenseBillForm.tsx`):

   - Required asset selector (filtered to real estate assets only)
   - Bill type dropdown: Electricity, Water, Gas, Maintenance, Rent, Other (optional, stored in metadata)
   - Display linked property name

4. **Tax Form** (`ExpenseTaxForm.tsx`):

   - Optional asset selector (for property tax)
   - Tax type dropdown: Income Tax, Property Tax, Other (stored in metadata)
   - Show hint: "Link to property for property tax"

5. **Bausparvertrag Form** (`ExpenseBausparvertragForm.tsx`):

   - Required asset selector (real estate only)
   - Interest rate field (optional, stored in metadata)
   - Contract number field (optional, stored in metadata)
   - Display linked property name

**Form Integration**:

- Update add/edit modal to detect `category_type` and `has_custom_form`
- Load category details when category is selected
- Conditionally render appropriate custom form component based on category_type
- Merge custom form data with standard expense fields
- Validate custom form fields before submission
- Show validation errors for required fields (asset link, member link)

### 4A.2 Asset Selector Component

**New File**: `client/src/components/ExpenseAssetSelector.tsx`

- Dropdown component that fetches and displays real estate assets from `/api/expenses/linkable-assets`
- Filters assets by category_type = 'real_estate'
- Shows asset name and location
- Allows optional selection (for tax) or required (for bills, bausparvertrag)
- Handles loading and empty states
- Displays "No properties available" if none found

### 4A.3 Member Multi-Select Component

**New File**: `client/src/components/ExpenseMemberMultiSelect.tsx`

- Multi-select dropdown for household members
- Fetches from `/api/expenses/linkable-members`
- Shows member names with checkboxes
- Used for birthday presents (multiple recipients)
- Handles selection state
- Displays selected members as removable badges
- Shows "Select at least one recipient" validation message

### 4A.4 Display Linked Information

Update expense list table to show:

- Linked asset badge/icon (if linked_asset_id exists) - clickable to view asset details
- Linked member badges (if linked_member_ids exist) - show member names
- Credit use type badge (for credit expenses) - colored badge showing use type
- Category-specific metadata in expanded view (bill_type, tax_type, etc.)
- Visual indicators for expense types (gift icon, credit icon, bill icon, etc.)

### 4A.5 Enhanced Filters

**File**: `client/src/pages/ExpensesPage.tsx`

Add new filter options:

- Filter by linked asset (dropdown of real estate assets)
- Filter by linked members (multi-select)
- Filter by credit use type (for credit category)
- Filter by category type (gift, credit, bill, tax, etc.)

Add filter state:

```typescript
const [filters, setFilters] = useState({
  // ... existing filters ...
  linked_asset_id: '',
  linked_member_ids: [],
  credit_use_type: '',
  category_type: ''
});
```

### 4A.6 Enhanced Summary

**File**: `client/src/pages/ExpensesPage.tsx`

Update summary modal to include:

- Breakdown by category type
- Breakdown by linked assets (show expenses per property with totals)
- Breakdown by credit use type (for credit category)
- Average expense per property (if linked to assets)
- Total expenses by linked property

## Phase 5: Translations

### 5.1 Add Translation Keys (Basic - COMPLETED)

**Files**: All locale files (COMPLETED for basic keys)

### 5.1A Add Enhanced Translation Keys (NEW)

**Files**:

- `client/src/locales/en/translation.json`
- `client/src/locales/de/translation.json`
- `client/src/locales/tr/translation.json`

**Keys needed**:

- `expenses.categoryTypes.gift`, `expenses.categoryTypes.credit`, `expenses.categoryTypes.bill`, `expenses.categoryTypes.tax`, `expenses.categoryTypes.insurance`, `expenses.categoryTypes.subscription`, `expenses.categoryTypes.school`, `expenses.categoryTypes.bausparvertrag`, `expenses.categoryTypes.other`
- `expenses.creditUseTypes.free_use`, `expenses.creditUseTypes.renovation`, `expenses.creditUseTypes.property_purchase`, `expenses.creditUseTypes.other`
- `expenses.linkedAsset`, `expenses.linkedAssets`, `expenses.selectAsset`, `expenses.selectProperty`, `expenses.propertyRequired`
- `expenses.linkedMembers`, `expenses.selectRecipients`, `expenses.recipients`, `expenses.recipientRequired`, `expenses.selectAtLeastOneRecipient`
- `expenses.creditPurpose`, `expenses.creditUseType`, `expenses.selectCreditPurpose`
- `expenses.billType`, `expenses.selectBillType`, `expenses.billTypes.electricity`, `expenses.billTypes.water`, `expenses.billTypes.gas`, `expenses.billTypes.maintenance`, `expenses.billTypes.rent`, `expenses.billTypes.other`
- `expenses.taxType`, `expenses.selectTaxType`, `expenses.taxTypes.incomeTax`, `expenses.taxTypes.propertyTax`, `expenses.taxTypes.other`
- `expenses.interestRate`, `expenses.contractNumber`
- `expenses.filterByProperty`, `expenses.filterByRecipient`, `expenses.filterByCreditType`, `expenses.filterByCategoryType`
- `expenses.noPropertiesAvailable`, `expenses.propertyLinkRequired`, `expenses.memberLinkRequired`

**Database Translations**:

**File**: `src/database/seeds/02_translations.ts`

- Add all enhanced expense-related translation keys
- Follow existing pattern for multilingual entries

## Phase 6: Dashboard Integration (COMPLETED)

### 6.1 Add Expenses to Dashboard

**File**: `client/src/pages/DashboardPage.tsx` (COMPLETED)

Expense summary cards implemented.

## Phase 7: Admin Panel (COMPLETED)

### 7.1 Add Expense Categories to Admin Routes

**File**: `client/src/App.tsx` (COMPLETED)

### 7.2 Update Admin Navigation

**File**: `client/src/components/Layout.tsx` (COMPLETED)

## Phase 8: Default Data

### 8.1 Seed Default Expense Categories (COMPLETED - Basic)

**File**: `src/database/seeds/06_expense_categories.ts` (COMPLETED)

### 8.1A Update Expense Categories Seed with Enhanced Structure (NEW)

**File**: `src/database/seeds/06_expense_categories.ts`

Replace simple categories with detailed structure:

- Add category_type for each category
- Set has_custom_form flags
- Set requires_asset_link and requires_member_link flags
- Set allows_multiple_members for gifts
- Include all detailed categories from Phase 2.1

### 8.2 Update Translations Seed (NEW)

**File**: `src/database/seeds/02_translations.ts`

Add all new translation keys for:

- Category types
- Credit use types
- Custom form labels
- Validation messages
- Filter labels

## Phase 9: Testing & Validation

### 9.1 Backend Validation

- Test all CRUD operations
- Test currency conversion
- Test recurring expense logic
- Test filtering
- Test summary calculations
- Test history logging
- **NEW**: Test asset linking validation
- **NEW**: Test member linking validation
- **NEW**: Test category requirements validation
- **NEW**: Test credit use type validation
- **NEW**: Test metadata storage and retrieval
- **NEW**: Test expense_member_links creation/deletion

### 9.2 Frontend Validation

- Test expense creation/editing
- Test all filters
- Test modal interactions
- Test currency display
- Test recurring expense UI
- Test summary display
- **NEW**: Test custom form rendering based on category
- **NEW**: Test asset selector component
- **NEW**: Test member multi-select component
- **NEW**: Test validation for required links
- **NEW**: Test display of linked information
- **NEW**: Test enhanced filtering

### 9.3 Module Protection

- Verify expenses module required for routes
- Verify expenses hidden from navigation without module
- Verify dashboard cards gated properly

## Implementation Order

### Already Completed:

1. ✅ Database migrations (Phase 1 - basic tables)
2. ✅ Module registration (Phase 3)
3. ✅ Backend routes (Phase 3 - basic routes)
4. ✅ Backend route registration
5. ✅ Translations (Phase 5 - basic keys)
6. ✅ Frontend page (Phase 4.1 - basic implementation)
7. ✅ Frontend categories admin (Phase 4.2)
8. ✅ Navigation/routes
9. ✅ Dashboard integration (Phase 6)
10. ✅ Admin panel (Phase 7)
11. ✅ Default categories seed (Phase 8 - basic)

### Remaining Implementation:

1. Database migration for linking fields (Phase 1A)
2. Update expense categories seed with enhanced structure (Phase 8.1A)
3. Backend API enhancements (Phase 3A)
4. Frontend custom form components (Phase 4A.1-4A.3)
5. Update ExpensesPage with custom interfaces (Phase 4A.1, 4A.4)
6. Enhanced filtering and display (Phase 4A.5, 4A.6)
7. Enhanced translations (Phase 5.1A, 8.2)
8. Testing and validation (Phase 9)

## Files to Create

**New Files**:

- `src/database/migrations/XXXXXX_add_expense_linking_fields.ts`
- `client/src/components/ExpenseCategoryForm.tsx` (wrapper component)
- `client/src/components/ExpenseGiftForm.tsx`
- `client/src/components/ExpenseCreditForm.tsx`
- `client/src/components/ExpenseBillForm.tsx`
- `client/src/components/ExpenseTaxForm.tsx`
- `client/src/components/ExpenseBausparvertragForm.tsx`
- `client/src/components/ExpenseAssetSelector.tsx`
- `client/src/components/ExpenseMemberMultiSelect.tsx`

**Already Created**:

- ✅ `src/database/migrations/0000000000009_create_expense_tables.ts`
- ✅ `src/routes/expenses.ts`
- ✅ `src/routes/expense-categories.ts`
- ✅ `client/src/pages/ExpensesPage.tsx`
- ✅ `client/src/pages/ExpenseCategoriesPage.tsx`
- ✅ `src/database/seeds/06_expense_categories.ts`

## Files to Modify

**New Modifications**:

- `src/routes/expenses.ts` - Add linking support, validation, new endpoints
- `src/routes/expense-categories.ts` - Include category type fields
- `src/database/seeds/06_expense_categories.ts` - Update with detailed categories and types
- `src/database/seeds/02_translations.ts` - Add enhanced translation keys
- `client/src/pages/ExpensesPage.tsx` - Add custom forms, asset/member selectors, enhanced filtering

**Already Modified**:

- ✅ `src/server.ts`
- ✅ `client/src/App.tsx`
- ✅ `client/src/components/Layout.tsx`
- ✅ `client/src/pages/DashboardPage.tsx`
- ✅ `client/src/locales/en/translation.json`
- ✅ `client/src/locales/de/translation.json`
- ✅ `client/src/locales/tr/translation.json`
- ✅ `src/database/seeds/05_modules.ts`

## Key Considerations

1. **Asset Validation**: Only real estate assets can be linked to bills, tax, bausparvertrag
2. **Member Validation**: All linked members must belong to the same household
3. **Required Fields**: Enforce category requirements (requires_asset_link, requires_member_link)
4. **Credit Use Type**: Only applicable when category_type = 'credit'
5. **Metadata Storage**: Use JSONB for flexible category-specific fields (bill_type, tax_type, interest_rate, contract_number)
6. **Multi-Member Links**: Use separate junction table (expense_member_links) for many-to-many relationship
7. **Backward Compatibility**: Existing expenses without links should still work
8. **UI/UX**: Custom forms should feel integrated, not tacked on
9. **Performance**: Efficient queries with proper joins and indexes
10. **Error Handling**: Clear validation messages for required links and fields