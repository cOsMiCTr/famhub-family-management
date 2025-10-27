<!-- 91466789-b2f4-40c7-8daa-264ce5e5998b 855e6e3d-bd02-488a-9c75-ea8f14c32986 -->
# Currency Management System Implementation Plan

## Overview

Implement a comprehensive database-driven currency management system where admins can add, edit, and categorize currencies (Fiat, Cryptocurrency, Precious Metal). The system will replace all hardcoded currency lists throughout the app and integrate with the exchange rate service.

## Requirements

Based on user feedback:
- Admin can add any currency to the system
- Currencies are categorized: Fiat, Cryptocurrency, Precious Metal
- All hardcoded currency lists throughout the app should be replaced with database queries
- Integration with existing exchange rate sync system
- Existing data (assets, income) should be automatically migrated

## Database Schema

### Create `currencies` table
Location: `src/config/database.ts`

```sql
CREATE TABLE IF NOT EXISTS currencies (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_de VARCHAR(100),
  name_tr VARCHAR(100),
  symbol VARCHAR(10) NOT NULL,
  currency_type VARCHAR(20) NOT NULL CHECK (currency_type IN ('fiat', 'cryptocurrency', 'precious_metal')),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
```sql
CREATE INDEX IF NOT EXISTS idx_currencies_type ON currencies(currency_type);
CREATE INDEX IF NOT EXISTS idx_currencies_active ON currencies(is_active);
CREATE INDEX IF NOT EXISTS idx_currencies_display_order ON currencies(display_order);
```

### Migration script for existing data
Create `src/migrations/seedCurrencies.ts` to:

- Map existing hardcoded currencies (USD, EUR, GBP, TRY, GOLD) to database entries
- Seed common fiat currencies: USD, EUR, GBP, TRY, JPY, CNY, CAD, AUD, CHF, SEK, NOK, DKK, PLN
- Seed major cryptocurrencies: BTC, ETH, BNB, XRP, ADA, SOL, DOT, DOGE, LTC, USDT
- Seed precious metals: GOLD, SILVER, PLATINUM, PALLADIUM
- Run automatically on database initialization

**Seed data structure:**
```typescript
const currencies = [
  // Fiat Currencies
  { code: 'USD', name: 'US Dollar', name_de: 'US-Dollar', name_tr: 'Amerikan Doları', symbol: '$', type: 'fiat', order: 1 },
  { code: 'EUR', name: 'Euro', name_de: 'Euro', name_tr: 'Euro', symbol: '€', type: 'fiat', order: 2 },
  { code: 'GBP', name: 'British Pound', name_de: 'Britisches Pfund', name_tr: 'İngiliz Sterlini', symbol: '£', type: 'fiat', order: 3 },
  { code: 'TRY', name: 'Turkish Lira', name_de: 'Türkische Lira', name_tr: 'Türk Lirası', symbol: '₺', type: 'fiat', order: 4 },
  // ... more fiat currencies
  // Cryptocurrencies
  { code: 'BTC', name: 'Bitcoin', name_de: 'Bitcoin', name_tr: 'Bitcoin', symbol: '₿', type: 'cryptocurrency', order: 20 },
  { code: 'ETH', name: 'Ethereum', name_de: 'Ethereum', name_tr: 'Ethereum', symbol: 'Ξ', type: 'cryptocurrency', order: 21 },
  // ... more cryptocurrencies
  // Precious Metals
  { code: 'GOLD', name: 'Gold', name_de: 'Gold', name_tr: 'Altın', symbol: 'Au', type: 'precious_metal', order: 50 },
  { code: 'SILVER', name: 'Silver', name_de: 'Silber', name_tr: 'Gümüş', symbol: 'Ag', type: 'precious_metal', order: 51 },
  // ... more precious metals
];
```

## Backend API

### Create currency management routes
Location: `src/routes/currencies.ts`

**Admin-only endpoints:**

- `GET /api/currencies` - List all currencies (with optional filter by type/active status)
  - Query params: `?type=fiat|cryptocurrency|precious_metal`, `?active=true|false`
- `GET /api/currencies/active` - List only active currencies (public endpoint)
  - Returns only `is_active=true` currencies for use in dropdowns
- `POST /api/currencies` - Create new currency (admin only, requireAdmin middleware)
- `PUT /api/currencies/:id` - Update currency (admin only)
- `DELETE /api/currencies/:id` - Delete currency (admin only, check if in use)
- `PATCH /api/currencies/:id/toggle` - Toggle active status (admin only)

**Validation:**
- Unique currency codes
- Required fields: code, name, symbol, currency_type
- Currency type must be one of: fiat, cryptocurrency, precious_metal
- Code: 3-10 chars, uppercase
- Symbol: 1-10 chars
- Name: 1-100 chars

### Update existing routes to use database currencies

Files to update:
- `src/routes/settings.ts` - Replace hardcoded currencies endpoint
- `src/routes/assets.ts` - Use dynamic currency validation
- `src/routes/income.ts` - Use dynamic currency validation
- `src/routes/auth.ts` - Use dynamic currency validation

**Current validation:**
```typescript
body('currency').isIn(['TRY', 'GBP', 'USD', 'EUR', 'GOLD'])
```

**New validation:**
```typescript
body('currency').custom(async (value) => {
  const activeCurrencies = await getActiveCurrencyCodes();
  if (!activeCurrencies.includes(value)) {
    throw new Error('Invalid currency');
  }
})
```

### Create currency validation helper
Location: `src/utils/currencyHelpers.ts`

```typescript
let currencyCache: { codes: string[], expires: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getActiveCurrencyCodes(): Promise<string[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (currencyCache && now < currencyCache.expires) {
    return currencyCache.codes;
  }
  
  // Fetch from database
  const result = await pool.query(
    'SELECT code FROM currencies WHERE is_active = true'
  );
  
  const codes = result.rows.map(row => row.code);
  
  // Cache for 5 minutes
  currencyCache = {
    codes,
    expires: now + CACHE_TTL
  };
  
  return codes;
}

export async function getActiveCurrenciesByType(type: string): Promise<any[]> {
  const result = await pool.query(
    'SELECT * FROM currencies WHERE is_active = true AND currency_type = $1 ORDER BY display_order',
    [type]
  );
  return result.rows;
}
```

## Exchange Rate Service Integration

### Update exchange rate service
Location: `src/services/exchangeRateService.ts`

Changes:
- Query active currencies from database instead of hardcoded list
- Support separate sync mechanisms:
  - Fiat currencies: existing ExchangeRate-API
  - Cryptocurrencies: new CoinGecko API integration
  - Precious metals: existing Metals-API
- Update `updateFiatRates()` to fetch currency list from database
- Add `updateCryptoRates()` method for cryptocurrency exchange rates
- Add `updatePreciousMetalRates()` method (expand existing gold logic)

**Key changes:**
```typescript
private async updateFiatRates(): Promise<void> {
  // Query database for active fiat currencies
  const fiatCurrencies = await pool.query(
    'SELECT code FROM currencies WHERE is_active = true AND currency_type = $1',
    ['fiat']
  );
  const currencies = fiatCurrencies.rows.map(row => row.code);
  
  // Existing logic but with dynamic currencies array
  // ...
}
```

## Frontend Components

### Currency Management Page
Location: `client/src/pages/CurrencyManagementPage.tsx`

Features:
- Table view with columns: Code, Name, Symbol, Type, Status, Display Order, Actions
- Filter by currency type (All, Fiat, Cryptocurrency, Precious Metal)
- Filter by status (All, Active, Inactive)
- Search bar for code/name
- Add/Edit currency modal
- Toggle active/inactive status
- Delete confirmation (with usage check)
- Reorder currencies (drag-and-drop or up/down buttons)
- Usage count column (how many assets/income records use this currency)

**Table columns:**
- Currency Code (with flag/icon based on type)
- Name (English)
- Symbol
- Type (badge: Fiat, Crypto, Metal)
- Status (Active/Inactive badge)
- Display Order
- Usage Count (number of records using this currency)
- Actions (Edit, Toggle Active, Delete)

### Add/Edit Currency Modal
Location: `client/src/components/AddEditCurrencyModal.tsx`

Fields:
- Currency Code (3-10 chars, uppercase, disabled for edit)
- Name (English) - required
- Name (German) - optional
- Name (Turkish) - optional
- Symbol - required
- Currency Type (dropdown: Fiat, Cryptocurrency, Precious Metal) - required
- Active Status (checkbox)
- Display Order (number input) - default to max + 1

**Validation:**
- Code must be unique
- Code must match regex: /^[A-Z0-9]{3,10}$/
- Name is required in at least English
- Symbol is required
- Cannot delete currency if it's used in assets/income

### Update navigation
Location: `client/src/components/Sidebar.tsx`

Add "Currency Management" under Admin menu section (after "Translation Management").

## Frontend Currency Hooks

### Create currency context/hook
Location: `client/src/hooks/useCurrencies.ts`

```typescript
import { useState, useEffect, createContext, useContext } from 'react';

interface CurrencyContextType {
  allCurrencies: Currency[];
  activeCurrencies: Currency[];
  currenciesByType: (type: string) => Currency[];
  loading: boolean;
  refresh: () => void;
}

export const useCurrencies = () => {
  const context = useContext(CurrencyContext);
  return context.activeCurrencies;
};

export const useCurrenciesByType = (type: 'fiat' | 'cryptocurrency' | 'precious_metal') => {
  const context = useContext(CurrencyContext);
  return context.currenciesByType(type);
};

export const useAllCurrencies = () => {
  const context = useContext(CurrencyContext);
  return context.allCurrencies;
};
```

Cache currencies in context to avoid repeated API calls.

## Replace Hardcoded Currency References

### Frontend files to update:

1. **`client/src/pages/SettingsPage.tsx`**
   - Line 38-386: Replace hardcoded currencies array with `useCurrencies()` hook

2. **`client/src/pages/RegisterPage.tsx`**
   - Line 305-310: Replace hardcoded currencies array with `useCurrencies()` hook

3. **`client/src/pages/AssetsPage.tsx`**
   - Line 467-473: Replace hardcoded currency options with dynamic list from `useAllCurrencies()`

4. **`client/src/pages/IncomePage.tsx`**
   - Find currency dropdown and replace with `useCurrencies()` hook

5. **`client/src/components/AddEditAssetModal.tsx`**
   - Line 140-161: Replace cryptoCurrencyOptions and fiatCurrencyOptions with `useCurrenciesByType('cryptocurrency')` and `useCurrenciesByType('fiat')`

6. **`client/src/components/ValuationHistoryModal.tsx`**
   - Replace any hardcoded currency lists with `useCurrencies()` hook

### Backend validation updates:
- Create helper function `getActiveCurrencyCodes()` in `src/utils/currencyHelpers.ts`
- Use in validation middleware across all routes
- Cache currency codes with 5-minute TTL to avoid DB query on every request

## Translation Keys

Add to `src/migrations/seedTranslations.ts`:

```typescript
// Currency Management (Admin)
{ key: 'admin.currencyManagement', category: 'admin', en: 'Currency Management', de: 'Währungsverwaltung', tr: 'Para Birimi Yönetimi' },
{ key: 'currencies.title', category: 'currencies', en: 'Currencies', de: 'Währungen', tr: 'Para Birimleri' },

// Currency CRUD
{ key: 'currencies.addCurrency', category: 'currencies', en: 'Add Currency', de: 'Währung hinzufügen', tr: 'Para Birimi Ekle' },
{ key: 'currencies.editCurrency', category: 'currencies', en: 'Edit Currency', de: 'Währung bearbeiten', tr: 'Para Birimini Düzenle' },
{ key: 'currencies.deleteCurrency', category: 'currencies', en: 'Delete Currency', de: 'Währung löschen', tr: 'Para Birimi Sil' },
{ key: 'currencies.currencyCode', category: 'currencies', en: 'Currency Code', de: 'Währungscode', tr: 'Para Birimi Kodu' },
{ key: 'currencies.currencyName', category: 'currencies', en: 'Currency Name', de: 'Währungsname', tr: 'Para Birimi Adı' },
{ key: 'currencies.nameEn', category: 'currencies', en: 'Name (English)', de: 'Name (Englisch)', tr: 'Adı (İngilizce)' },
{ key: 'currencies.nameDe', category: 'currencies', en: 'Name (German)', de: 'Name (Deutsch)', tr: 'Adı (Almanca)' },
{ key: 'currencies.nameTr', category: 'currencies', en: 'Name (Turkish)', de: 'Name (Türkisch)', tr: 'Adı (Türkçe)' },
{ key: 'currencies.symbol', category: 'currencies', en: 'Symbol', de: 'Symbol', tr: 'Sembol' },
{ key: 'currencies.type', category: 'currencies', en: 'Type', de: 'Typ', tr: 'Tür' },
{ key: 'currencies.fiat', category: 'currencies', en: 'Fiat Currency', de: 'Fiat-Währung', tr: 'Fiat Para' },
{ key: 'currencies.cryptocurrency', category: 'currencies', en: 'Cryptocurrency', de: 'Kryptowährung', tr: 'Kripto Para' },
{ key: 'currencies.preciousMetal', category: 'currencies', en: 'Precious Metal', de: 'Edelmetall', tr: 'Değerli Maden' },
{ key: 'currencies.status', category: 'currencies', en: 'Status', de: 'Status', tr: 'Durum' },
{ key: 'currencies.active', category: 'currencies', en: 'Active', de: 'Aktiv', tr: 'Aktif' },
{ key: 'currencies.inactive', category: 'currencies', en: 'Inactive', de: 'Inaktiv', tr: 'Pasif' },
{ key: 'currencies.displayOrder', category: 'currencies', en: 'Display Order', de: 'Anzeigereihenfolge', tr: 'Görüntüleme Sırası' },
{ key: 'currencies.usageCount', category: 'currencies', en: 'Usage', de: 'Verwendung', tr: 'Kullanım' },

// Modals and Actions
{ key: 'currencies.deleteConfirm', category: 'currencies', en: 'Are you sure you want to delete this currency?', de: 'Möchten Sie diese Währung wirklich löschen?', tr: 'Bu para birimini silmek istediğinizden emin misiniz?' },
{ key: 'currencies.cannotDelete', category: 'currencies', en: 'Cannot delete currency because it is in use', de: 'Währung kann nicht gelöscht werden, da sie verwendet wird', tr: 'Kullanıldığı için para birimi silinemez' },
{ key: 'currencies.toggleConfirm', category: 'currencies', en: 'Toggle currency active status?', de: 'Währungsstatus umschalten?', tr: 'Para birimi durumunu değiştir?' },

// Validation Messages
{ key: 'currencies.codeRequired', category: 'currencies', en: 'Currency code is required', de: 'Währungscode ist erforderlich', tr: 'Para birimi kodu gereklidir' },
{ key: 'currencies.nameRequired', category: 'currencies', en: 'Currency name is required', de: 'Währungsname ist erforderlich', tr: 'Para birimi adı gereklidir' },
{ key: 'currencies.symbolRequired', category: 'currencies', en: 'Symbol is required', de: 'Symbol ist erforderlich', tr: 'Sembol gereklidir' },
{ key: 'currencies.codeDuplicate', category: 'currencies', en: 'This currency code already exists', de: 'Dieser Währungscode existiert bereits', tr: 'Bu para birimi kodu zaten mevcut' },
{ key: 'currencies.codeInvalid', category: 'currencies', en: 'Invalid currency code format', de: 'Ungültiges Währungscode-Format', tr: 'Geçersiz para birimi kodu formatı' },

// Filter and Search
{ key: 'currencies.filterByType', category: 'currencies', en: 'Filter by Type', de: 'Nach Typ filtern', tr: 'Türe Göre Filtrele' },
{ key: 'currencies.filterByStatus', category: 'currencies', en: 'Filter by Status', de: 'Nach Status filtern', tr: 'Duruma Göre Filtrele' },
{ key: 'currencies.searchPlaceholder', category: 'currencies', en: 'Search by code or name', de: 'Nach Code oder Name suchen', tr: 'Kod veya isme göre ara' },
{ key: 'currencies.noCurrencies', category: 'currencies', en: 'No currencies found', de: 'Keine Währungen gefunden', tr: 'Para birimi bulunamadı' },

// Types
{ key: 'currencies.allTypes', category: 'currencies', en: 'All Types', de: 'Alle Typen', tr: 'Tüm Türler' },
{ key: 'currencies.allStatus', category: 'currencies', en: 'All Status', de: 'Alle Status', tr: 'Tüm Durumlar' },
```

## Migration Strategy

### Step 1: Database Migration
1. Create currencies table in database.ts
2. Run seedCurrencies migration to populate initial data
3. Verify currency data is seeded correctly

### Step 2: Backend Updates
1. Create currencies.ts routes file
2. Create currencyHelpers.ts utility with caching
3. Update exchange rate service to query from database
4. Update all route validations to use dynamic currency lists

### Step 3: Frontend Updates
1. Create CurrencyManagementPage.tsx and AddEditCurrencyModal.tsx
2. Create useCurrencies hook with context provider
3. Update all frontend components to use currency hooks
4. Add navigation link to admin menu

### Step 4: Testing
1. Test admin CRUD operations
2. Verify all dropdowns load from database
3. Test exchange rate sync with new currencies
4. Verify existing data still displays correctly
5. Test validation (can't use inactive currencies, etc.)

### Step 5: Deployment
1. Deploy to Heroku
2. Run database migration
3. Verify production deployment works

## Testing Checklist

1. ✅ Admin can view all currencies
2. ✅ Admin can filter by type (Fiat, Crypto, Metal)
3. ✅ Admin can filter by status (Active, Inactive, All)
4. ✅ Admin can search currencies by code or name
5. ✅ Admin can add new currency with all fields
6. ✅ Admin can edit existing currency
7. ✅ Admin can toggle currency active/inactive status
8. ✅ Admin can reorder currencies via display_order
9. ✅ Admin cannot delete currency that's in use
10. ✅ All currency dropdowns load from database
11. ✅ Assets page uses dynamic currency list
12. ✅ Income page uses dynamic currency list
13. ✅ Settings page uses dynamic currency list
14. ✅ Register page uses dynamic currency list
15. ✅ Add/Edit Asset modal shows correct currencies by type
16. ✅ Exchange rate sync works with database currencies
17. ✅ Fiat currencies sync via ExchangeRate-API
18. ✅ Cryptocurrency sync via CoinGecko API
19. ✅ Precious metal sync via Metals-API
20. ✅ Validation prevents using inactive currencies
21. ✅ Existing assets/income records display correctly
22. ✅ Currency codes are cached (5-minute TTL)
23. ✅ Performance: no excessive DB queries

## Implementation Notes

- Backward compatibility: Keep existing USD, EUR, GBP, TRY, GOLD data
- Caching: Currency codes cached for 5 minutes to reduce DB queries
- Usage tracking: Count how many assets/income records use each currency before allowing deletion
- Type-based filtering: Fiat vs Crypto vs Metal dropdowns where appropriate
- Display order: Allow manual ordering of currencies in dropdowns
- Tri-lingual names: Support English, German, Turkish names per currency
- Cannot delete currencies in use: Check dependencies before deletion
- Inactive currencies: Don't appear in dropdowns but still display in existing records

## Future Enhancements (not in this phase)

- Automatic exchange rate fetching for cryptocurrencies
- Currency flags/icons in dropdowns
- Bulk currency import from CSV
- Currency usage analytics
- Historical currency data
- Automatic pricing updates for stocks (via ticker symbols)

### To-dos

- [ ] Create currencies table schema in database.ts with proper indexes and constraints
- [ ] Create seedCurrencies.ts migration with all fiat, crypto, and precious metal currencies  
- [ ] Create currencies.ts routes file with full CRUD operations and admin authentication
- [ ] Create currency validation helper in utils/currencyHelpers.ts with caching
- [ ] Update exchangeRateService.ts to query currencies from database and add crypto/metal sync methods
- [ ] Create useCurrencies hook with context provider for caching and type filtering
- [ ] Create CurrencyManagementPage.tsx with table view, filters, and CRUD operations
- [ ] Create AddEditCurrencyModal.tsx component with form validation
- [ ] Replace hardcoded currency validation in assets.ts, income.ts, auth.ts, settings.ts
- [ ] Replace hardcoded currency lists in SettingsPage, RegisterPage, AssetsPage, IncomePage, AddEditAssetModal, ValuationHistoryModal
- [ ] Add Currency Management link to Sidebar.tsx under Admin section
- [ ] Add all currency-related translation keys to seedTranslations.ts
- [ ] Test admin CRUD operations, currency filtering, exchange rate sync, and validation
- [ ] Deploy to Heroku and verify production works

