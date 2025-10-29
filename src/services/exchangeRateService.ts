import axios from 'axios';
import cron from 'node-cron';
import * as cheerio from 'cheerio';
import { query } from '../config/database';

interface ExchangeRateData {
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at?: string;
}

interface GoldPriceData {
  price: number;
  currency: string;
}

class ExchangeRateService {
  private currencyApiKey: string;
  private isUpdating: boolean = false;

  constructor() {
    this.currencyApiKey = process.env.CURRENCY_API_KEY || '';
    
    // Start scheduled updates
    this.startScheduledUpdates();
  }

  // Start scheduled updates every 6 hours
  private startScheduledUpdates(): void {
    // DISABLED: Only update on manual sync via Sync button
    // Rates are fetched from database on page refresh, API calls only on sync
  }

  // Helper method to fetch active currencies by type from database
  private async getActiveCurrenciesByType(type: 'fiat' | 'cryptocurrency' | 'precious_metal'): Promise<string[]> {
    const result = await query(
      'SELECT code FROM currencies WHERE currency_type = $1 AND is_active = true ORDER BY code',
      [type]
    );
    return result.rows.map(row => row.code);
  }

  // Helper method to get Finnhub symbol mapping for a crypto/metal code
  private getFinnhubSymbol(code: string, type: 'cryptocurrency' | 'precious_metal'): string {
    if (type === 'cryptocurrency') {
      // Convert crypto code to Finnhub format: BTC -> BINANCE:BTCUSDT
      return `BINANCE:${code}USDT`;
    } else if (type === 'precious_metal') {
      // Metal mappings
      const metalMap: Record<string, string> = {
        'GOLD': 'OANDA:XAU_USD',
        'SILVER': 'OANDA:XAG_USD',
        'PLATINUM': 'OANDA:XPT_USD',
        'PALLADIUM': 'OANDA:XPD_USD'
      };
      return metalMap[code] || '';
    }
    return '';
  }

  // Update exchange rates from external API
  async updateExchangeRates(): Promise<void> {
    if (this.isUpdating) {
      return;
    }

    this.isUpdating = true;

    try {
      await this.updateRatesFromExchangeRatesData();
    } catch (apiError) {
      console.error('❌ ExchangeRate-API.com failed:', apiError);
      throw new Error('Failed to sync exchange rates - API error');
    } finally {
      this.isUpdating = false;
    }
  }

  // Fetch rates from ExchangeRates-Data API - using simple approach with EUR as base
  private async updateRatesFromExchangeRatesData(): Promise<void> {
    const allRates: ExchangeRateData[] = [];
    
    // Fetch active currencies from database
    const activeFiats = await this.getActiveCurrenciesByType('fiat');
    const activeCryptos = await this.getActiveCurrenciesByType('cryptocurrency');
    const activeMetals = await this.getActiveCurrenciesByType('precious_metal');
    
    // First, fetch crypto prices once (in USD) from Yahoo Finance
    const cryptoPricesInUSD: Record<string, number> = {};
    
    // Yahoo Finance ticker symbols
    const yahooTickers: Record<string, string> = {
      'BTC': 'BTC-USD',
      'ETH': 'ETH-USD',
      'XRP': 'XRP-USD',
      'LTC': 'LTC-USD',
      'SOL': 'SOL-USD',
      'BNB': 'BNB-USD',
      'ADA': 'ADA-USD',
      'DOT': 'DOT-USD',
      'MATIC': 'MATIC-USD',
      'AVAX': 'AVAX-USD',
      'LINK': 'LINK-USD',
      'UNI': 'UNI-USD'
    };
    
    for (const crypto of activeCryptos) {
      try {
        const ticker = yahooTickers[crypto];
        if (!ticker) {
          continue;
        }
        
        // Try multiple methods: Yahoo Finance API then scraping
        let cryptoPriceInUSD: number | null = null;
        
        // Method 1: Try Yahoo Finance API
        try {
          const yahooApiUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
          const yahooResponse = await axios.get(yahooApiUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (yahooResponse.data?.chart?.result?.[0]?.meta?.regularMarketPrice) {
            cryptoPriceInUSD = yahooResponse.data.chart.result[0].meta.regularMarketPrice;
          }
        } catch (apiError) {
          
          // Method 2: Fallback to CoinMarketCap scraping
          try {
            const cmcUrls: Record<string, string> = {
              'BTC': 'https://coinmarketcap.com/currencies/bitcoin/',
              'ETH': 'https://coinmarketcap.com/currencies/ethereum/',
              'XRP': 'https://coinmarketcap.com/currencies/ripple/',
              'LTC': 'https://coinmarketcap.com/currencies/litecoin/',
              'SOL': 'https://coinmarketcap.com/currencies/solana/',
              'BNB': 'https://coinmarketcap.com/currencies/bnb/',
              'ADA': 'https://coinmarketcap.com/currencies/cardano/',
              'DOT': 'https://coinmarketcap.com/currencies/polkadot/',
              'MATIC': 'https://coinmarketcap.com/currencies/polygon/',
              'AVAX': 'https://coinmarketcap.com/currencies/avalanche/',
              'LINK': 'https://coinmarketcap.com/currencies/chainlink/',
              'UNI': 'https://coinmarketcap.com/currencies/uniswap/'
            };
            
            const cmcUrl = cmcUrls[crypto];
            if (cmcUrl) {
              const cmcResponse = await axios.get(cmcUrl, {
                timeout: 10000,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              });
              
              const $ = cheerio.load(cmcResponse.data);
              
              // Try multiple selectors
              let priceText = $('span[class*="priceValue"]').first().text().trim();
              if (!priceText) {
                priceText = $('span.sc-aef7b723-0.bsFTBp').first().text();
              }
              if (!priceText) {
                priceText = $('.priceValue').first().text();
              }
              
              if (priceText) {
                cryptoPriceInUSD = parseFloat(priceText.replace(/[$,]/g, ''));
              }
            }
          } catch (scrapeError) {
            // Silently continue to next crypto
          }
        }
        
        if (cryptoPriceInUSD && !isNaN(cryptoPriceInUSD)) {
          cryptoPricesInUSD[crypto] = cryptoPriceInUSD;
        }
      } catch (error) {
        // Silently continue to next crypto
      }
    }
    
    // Fetch rates for ALL active fiat currencies
    try {
      // Fetch rates for each active fiat currency as base
      for (const baseFiat of activeFiats) {
        let apiUrl: string = '';
        try {
          // Use API key if available (v6 endpoint), otherwise use free v4 endpoint
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(7);
          
          if (this.currencyApiKey) {
            // Use v6 endpoint with API key for more frequent updates
            apiUrl = `https://v6.exchangerate-api.com/v6/${this.currencyApiKey}/latest/${baseFiat}`;
          } else {
            // Fallback to free v4 endpoint (updates once per day, no key required)
            apiUrl = `https://api.exchangerate-api.com/v4/latest/${baseFiat}?t=${timestamp}&r=${random}`;
          }
          
          const response = await axios.get(
            apiUrl,
            { 
              timeout: 15000,
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            }
          );
          
          // KEEP ONLY THIS LOG - API response
          console.log(`📥 API Response ${baseFiat}:`, {
            status: response.status,
            hasRates: !!(response.data && response.data.rates),
            ratesCount: response.data?.rates ? Object.keys(response.data.rates).length : 0,
          });
          
          if (response.data && response.data.rates) {
            const fiatToUSD = response.data.rates.USD || 1;
            
            // Add fiat rates for other active fiats
            for (const targetFiat of activeFiats) {
              if (targetFiat === baseFiat) continue;
              
              if (response.data.rates[targetFiat]) {
                const rate = response.data.rates[targetFiat];
                
                allRates.push({
                  from_currency: baseFiat,
                  to_currency: targetFiat,
                  rate: rate
                });
              }
            }
            
            // Add crypto rates for this fiat using fetched crypto prices
            for (const crypto of activeCryptos) {
              if (!cryptoPricesInUSD[crypto]) continue;
              
              // Calculate fiat to crypto rate
              // Formula: 1 Fiat = (crypto_price_in_USD) / (Fiat/USD)
              const fiatToCrypto = cryptoPricesInUSD[crypto] / fiatToUSD;
              
              allRates.push({
                from_currency: baseFiat,
                to_currency: crypto,
                rate: fiatToCrypto
              });
            }
            
            // Add metal rates for this fiat
            for (const metal of activeMetals) {
              // Fallback metal prices per troy ounce in USD
              const metalPricesInUSD: Record<string, number> = {
                'GOLD': 2100,
                'SILVER': 25,
                'PLATINUM': 1100,
                'PALLADIUM': 1100
              };
              
              const metalPriceInUSD = metalPricesInUSD[metal];
              if (!metalPriceInUSD) {
                continue;
              }
              
              // Calculate fiat to metal rate (price per ounce)
              // Formula: 1 Fiat = (metal_price_in_USD) / (Fiat/USD)
              const fiatToMetal = metalPriceInUSD / fiatToUSD;
              
              allRates.push({
                from_currency: baseFiat,
                to_currency: metal,
                rate: fiatToMetal
              });
            }
          }
        } catch (error: any) {
          console.error(`❌ Failed to fetch rates for ${baseFiat}:`, {
            status: error.response?.status,
            message: error.message
          });
          // Continue with next currency - don't throw, allow other currencies to be fetched
        }
      }
    } catch (error) {
      console.error(`❌ Failed to fetch forex rates:`, error);
      throw error;
    }
    
    // Store all rates
    if (allRates.length > 0) {
      await this.storeExchangeRates(allRates);
    } else {
      throw new Error('No rates fetched from ExchangeRate-API.com');
    }
  }

  // Update fiat currency exchange rates - Now uses scraping
  private async updateFiatRates(): Promise<void> {
    try {
      console.log('💰 Scraping fiat currency rates...');
      
      // Scrape from multiple sources
      const scrapedRates = await this.scrapeAllRates();
      
      if (scrapedRates.length > 0) {
        await this.storeExchangeRates(scrapedRates);
        console.log(`✅ Scraped ${scrapedRates.length} fiat rates successfully`);
      } else {
        console.warn('⚠️ No rates scraped, using fallback rates');
        await this.setFallbackRates(false);
      }

    } catch (error) {
      console.error('Failed to scrape fiat rates:', error);
      await this.setFallbackRates(false);
    }
  }

  // Update gold rates - Now uses scraping
  private async updateGoldRates(): Promise<void> {
    try {
      console.log('🥇 Scraping gold rates...');
      
      const goldRates = await this.scrapeGoldRates();
      
      if (goldRates.length > 0) {
        await this.storeExchangeRates(goldRates);
        console.log(`✅ Scraped ${goldRates.length} gold rates successfully`);
      } else {
        console.warn('⚠️ No gold rates scraped, using fallback rates');
        await this.setFallbackGoldRates();
      }

    } catch (error) {
      console.error('Failed to scrape gold rates:', error);
      await this.setFallbackGoldRates();
    }
  }

  // Update cryptocurrency rates - Scraping from CoinMarketCap
  private async updateCryptocurrencyRates(): Promise<void> {
    try {
      console.log('💰 Scraping cryptocurrency rates from CoinMarketCap...');
      
      // Try scraping first
      const scrapedCryptoRates = await this.scrapeCryptocurrencyRates();
      
      if (scrapedCryptoRates.length > 0) {
        await this.storeExchangeRates(scrapedCryptoRates);
        console.log(`✅ Scraped ${scrapedCryptoRates.length} cryptocurrency rates`);
        return;
      }
      
      console.log('⚠️ Scraping failed from CoinMarketCap...');

    } catch (error) {
      console.error('Failed to fetch cryptocurrency rates:', error);
    }
  }

  // Update metal rates - Now uses scraping
  private async updateMetalRates(): Promise<void> {
    try {
      console.log('🥇 Scraping metal rates...');
      
      const metalRates = await this.scrapeMetalRates();
      
      if (metalRates.length > 0) {
        await this.storeExchangeRates(metalRates);
        console.log(`✅ Scraped ${metalRates.length} metal rates successfully`);
      } else {
        console.warn('⚠️ No metal rates scraped');
      }

    } catch (error) {
      console.error('Failed to scrape metal rates:', error);
    }
  }

  // Set fallback exchange rates when API is unavailable
  private async setFallbackRates(forceScraping: boolean = false): Promise<void> {
    console.log('🔄 Attempting to use last known rates as fallback...');
    
    // For manual sync, use a shorter threshold (1 hour instead of 24 hours)
    const threshold = forceScraping ? '1 hour' : '24 hours';
    
    // First, check if we have recent rates in database
    const recentRates = await query(
      `SELECT from_currency, to_currency, rate, updated_at 
       FROM exchange_rates 
       WHERE updated_at > NOW() - INTERVAL '${threshold}'
       ORDER BY updated_at DESC`
    );
    
    if (recentRates.rows.length > 0 && !forceScraping) {
      console.log(`✅ Using ${recentRates.rows.length} recent rates as fallback (${threshold} threshold)`);
      return; // Keep existing recent rates, don't overwrite
    }
    
    // If no recent rates or force scraping, try scraping
    console.log(`⚠️ No recent rates found (${threshold} threshold) or force scraping enabled, attempting to scrape...`);
    const scrapedRates = await this.scrapeAllRates();
    
    if (scrapedRates.length > 0) {
      console.log(`✅ Scraped ${scrapedRates.length} rates successfully`);
      await this.storeExchangeRates(scrapedRates);
      return;
    }
    
    // Last resort: log that fallback is not available
    console.log('⚠️ All syncing methods failed. Please check your internet connection and Finnhub API key.');
  }

  // Set fallback gold rates
  private async setFallbackGoldRates(): Promise<void> {
    console.log('⚠️ Gold fallback rates deprecated. Use Finnhub API instead.');
  }

  // Store exchange rates in database
  private async storeExchangeRates(rates: ExchangeRateData[]): Promise<void> {
    for (const rate of rates) {
      await query(
        `INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (from_currency, to_currency)
         DO UPDATE SET rate = $3, updated_at = CURRENT_TIMESTAMP`,
        [rate.from_currency, rate.to_currency, rate.rate]
      );
    }
  }
  
  // Create cross-conversions between all currencies through common pairs
  private async createCrossConversions(): Promise<void> {
    // Fetch all active currencies from database
    const allCurrencies = await query('SELECT code FROM currencies WHERE is_active = true');
    const currencies = allCurrencies.rows.map(row => row.code);
    
    try {
      console.log(`🔄 Creating cross-conversions for ${currencies.length} currencies (${currencies.length * (currencies.length - 1)} possible pairs)...`);
      
      for (const fromCurrency of currencies) {
        for (const toCurrency of currencies) {
          if (fromCurrency !== toCurrency) {
            // Check if rate already exists
            const existingRate = await query(
              'SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2',
              [fromCurrency, toCurrency]
            );
            
            if (existingRate.rows.length === 0) {
              // Try to create rate through USD
              try {
                // Get from -> USD and USD -> to rates
                const toUSDRate = await query(
                  'SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2',
                  [fromCurrency, 'USD']
                );
                const fromUSDRate = await query(
                  'SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2',
                  ['USD', toCurrency]
                );
                
                if (toUSDRate.rows.length > 0 && fromUSDRate.rows.length > 0) {
                  // Get rates: fromCurrency -> USD -> toCurrency
                  const fromCurrencyToUSD = parseFloat(toUSDRate.rows[0].rate);
                  const usdToToCurrency = parseFloat(fromUSDRate.rows[0].rate);
                  
                  // Determine if we're dealing with cryptocurrencies
                  const cryptoCurrencies = await this.getActiveCurrenciesByType('cryptocurrency');
                  const isFromCrypto = cryptoCurrencies.includes(fromCurrency);
                  const isToCrypto = cryptoCurrencies.includes(toCurrency);
                  
                  // Calculate cross rate
                  let crossRate;
                  if (fromCurrency === 'USD') {
                    crossRate = usdToToCurrency;
                  } else if (toCurrency === 'USD') {
                    crossRate = fromCurrencyToUSD;
                  } else if (isFromCrypto && !isToCrypto) {
                    // From crypto to fiat: BTC->EUR
                    // Example: BTC/USD = 65000, EUR/USD = 0.85
                    // 1 BTC = 65000 USD = 65000 / 0.85 = 76,470 EUR
                    // Formula: crypto_in_usd / fiat_per_usd
                    crossRate = usdToToCurrency / fromCurrencyToUSD;
                  } else if (!isFromCrypto && isToCrypto) {
                    // From fiat to crypto: EUR->BTC  
                    // Example: EUR/USD = 0.85, BTC/USD = 65000
                    // 1 EUR = 0.85 USD = 0.85 / 65000 = 0.000013 BTC
                    // Formula: fiat_in_usd / crypto_in_usd
                    crossRate = fromCurrencyToUSD / usdToToCurrency;
                  } else {
                    // Both are same type (fiat->fiat or crypto->crypto): 
                    // Formula: (A_per_USD) / (B_per_USD) = A_to_B
                    crossRate = fromCurrencyToUSD / usdToToCurrency;
                  }
                  
                  await query(
                    `INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
                     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                     ON CONFLICT (from_currency, to_currency)
                     DO UPDATE SET rate = $3, updated_at = CURRENT_TIMESTAMP`,
                    [fromCurrency, toCurrency, crossRate]
                  );
                }
              } catch (error) {
                // Silently skip if conversion not possible
              }
            }
          }
        }
      }
      console.log('✅ Created cross-currency conversions');
    } catch (error) {
      console.error('Error creating cross-conversions:', error);
    }
  }

  // Get exchange rate between two currencies
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const result = await query(
      'SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2',
      [fromCurrency, toCurrency]
    );

    if (result.rows.length === 0) {
      // Try to calculate on-demand through USD
      try {
        // Get from -> USD and USD -> to rates
        const toUSDRate = await query(
          'SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2',
          [fromCurrency, 'USD']
        );
        const fromUSDRate = await query(
          'SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2',
          ['USD', toCurrency]
        );
        
        if (toUSDRate.rows.length > 0 && fromUSDRate.rows.length > 0) {
          const fromCurrencyToUSD = parseFloat(toUSDRate.rows[0].rate);
          const usdToToCurrency = parseFloat(fromUSDRate.rows[0].rate);
          
          // Fetch active cryptocurrencies from database
          const cryptoCurrencies = await this.getActiveCurrenciesByType('cryptocurrency');
          const isFromCrypto = cryptoCurrencies.includes(fromCurrency);
          const isToCrypto = cryptoCurrencies.includes(toCurrency);
          
          // Calculate cross rate
          let crossRate;
          if (fromCurrency === 'USD') {
            crossRate = usdToToCurrency;
          } else if (toCurrency === 'USD') {
            crossRate = fromCurrencyToUSD;
          } else if (isFromCrypto && !isToCrypto) {
            crossRate = usdToToCurrency / fromCurrencyToUSD;
          } else if (!isFromCrypto && isToCrypto) {
            crossRate = fromCurrencyToUSD / usdToToCurrency;
          } else {
            crossRate = fromCurrencyToUSD / usdToToCurrency;
          }
          
          // Store it for future use
          await query(
            `INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             ON CONFLICT (from_currency, to_currency)
             DO UPDATE SET rate = $3, updated_at = CURRENT_TIMESTAMP`,
            [fromCurrency, toCurrency, crossRate]
          );
          
          return crossRate;
        }
      } catch (error) {
        console.error(`Failed to calculate ${fromCurrency} to ${toCurrency}:`, error);
      }
      
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    return parseFloat(result.rows[0].rate);
  }

  // Convert amount from one currency to another
  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
  }

  // Get all exchange rates
  async getAllExchangeRates(): Promise<ExchangeRateData[]> {
    const result = await query(
      'SELECT from_currency, to_currency, rate, updated_at FROM exchange_rates ORDER BY from_currency, to_currency'
    );

    return result.rows.map(row => ({
      from_currency: row.from_currency,
      to_currency: row.to_currency,
      rate: parseFloat(row.rate),
      updated_at: row.updated_at
    }));
  }

  // Scrape all exchange rates from Google Finance (deprecated - use Finnhub)
  private async scrapeAllRates(): Promise<ExchangeRateData[]> {
    console.log('⚠️ Google Finance scraping deprecated. Use Finnhub API instead.');
    return [];
  }

  // Scrape ECB rates (deprecated - use Finnhub)
  private async scrapeECBRates(): Promise<ExchangeRateData[]> {
    return [];
  }

  // Scrape CBRT rates (deprecated - use Finnhub)
  private async scrapeCBRTRates(): Promise<ExchangeRateData[]> {
    return [];
  }

  // Scrape Bank of England rates (deprecated - use Finnhub)
  private async scrapeBOERates(): Promise<ExchangeRateData[]> {
    return [];
  }

  // Scrape Federal Reserve rates (deprecated - use Finnhub)
  private async scrapeFedRates(): Promise<ExchangeRateData[]> {
    return [];
  }

  // Force update exchange rates (for manual refresh)
  async forceUpdate(): Promise<void> {
    try {
      await this.updateExchangeRates();
    } catch (error) {
      console.error(`❌ Force update failed:`, error);
      throw error;
    }
  }

  // Scrape gold prices (deprecated - not used)
  private async scrapeGoldRates(): Promise<ExchangeRateData[]> {
    return [];
  }

  // Scrape cryptocurrency rates (deprecated - now uses CoinMarketCap)
  private async scrapeCryptocurrencyRates(): Promise<ExchangeRateData[]> {
    return [];
  }

  // Scrape metal rates (deprecated - not used)
  private async scrapeMetalRates(): Promise<ExchangeRateData[]> {
    return [];
  }

}

// Export singleton instance
export const exchangeRateService = new ExchangeRateService();
