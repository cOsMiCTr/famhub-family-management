import { pool } from '../config/database';

let currencyCache: { codes: string[], expires: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all active currency codes from database
 * Results are cached for 5 minutes to reduce database queries
 */
export async function getActiveCurrencyCodes(): Promise<string[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (currencyCache && now < currencyCache.expires) {
    return currencyCache.codes;
  }
  
  // Fetch from database
  const result = await pool.query(
    'SELECT code FROM currencies WHERE is_active = true ORDER BY display_order ASC'
  );
  
  const codes = result.rows.map(row => row.code);
  
  // Cache for 5 minutes
  currencyCache = {
    codes,
    expires: now + CACHE_TTL
  };
  
  return codes;
}

/**
 * Get active currencies filtered by type
 */
export async function getActiveCurrenciesByType(type: 'fiat' | 'cryptocurrency' | 'precious_metal'): Promise<any[]> {
  const result = await pool.query(
    `SELECT * FROM currencies 
     WHERE is_active = true AND currency_type = $1 
     ORDER BY display_order ASC, code ASC`,
    [type]
  );
  return result.rows;
}

/**
 * Get all active currencies
 */
export async function getActiveCurrencies(): Promise<any[]> {
  const result = await pool.query(
    'SELECT * FROM currencies WHERE is_active = true ORDER BY display_order ASC, code ASC'
  );
  return result.rows;
}

/**
 * Invalidate the currency cache (call this when currencies are updated)
 */
export function invalidateCurrencyCache(): void {
  currencyCache = null;
}

/**
 * Get a single currency by code
 */
export async function getCurrencyByCode(code: string): Promise<any> {
  const result = await pool.query(
    'SELECT * FROM currencies WHERE code = $1',
    [code]
  );
  return result.rows[0] || null;
}

