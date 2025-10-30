# Fix Personal View Button Functionality

## Problem

- Button click doesn't visually update (likely working but numbers don't reflect ownership)
- Summary calculation includes full asset value even when user only owns a percentage share
- Personal View should show user's actual valuation, not household totals
- Assets where user has no ownership should be completely hidden in Personal View

## Solution

Update the backend summary endpoint to calculate values based on actual ownership percentages when in Personal View. Assets without user ownership must be filtered out completely.

## Changes Required

### 1. Fix Summary Endpoint (`src/routes/assets.ts`)

   - Modify `/api/assets/summary` endpoint (lines 212-385)
   - When `household_view !== 'true'` (Personal View):
     - **Filter out assets completely** where user is NOT the owner AND NOT in shared ownership distribution
     - For assets where user is primary owner: include 100% of value
     - For shared ownership assets: calculate and include only user's percentage share: `asset_value * (ownership_percentage / 100)`
     - Ensure the WHERE clause properly excludes assets with no user ownership
   - Fix syntax error on line 278 (missing opening parenthesis)
   - For Household View: continue showing full household totals (current behavior)

### 2. Verify Asset Listing Query (`src/routes/assets.ts`)

   - Ensure `/api/assets` GET endpoint (lines 388-586) also properly filters out assets with no user ownership in Personal View
   - The existing query logic should already do this, but verify it's working correctly

### 3. Frontend Verification (`client/src/pages/AssetsPage.tsx`)

   - Verify button state updates properly (lines 476-486)
   - Ensure useEffect dependencies trigger refetch (lines 249-255)
   - Add loading state feedback when switching views
   - Confirm summary cards update when toggling views

### 4. Testing Considerations

   - Test with assets where user owns 100%
   - Test with shared ownership assets (e.g., user owns 30%)
   - Test with assets where user has no ownership (should be hidden in Personal View)
   - Verify totals match expected percentage calculations
   - Ensure Household View still shows full totals
   - Verify button visual state updates correctly

## Implementation Details

### Backend Logic for Personal View Valuation:

```
IF household_view != 'true' THEN
  FOR EACH asset:
    IF user is primary owner (a.user_id = req.user.id):
      value = full_asset_value
      include asset in results
    ELSE IF user has shared ownership:
      ownership_percentage = get from shared_ownership_distribution
      value = asset_value * (ownership_percentage / 100)
      include asset in results
    ELSE:
      exclude asset completely (user has no ownership)
    ADD value to totals
END IF
```

### Files to Modify:

- `src/routes/assets.ts` - Summary and listing endpoints
- `client/src/pages/AssetsPage.tsx` - Verify frontend triggers updates