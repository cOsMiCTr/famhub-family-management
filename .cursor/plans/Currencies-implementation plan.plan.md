<!-- 91466788-b2f4-40c7-8daa-264ce5e5998b af17ea8c-e55e-4e1d-8e87-85a662151e55 -->
# Currency Sync and Display Optimization

## Overview

Refactor the exchange rate system to dynamically fetch only active currencies from the database, eliminate all hardcoded currency lists, implement sequential fiat-to-all pairing logic, and update all UI dropdowns to show only fiat currencies with symbol formatting.

## Backend Changes

### 1. Create Helper Function to Fetch Active Currencies by Type

**File**: `src/services/exchangeRateService.ts`

Add a new method to fetch active currencies from the database by type:

```typescript
private async getActiveCurrenciesByType(type: 'fiat' | 'cryptocurrency' | 'precious_metal'): Promise<string[]> {
  const result = await query(
    'SELECT code FROM currencies WHERE currency_type = $1 AND is_active = true ORDER BY code',
    [type]
  );
  return result.rows.map(row => row.code);
}
```

### 2. Refactor updateRatesFromFinnhub to Use Database

**File**: `src/services/exchangeRateService.ts` (lines 82-220)

Replace hardcoded currency arrays with database queries:

- Remove hardcoded `fiatCurrencies`, `cryptoSymbols`, `cryptoCodes` arrays
- Fetch active currencies dynamically using `getActiveCurrenciesByType()`
- Implement sequential fiat-to-all pairing: for each active fiat currency (USD, EUR, GBP, TRY), fetch rates to all other active fiats, cryptos, and metals
- Skip reverse pairs (e.g., if USD→EUR exists, don't fetch EUR→USD, calculate it as 1/rate)

Logic:

```typescript
const activeFiats = await this.getActiveCurrenciesByType('fiat');
const activeCryptos = await this.getActiveCurrenciesByType('cryptocurrency');
const activeMetals = await this.getActiveCurrenciesByType('precious_metal');

for (const baseFiat of activeFiats) {
  // Fetch baseFiat to all other fiats (skip already processed pairs)
  // Fetch baseFiat to all cryptos
  // Fetch baseFiat to all metals
}
```

### 3. Update Scraping Methods

**File**: `src/services/exchangeRateService.ts`

Update `updateFiatRates()`, `updateCryptocurrencyRates()`, `updateGoldRates()`, and `updateMetalRates()` to:

- Fetch active currencies from database instead of hardcoded lists
- Only scrape for active currencies

### 4. Clean Up getExchangeRate Method

**File**: `src/services/exchangeRateService.ts` (around line 434)

Update the on-demand cross-conversion logic to:

- Remove hardcoded `cryptoCurrencies` array
- Fetch active crypto currencies from database when needed
- Keep the debug logging for EUR to crypto conversions

## Frontend Changes

### 5. Update DashboardPage Currency Dropdowns

**File**: `client/src/pages/DashboardPage.tsx`

**A. Modify `getAvailableCurrencies()` function** (line 236):

- Change to only return active fiat currencies (exclude cryptos and metals)
- Format as "Currency Name (Symbol)" e.g., "US Dollar ($)"

**B. Update "View in:" dropdown** (around line 408):

- Display format: "US Dollar ($)", "Euro (€)", "British Pound (£)", "Turkish Lira (₺)"
- Filter: only active fiat currencies, excluding user's main currency

**C. Update Exchange Rates display section** (around line 450):

- Show only fiat currencies in the "Configure Exchange Rates" modal
- Remove crypto/metal options from the displayed exchange rates section

### 6. Create Currency Formatting Helper

**File**: `client/src/utils/currencyHelpers.ts` (NEW FILE)

Create a helper function to format currency display:

```typescript
export const formatCurrencyWithSymbol = (code: string, name: string, symbol: string): string => {
  return `${name} (${symbol})`;
};

export const getCurrencySymbol = (code: string): string => {
  const symbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'TRY': '₺',
    // Add more as needed
  };
  return symbols[code] || code;
};
```

### 7. Update SettingsPage Currency Dropdown

**File**: `client/src/pages/SettingsPage.tsx`

Update the "Preferred Currency" dropdown (search for `main_currency` select):

- Filter to show only active fiat currencies
- Display format: "US Dollar ($)", "Euro (€)", etc.
- Use the new `formatCurrencyWithSymbol` helper

### 8. Update ExchangeRateConfigModal

**File**: `client/src/components/ExchangeRateConfigModal.tsx`

Modify to:

- Only show fiat currencies in the list
- Filter out cryptocurrencies and metals
- Update the prop type/interface to accept filtered currencies

## Database Query Optimization

### 9. Verify Currency Table Structure

**File**: `src/config/database.ts`

Ensure the `currencies` table has proper indexes:

- Index on `is_active` column
- Index on `currency_type` column
- This will speed up the active currency queries

## Testing Checklist

After implementation:

1. Verify only active currencies from database are synced
2. Check that USD→EUR, USD→BTC, EUR→BTC, GBP→BTC patterns are created correctly
3. Confirm no CAD, AUD, DOGE, BNB, etc. are fetched (unless marked active)
4. Test Dashboard "View in:" dropdown shows only fiat with symbols
5. Test Dashboard Exchange Rates config shows only fiat
6. Test Settings page currency dropdown shows only fiat with symbols
7. Verify sync completes without timeout
8. Check that reverse rates (e.g., EUR→USD from USD→EUR) are calculated correctly

### To-dos

- [ ] Add getActiveCurrenciesByType() helper method to fetch active currencies by type from database
- [ ] Refactor updateRatesFromFinnhub() to use database queries and implement sequential fiat-to-all pairing logic
- [ ] Update all scraping methods (updateFiatRates, updateCryptocurrencyRates, updateGoldRates, updateMetalRates) to fetch active currencies from database
- [ ] Remove hardcoded crypto array from getExchangeRate() and fetch from database when needed
- [ ] Create new currency helper utility file with formatCurrencyWithSymbol() and getCurrencySymbol() functions
- [ ] Update DashboardPage getAvailableCurrencies() to return only fiat currencies and format with symbols
- [ ] Update Dashboard 'View in:' dropdown to show only fiat currencies with symbol formatting
- [ ] Update Dashboard Exchange Rates section to display only fiat currencies
- [ ] Update SettingsPage currency dropdown to show only fiat currencies with symbol formatting
- [ ] Update ExchangeRateConfigModal to filter and display only fiat currencies
- [ ] Test exchange rate sync to verify only active currencies are fetched and no hardcoded extras