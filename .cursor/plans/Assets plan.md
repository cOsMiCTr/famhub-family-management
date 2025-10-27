<!-- 91466788-b2f4-40c7-8daa-264ce5e5998b cd2d24bd-d3a3-4738-b992-38ce57259dfc -->
# Assets Page Implementation Plan

## Overview

Implement full-featured Assets management with categorized asset tracking (Real Estate, Financial Investments, Vehicles, Valuables, etc.), multi-currency support, household member assignment, photo uploads, valuation history, and performance metrics (ROI).

## Database Changes

### 1. Update `assets` table schema

Current schema needs significant updates to support the new requirements:

**Add new columns to `assets` table:**

- `name` VARCHAR(255) - Asset name/title
- `household_member_id` INTEGER - Link to household_members (for assignment)
- `purchase_date` DATE - Original purchase date
- `purchase_price` DECIMAL(15,2) - Original purchase price
- `purchase_currency` VARCHAR(4) - Currency at purchase
- `current_value` DECIMAL(15,2) - Current valuation
- `last_valuation_date` DATE - Last time value was updated
- `valuation_method` VARCHAR(50) - How value was determined (Market, Appraisal, Estimate)
- `ownership_type` VARCHAR(20) - 'single', 'shared', 'household'
- `ownership_percentage` DECIMAL(5,2) - For shared ownership
- `status` VARCHAR(20) - 'active', 'sold', 'transferred', 'inactive'
- `location` TEXT - Physical location or account info
- `notes` TEXT - Additional details
- `photo_url` TEXT - Path to uploaded photo
- `linked_loan_id` INTEGER - Reference to loan (future feature)
- `linked_contract_id` INTEGER - Reference to contract

**Note:** Keep existing columns (`amount`, `currency`, `date`) for backward compatibility, map them appropriately.

### 2. Create `asset_valuation_history` table

Track value changes over time:

```sql
CREATE TABLE asset_valuation_history (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
  valuation_date DATE NOT NULL,
  value DECIMAL(15,2) NOT NULL,
  currency VARCHAR(4) NOT NULL,
  valuation_method VARCHAR(50),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### 3. Update `asset_categories` table

Need to distinguish asset categories from income/expense:

- Add `category_type` VARCHAR(50) - 'real_estate', 'stocks', 'etf', 'bonds', 'crypto', 'gold', 'vehicles', 'collectibles', 'cash'
- Add `icon` VARCHAR(50) - Icon identifier for UI
- Add `requires_ticker` BOOLEAN - For stocks/ETFs
- Add `depreciation_enabled` BOOLEAN - For vehicles

### 4. Create seed file for asset categories

`src/migrations/seedAssetCategories.ts` with predefined categories:

- Real Estate
- Stocks
- ETFs/Mutual Funds  
- Bonds
- Cryptocurrency
- Gold/Precious Metals
- Bank Accounts
- Vehicles
- Collectibles & Art
- Other Assets

### 5. Add migration to update database schema

`src/config/database.ts` - Add column additions with proper error handling for existing tables.

## Backend API Updates

### 1. Update `src/routes/assets.ts`

Enhance existing routes:

**GET `/api/assets`** - Add new query params:

- `status` filter
- `member_id` filter  
- `category_type` filter
- `min_value` / `max_value` filters
- Include valuation history in response

**POST `/api/assets`** - Update to accept new fields:

- Validate all new fields (name, purchase info, ownership, status)
- Handle photo upload (multipart/form-data)
- Create initial valuation history entry

**PUT `/api/assets/:id`** - Update asset:

- If `current_value` changes, create valuation history entry
- Handle photo replacement
- Update `last_valuation_date`

**GET `/api/assets/:id/history`** - New endpoint:

- Return valuation history for specific asset
- Calculate appreciation/depreciation

**GET `/api/assets/summary`** - Enhanced summary endpoint:

- Total value by category
- Total value by currency (with conversions)
- Top assets by value
- Recent valuation changes
- Performance metrics (ROI, annualized returns)
- Asset allocation percentages

**POST `/api/assets/:id/valuation`** - New endpoint:

- Add new valuation entry
- Update asset's current_value

**POST `/api/assets/:id/upload-photo`** - New endpoint:

- Handle photo upload
- Store in server/cloud storage
- Return photo URL

### 2. Create `src/routes/asset-categories.ts`

Similar to income-categories routes:

- GET `/api/asset-categories` - List all categories
- POST `/api/asset-categories` - Admin: Create category
- PUT `/api/asset-categories/:id` - Admin: Update category
- DELETE `/api/asset-categories/:id` - Admin: Delete (check dependencies)

### 3. Update exchange rate service

Ensure `src/services/exchangeRateService.ts` has method to convert asset values to main currency with historical rates if needed.

## Frontend Implementation

### 1. Create new `client/src/pages/AssetsPage.tsx`

Replace placeholder with full implementation following `IncomePage.tsx` pattern:

**State management:**

- `assets` array
- `categories` array
- `members` array (household members)
- `summary` object (statistics)
- `filters` (status, category, member, date range, value range)
- Modal states (add, edit, delete, valuation history, photo viewer)
- `selectedAsset`
- Form data for add/edit

**Main sections:**

- Header with title, summary KPIs, "+ Add Asset" button
- Filters bar (category dropdown, member dropdown, status, date range, value range)
- Assets summary cards (total value, by category pie chart, top assets)
- Assets table/list with columns:
  - Photo thumbnail
  - Name
  - Category
  - Owner/Member
  - Purchase price (original currency)
  - Current value (main currency + original)
  - Status
  - Last updated
  - ROI %
  - Actions (Edit, History, Delete)

**Modals:**

- Add/Edit Asset Modal with tabs:
  - Basic Info: Name, Category, Owner/Shared
  - Purchase Info: Date, Price, Currency
  - Current Valuation: Value, Date, Method
  - Details: Location, Notes, Photo upload
  - Status
- Valuation History Modal: Timeline of value changes with chart
- Delete Confirmation Modal
- Photo Viewer Modal (full size)

**Features:**

- Currency display: "€50,000 (£42,500)" format
- ROI calculation and display with color indicators
- Photo upload with preview
- Shared ownership UI (multiple members with percentages)
- Sort by value, date, ROI, etc.
- Export to CSV/PDF

### 2. Create `client/src/pages/AssetCategoriesPage.tsx`

Admin page for managing asset categories (similar to `IncomeCategoriesPage.tsx`):

- List all categories with usage count
- Add/Edit/Delete modals
- Tri-lingual name inputs (EN, DE, TR)
- Category type selection
- Icon picker
- Cannot delete categories with active assets

### 3. Update navigation

- Add Asset Categories to admin menu
- Ensure Assets link is active in main navigation

### 4. Add utility functions

`client/src/utils/assetHelpers.ts`:

- `calculateROI(purchasePrice, currentValue)` → percentage
- `calculateAnnualizedReturn(purchasePrice, currentValue, purchaseDate)` → percentage
- `formatAssetValue(value, currency, mainCurrency, exchangeRate)` → formatted string
- `getOwnershipDisplay(asset)` → "John Doe" or "John (50%), Jane (50%)"

### 5. Create asset-related components

`client/src/components/AssetCard.tsx` - Visual card for asset display

`client/src/components/ValuationHistoryChart.tsx` - Line chart for value over time

`client/src/components/AssetAllocationChart.tsx` - Pie chart for categories

`client/src/components/PhotoUpload.tsx` - Photo upload component with preview

## Translation Keys

Add to `src/migrations/seedTranslations.ts`:

**Assets section** (~50 keys):

- Basic: assets.name, assets.category, assets.owner, assets.status
- Purchase: assets.purchaseDate, assets.purchasePrice, assets.purchaseCurrency
- Valuation: assets.currentValue, assets.lastValuated, assets.valuationMethod
- Ownership: assets.single, assets.shared, assets.household, assets.ownershipPercentage
- Status: assets.active, assets.sold, assets.transferred, assets.inactive
- Performance: assets.roi, assets.annualizedReturn, assets.appreciation, assets.depreciation
- Details: assets.location, assets.notes, assets.photo, assets.uploadPhoto
- History: assets.valuationHistory, assets.addValuation, assets.valueChanges
- Summary: assets.totalValue, assets.byCategory, assets.topAssets, assets.allocation
- Filters: assets.filterByStatus, assets.filterByCategory, assets.filterByMember, assets.valueRange

**Asset Categories section** (~15 keys):

- assetCategories.title, assetCategories.addCategory, assetCategories.editCategory
- assetCategories.deleteCategory, assetCategories.categoryType, assetCategories.icon
- assetCategories.noCategoriesFound, assetCategories.cannotDelete, assetCategories.hasDependencies

**Category Types:**

- assetCategories.realEstate, assetCategories.stocks, assetCategories.etf
- assetCategories.bonds, assetCategories.crypto, assetCategories.gold
- assetCategories.vehicles, assetCategories.collectibles, assetCategories.cash

## Testing Checklist

1. Create asset with all fields
2. Edit asset and verify valuation history created
3. Upload photo and verify display
4. Test shared ownership with percentages
5. Filter by category, member, status, value range
6. Verify currency conversion display (original + main)
7. Calculate ROI correctly
8. View valuation history chart
9. Delete asset (with confirmation)
10. Admin: Add/Edit/Delete categories
11. Verify cannot delete category with assets
12. Test with multiple currencies
13. Verify household member assignment
14. Test status changes (active → sold)
15. Verify summary calculations

## Implementation Notes

- Reuse patterns from Income page for consistency
- Ensure proper authentication on all routes
- Validate ownership percentages sum to 100% for shared assets
- Store photos in `public/uploads/assets/` directory
- Add proper indexes for performance (asset_id, household_id, member_id, status)
- Handle edge cases: assets with $0 purchase price, assets sold at loss
- Consider pagination for large asset lists
- Add loading states and error handling throughout

## Future Enhancements (not in this phase)

- Real Estate detailed module (separate page with rental management)
- Loans module with asset linking
- Insurance module
- Automatic stock price updates via API
- Bulk import from CSV
- Asset transfer between members with history
- Advanced reporting (capital gains, net worth over time)
- Document attachments (deeds, certificates)
- Reminder system (revaluation due, insurance renewal)

### To-dos

- [ ] Update assets table schema with new columns (name, member_id, purchase info, valuation, ownership, status, photo_url)
- [ ] Create asset_valuation_history table for tracking value changes over time
- [ ] Update asset_categories table with category_type, icon, and settings fields
- [ ] Create seedAssetCategories.ts with predefined categories (Real Estate, Stocks, ETFs, etc.)
- [ ] Update src/routes/assets.ts with new endpoints and enhanced existing routes
- [ ] Create src/routes/asset-categories.ts for admin category management
- [ ] Implement photo upload endpoint with file storage
- [ ] Enhance assets summary endpoint with performance metrics and allocation
- [ ] Implement full AssetsPage.tsx with filters, table, modals, and charts
- [ ] Create AssetCategoriesPage.tsx for admin category management
- [ ] Create asset-related components (AssetCard, ValuationHistoryChart, PhotoUpload)
- [ ] Add asset helper functions (ROI calculation, formatting, ownership display)
- [ ] Add ~65 translation keys for assets and asset categories
- [ ] Update navigation to include Asset Categories in admin menu
- [ ] Test all CRUD operations, filters, currency conversion, ROI calculations, and photo uploads