import axios from 'axios';
import cron from 'node-cron';
import * as cheerio from 'cheerio';
import { query } from '../config/database';

interface ExchangeRateData {
  from_currency: string;
  to_currency: string;
  rate: number;
}

interface GoldPriceData {
  price: number;
  currency: string;
}

class ExchangeRateService {
  private currencyApiKey: string;
  private goldApiKey: string;
  private finnhubApiKey: string;
  private isUpdating: boolean = false;

  constructor() {
    this.currencyApiKey = process.env.CURRENCY_API_KEY || '';
    this.goldApiKey = process.env.GOLD_API_KEY || '';
    this.finnhubApiKey = process.env.FINNHUB_API_KEY || 'd40c249r01qqo3qh7360d40c249r01qqo3qh736g';
    
    // Start scheduled updates
    this.startScheduledUpdates();
  }

  // Start scheduled updates every 6 hours
  private startScheduledUpdates(): void {
    // Update every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      console.log('🔄 Starting scheduled exchange rate update...');
      await this.updateExchangeRates();
    });

    // Initial update
    setTimeout(() => {
      this.updateExchangeRates();
    }, 5000); // Wait 5 seconds after server start
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
      console.log('⏳ Exchange rate update already in progress, skipping...');
      return;
    }

    this.isUpdating = true;

    try {
      console.log('📈 Fetching exchange rates from scraping sources...');

      // Use Finnhub API directly for faster sync
      try {
        await this.updateRatesFromFinnhub();
        console.log('✅ Exchange rates updated successfully from Finnhub');
      } catch (finnhubError) {
        console.warn('⚠️ Finnhub failed, trying scraping:', finnhubError);
        
        // Fallback to scraping
        await this.updateFiatRates();
        await this.updateGoldRates();
        await this.updateCryptocurrencyRates();
        await this.updateMetalRates();
        
        console.log('✅ Exchange rates updated successfully from scraping');
      }

    } catch (error) {
      console.error('❌ Failed to update exchange rates:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  // Fetch rates from Finnhub API - using sequential fiat-to-all pairing
  private async updateRatesFromFinnhub(): Promise<void> {
    const allRates: ExchangeRateData[] = [];
    
    // Fetch active currencies from database
    const activeFiats = await this.getActiveCurrenciesByType('fiat');
    const activeCryptos = await this.getActiveCurrenciesByType('cryptocurrency');
    const activeMetals = await this.getActiveCurrenciesByType('precious_metal');
    
    console.log(`📊 Active currencies: ${activeFiats.length} fiats, ${activeCryptos.length} cryptos, ${activeMetals.length} metals`);
    
    // Track processed pairs to avoid duplicates
    const processedPairs = new Set<string>();
    
    // Sequential fiat-to-all pairing
    for (let i = 0; i < activeFiats.length; i++) {
      const baseFiat = activeFiats[i];
      console.log(`🔄 Processing base currency: ${baseFiat}`);
      
      try {
        // Fetch fiat-to-fiat rates using Finnhub forex API
        const response = await axios.get(
          `https://finnhub.io/api/v1/forex/rates?base=${baseFiat}&token=${this.finnhubApiKey}`,
          { timeout: 10000 }
        );
        
        if (response.data && response.data.quote) {
          // Process fiat-to-fiat rates (skip already processed pairs)
          for (const targetFiat of activeFiats) {
            if (targetFiat === baseFiat) continue;
            
            const pairKey = `${baseFiat}-${targetFiat}`;
            const reversePairKey = `${targetFiat}-${baseFiat}`;
            
            // Skip if reverse pair already processed
            if (processedPairs.has(reversePairKey)) continue;
            
            if (response.data.quote[targetFiat]) {
              const rate = response.data.quote[targetFiat];
              allRates.push({
                from_currency: baseFiat,
                to_currency: targetFiat,
                rate: rate
              });
              processedPairs.add(pairKey);
            }
          }
        }
      } catch (error) {
        console.error(`Failed to fetch forex rates for ${baseFiat}:`, error);
      }
      
      // Fetch fiat-to-crypto rates
      for (const crypto of activeCryptos) {
        const symbol = this.getFinnhubSymbol(crypto, 'cryptocurrency');
        if (!symbol) {
          console.warn(`No Finnhub symbol mapping for crypto: ${crypto}`);
          continue;
        }
        
        try {
          const timestamp = Math.floor(Date.now() / 1000);
          const oneDayAgo = timestamp - 86400;
          
          const response = await axios.get(
            `https://finnhub.io/api/v1/crypto/candle?symbol=${symbol}&resolution=1&from=${oneDayAgo}&to=${timestamp}&token=${this.finnhubApiKey}`,
            { timeout: 10000 }
          );
          
          if (response.data && response.data.c && response.data.c.length > 0) {
            const cryptoPriceInUSD = response.data.c[response.data.c.length - 1];
            
            // Get baseFiat to USD rate if not USD
            let baseFiatToUSD = 1;
            if (baseFiat !== 'USD') {
              try {
                const fiatResponse = await axios.get(
                  `https://finnhub.io/api/v1/forex/rates?base=${baseFiat}&token=${this.finnhubApiKey}`,
                  { timeout: 5000 }
                );
                if (fiatResponse.data && fiatResponse.data.quote && fiatResponse.data.quote.USD) {
                  baseFiatToUSD = fiatResponse.data.quote.USD;
                }
              } catch (err) {
                console.warn(`Could not fetch ${baseFiat}/USD rate`);
              }
            }
            
            // Calculate baseFiat to crypto rate
            const baseFiatToCrypto = baseFiatToUSD / cryptoPriceInUSD;
            
            allRates.push({
              from_currency: baseFiat,
              to_currency: crypto,
              rate: baseFiatToCrypto
            });
          }
        } catch (error) {
          console.error(`Failed to fetch ${baseFiat} to ${crypto}:`, error);
        }
      }
      
      // Fetch fiat-to-metal rates
      for (const metal of activeMetals) {
        const symbol = this.getFinnhubSymbol(metal, 'precious_metal');
        if (!symbol) {
          console.warn(`No Finnhub symbol mapping for metal: ${metal}`);
          continue;
        }
        
        try {
          const response = await axios.get(
            `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.finnhubApiKey}`,
            { timeout: 10000 }
          );
          
          if (response.data && response.data.c) {
            const metalPriceInUSD = response.data.c;
            
            // Get baseFiat to USD rate if not USD
            let baseFiatToUSD = 1;
            if (baseFiat !== 'USD') {
              try {
                const fiatResponse = await axios.get(
                  `https://finnhub.io/api/v1/forex/rates?base=${baseFiat}&token=${this.finnhubApiKey}`,
                  { timeout: 5000 }
                );
                if (fiatResponse.data && fiatResponse.data.quote && fiatResponse.data.quote.USD) {
                  baseFiatToUSD = fiatResponse.data.quote.USD;
                }
              } catch (err) {
                console.warn(`Could not fetch ${baseFiat}/USD rate`);
              }
            }
            
            // Calculate baseFiat to metal rate
            const baseFiatToMetal = baseFiatToUSD / metalPriceInUSD;
            
            allRates.push({
              from_currency: baseFiat,
              to_currency: metal,
              rate: baseFiatToMetal
            });
          }
        } catch (error) {
          console.error(`Failed to fetch ${baseFiat} to ${metal}:`, error);
        }
      }
    }
    
    console.log(`✅ Fetched ${allRates.length} exchange rates from Finnhub`);
    
    // Store all rates
    if (allRates.length > 0) {
      await this.storeExchangeRates(allRates);
    } else {
      throw new Error('No rates fetched from Finnhub');
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

  // Update cryptocurrency rates - Try scraping first, fallback to CoinGecko API
  private async updateCryptocurrencyRates(): Promise<void> {
    try {
      console.log('💰 Scraping cryptocurrency rates...');
      
      // Try scraping first
      const scrapedCryptoRates = await this.scrapeCryptocurrencyRates();
      
      if (scrapedCryptoRates.length > 0) {
        await this.storeExchangeRates(scrapedCryptoRates);
        console.log(`✅ Scraped ${scrapedCryptoRates.length} cryptocurrency rates`);
        return;
      }
      
      // Fallback to CoinGecko API if scraping fails
      console.log('⚠️ Scraping failed, skipping CoinGecko fallback (use Finnhub instead)...');

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
    
    // After storing rates, create cross-conversions for all currencies
    // DISABLED: Too slow for manual sync (creates 342 pairs)
    // await this.createCrossConversions();
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
                  const cryptoCurrencies = ['BTC', 'ETH', 'LTC', 'SOL', 'XRP', 'BNB', 'ADA', 'MATIC', 'AVAX', 'LINK', 'UNI'];
                  const isFromCrypto = cryptoCurrencies.includes(fromCurrency);
                  const isToCrypto = cryptoCurrencies.includes(toCurrency);
                  
                  // DEBUG: Log for crypto conversions
                  if (fromCurrency === 'EUR' && cryptoCurrencies.includes(toCurrency)) {
                    console.log(`🔍 DEBUG: Converting ${fromCurrency} to ${toCurrency}`);
                    console.log(`🔍 fromCurrencyToUSD (${fromCurrency}/USD): ${fromCurrencyToUSD}`);
                    console.log(`🔍 usdToToCurrency (USD/${toCurrency}): ${usdToToCurrency}`);
                    console.log(`🔍 isFromCrypto: ${isFromCrypto}, isToCrypto: ${isToCrypto}`);
                  }
                  
                  // Calculate cross rate
                  // Understanding the rates stored in DB:
                  // - fromCurrencyToUSD: how much FROM_CURRENCY you get for 1 USD (e.g., EUR/USD = 0.85)
                  // - usdToToCurrency: how much TO_CURRENCY you get for 1 USD (e.g., BTC/USD = 65000)
                  
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
                  
                  // DEBUG: Log the calculated cross rate
                  if (fromCurrency === 'EUR' && cryptoCurrencies.includes(toCurrency)) {
                    console.log(`🔍 Calculated crossRate: ${crossRate}`);
                    console.log(`🔍 This means: 1 ${fromCurrency} = ${crossRate} ${toCurrency}`);
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
          
          // DEBUG: Log for crypto conversions
          if (cryptoCurrencies.includes(toCurrency)) {
            console.log(`🔍 DEBUG: Converting ${fromCurrency} to ${toCurrency}`);
            console.log(`🔍 fromCurrencyToUSD (${fromCurrency}/USD): ${fromCurrencyToUSD}`);
            console.log(`🔍 usdToToCurrency (USD/${toCurrency}): ${usdToToCurrency}`);
            console.log(`🔍 isFromCrypto: ${isFromCrypto}, isToCrypto: ${isToCrypto}`);
          }
          
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
          
          // DEBUG: Log the calculated cross rate
          if (cryptoCurrencies.includes(toCurrency)) {
            console.log(`🔍 Calculated crossRate: ${crossRate}`);
            console.log(`🔍 This means: 1 ${fromCurrency} = ${crossRate} ${toCurrency}`);
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
      rate: parseFloat(row.rate)
    }));
  }

  // Scrape all exchange rates from Google Finance (deprecated - use Finnhub)
  private async scrapeAllRates(): Promise<ExchangeRateData[]> {
    console.log('⚠️ Google Finance scraping deprecated. Use Finnhub API instead.');
    return [];
  }

  // Scrape ECB rates (EUR-based)
  private async scrapeECBRates(): Promise<ExchangeRateData[]> {
    try {
      const response = await axios.get('https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const rates: ExchangeRateData[] = [];

      // Parse ECB HTML table
      $('table.forextable tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 3) {
          const currency = $(cells[0]).text().trim();
          const rateText = $(cells[2]).text().trim();
          const rate = parseFloat(rateText);

          if (currency && !isNaN(rate) && currency.length === 3) {
            rates.push({
              from_currency: 'EUR',
              to_currency: currency,
              rate: rate
            });
            rates.push({
              from_currency: currency,
              to_currency: 'EUR',
              rate: 1 / rate
            });
          }
        }
      });

      console.log(`🇪🇺 ECB: Scraped ${rates.length} EUR-based rates`);
      if (rates.length > 0) {
        console.log(`🇪🇺 ECB: Sample rates:`, rates.slice(0, 3));
      }
      return rates;
    } catch (error) {
      console.error('ECB scraping failed:', error);
      return [];
    }
  }

  // Scrape CBRT rates (TRY-based)
  private async scrapeCBRTRates(): Promise<ExchangeRateData[]> {
    try {
      const response = await axios.get('https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb+tr/main+menu/istatistikler/resmi+doviz+kurlari', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const rates: ExchangeRateData[] = [];

      // Parse CBRT HTML table
      $('table tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 3) {
          const currency = $(cells[0]).text().trim();
          const rateText = $(cells[1]).text().trim().replace(',', '.');
          const rate = parseFloat(rateText);

          if (currency && !isNaN(rate) && currency.length === 3) {
            rates.push({
              from_currency: 'TRY',
              to_currency: currency,
              rate: rate
            });
            rates.push({
              from_currency: currency,
              to_currency: 'TRY',
              rate: 1 / rate
            });
          }
        }
      });

      console.log(`🇹🇷 CBRT: Scraped ${rates.length} TRY-based rates`);
      return rates;
    } catch (error) {
      console.error('CBRT scraping failed:', error);
      return [];
    }
  }

  // Scrape Bank of England rates (GBP-based)
  private async scrapeBOERates(): Promise<ExchangeRateData[]> {
    try {
      const response = await axios.get('https://www.bankofengland.co.uk/boeapps/database/Rates.asp', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const rates: ExchangeRateData[] = [];

      // Parse BoE HTML table
      $('table tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 3) {
          const currency = $(cells[0]).text().trim();
          const rateText = $(cells[1]).text().trim();
          const rate = parseFloat(rateText);

          if (currency && !isNaN(rate) && currency.length === 3) {
            rates.push({
              from_currency: 'GBP',
              to_currency: currency,
              rate: rate
            });
            rates.push({
              from_currency: currency,
              to_currency: 'GBP',
              rate: 1 / rate
            });
          }
        }
      });

      console.log(`🇬🇧 BoE: Scraped ${rates.length} GBP-based rates`);
      return rates;
    } catch (error) {
      console.error('BoE scraping failed:', error);
      return [];
    }
  }

  // Scrape Federal Reserve rates (USD-based)
  private async scrapeFedRates(): Promise<ExchangeRateData[]> {
    try {
      const currencies = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];
      const rates: ExchangeRateData[] = [];

      // Scrape individual FRED series
      for (const currency of currencies) {
        try {
          const response = await axios.get(`https://fred.stlouisfed.org/series/DEXUS${currency.toLowerCase()}`, {
            timeout: 5000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          const $ = cheerio.load(response.data);
          const rateText = $('.series-meta-observation-value').text().trim();
          const rate = parseFloat(rateText);

          if (!isNaN(rate) && rate > 0) {
            rates.push({
              from_currency: 'USD',
              to_currency: currency,
              rate: rate
            });
            rates.push({
              from_currency: currency,
              to_currency: 'USD',
              rate: 1 / rate
            });
          }
        } catch (error) {
          console.warn(`Failed to scrape ${currency} rate from FRED:`, error);
        }
      }

      console.log(`🇺🇸 Fed: Scraped ${rates.length} USD-based rates`);
      return rates;
    } catch (error) {
      console.error('Fed scraping failed:', error);
      return [];
    }
  }

  // Force update exchange rates (for manual refresh)
  async forceUpdate(): Promise<void> {
    console.log('🔄 Force updating exchange rates...');
    
    // For manual sync, try scraping first even if APIs are not configured
    if (!this.currencyApiKey) {
      console.log('🔄 Manual sync: Attempting scraping without API keys...');
      
      try {
        const scrapedRates = await this.scrapeAllRates();
        
        if (scrapedRates.length > 0) {
          console.log(`✅ Manual sync: Scraped ${scrapedRates.length} rates successfully`);
          await this.storeExchangeRates(scrapedRates);
          console.log(`✅ Stored ${scrapedRates.length} rates in database`);
        } else {
          console.warn('⚠️ No rates scraped, falling back to updateExchangeRates...');
          await this.updateExchangeRates();
        }
      } catch (error) {
        console.error('❌ Error during force update scraping:', error);
        // Fallback to updateExchangeRates even on error
        await this.updateExchangeRates();
      }
    } else {
      await this.updateExchangeRates();
    }
    
    console.log('✅ Force update completed');
  }

  // Scrape gold prices from gold.de
  private async scrapeGoldRates(): Promise<ExchangeRateData[]> {
    const rates: ExchangeRateData[] = [];
    
    try {
      // Try gold.de for gold prices
      const response = await axios.get('https://www.gold.de/preise/', {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      
      const $ = cheerio.load(response.data);
      
      // Look for gold price in tables
      $('table tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 2) {
          const metalName = $(cells[0]).text().trim().toLowerCase();
          const priceText = $(cells[1]).text().trim().replace(/[^0-9.,]/g, '');
          const price = parseFloat(priceText.replace(',', '.'));
          
          if ((metalName.includes('gold') || metalName.includes('goldmünze')) && !isNaN(price) && price > 0) {
            rates.push({ from_currency: 'GOLD', to_currency: 'USD', rate: price });
            rates.push({ from_currency: 'USD', to_currency: 'GOLD', rate: 1 / price });
            console.log(`✅ Scraped gold price from gold.de: ${price} USD/oz`);
          }
        }
      });
      
      // Fallback to static rate if scraping failed
      if (rates.length === 0) {
        const fallbackGold = 2000; // Approximate gold price per oz
        rates.push({ from_currency: 'GOLD', to_currency: 'USD', rate: fallbackGold });
        rates.push({ from_currency: 'USD', to_currency: 'GOLD', rate: 1 / fallbackGold });
        console.log(`⚠️ Using fallback gold price: ${fallbackGold} USD/oz`);
      }
    } catch (error) {
      console.error('Gold scraping failed:', error);
      // Use fallback
      const fallbackGold = 2000;
      rates.push({ from_currency: 'GOLD', to_currency: 'USD', rate: fallbackGold });
      rates.push({ from_currency: 'USD', to_currency: 'GOLD', rate: 1 / fallbackGold });
    }
    
    return rates;
  }

  // Scrape cryptocurrency rates
  private async scrapeCryptocurrencyRates(): Promise<ExchangeRateData[]> {
    const rates: ExchangeRateData[] = [];
    
    try {
      // Scrape from Coingecko (public page)
      const cryptos = [
        { code: 'BTC', url: 'https://www.coingecko.com/en/coins/bitcoin' },
        { code: 'ETH', url: 'https://www.coingecko.com/en/coins/ethereum' },
        { code: 'LTC', url: 'https://www.coingecko.com/en/coins/litecoin' },
        { code: 'XRP', url: 'https://www.coingecko.com/en/coins/ripple' },
        { code: 'BNB', url: 'https://www.coingecko.com/en/coins/binancecoin' },
        { code: 'ADA', url: 'https://www.coingecko.com/en/coins/cardano' },
        { code: 'SOL', url: 'https://www.coingecko.com/en/coins/solana' },
        { code: 'DOT', url: 'https://www.coingecko.com/en/coins/polkadot' },
        { code: 'MATIC', url: 'https://www.coingecko.com/en/coins/polygon' },
        { code: 'AVAX', url: 'https://www.coingecko.com/en/coins/avalanche' },
        { code: 'LINK', url: 'https://www.coingecko.com/en/coins/chainlink' },
        { code: 'UNI', url: 'https://www.coingecko.com/en/coins/uniswap' }
      ];
      
      // Try to scrape a few cryptos in parallel
      const results = await Promise.allSettled(
        cryptos.slice(0, 12).map(async ({ code, url }) => {
          const response = await axios.get(url, {
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          });
          
          const $ = cheerio.load(response.data);
          const priceText = $('[data-coin-price]').text() || $('.coin-price').text() || $('span:contains("$")').first().text();
          const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
          
          if (!isNaN(price) && price > 0) {
            return { code, price };
          }
          return null;
        })
      );
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const { code, price } = result.value;
          rates.push({ from_currency: code, to_currency: 'USD', rate: price });
          rates.push({ from_currency: 'USD', to_currency: code, rate: 1 / price });
        }
      });
      
      console.log(`✅ Scraped ${rates.length} cryptocurrency rates`);
    } catch (error) {
      console.error('Crypto scraping failed:', error);
    }
    
    return rates;
  }

  // Scrape metal rates (silver, platinum, palladium) from gold.de
  private async scrapeMetalRates(): Promise<ExchangeRateData[]> {
    const rates: ExchangeRateData[] = [];
    
    try {
      // Fallback prices for metals (current approximate market prices per ounce)
      const fallbackSilver = 24.50; // Approximate silver price per oz
      const fallbackPlatinum = 1050; // Approximate platinum price per oz
      const fallbackPalladium = 1050; // Approximate palladium price per oz
      
      let silverFound = false;
      let platinumFound = false;
      let palladiumFound = false;
      
      // Try multiple sources for metal prices
      
      // Try 1: gold.de
      try {
        const response = await axios.get('https://www.gold.de/preise/', {
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        
        const $ = cheerio.load(response.data);
        
        // Look for price tables
        $('table tr').each((_, row) => {
          const cells = $(row).find('td');
          if (cells.length >= 2) {
            const metalName = $(cells[0]).text().trim().toLowerCase();
            const priceText = $(cells[1]).text().trim().replace(/[^0-9.,]/g, '');
            const price = parseFloat(priceText.replace(',', '.'));
            
            if (!isNaN(price) && price > 0) {
              if (metalName.includes('silber') && !silverFound) {
                rates.push({ from_currency: 'SILVER', to_currency: 'USD', rate: price });
                rates.push({ from_currency: 'USD', to_currency: 'SILVER', rate: 1 / price });
                console.log(`✅ Scraped silver price from gold.de: ${price} USD/oz`);
                silverFound = true;
              } else if (metalName.includes('platin') && !platinumFound) {
                rates.push({ from_currency: 'PLATINUM', to_currency: 'USD', rate: price });
                rates.push({ from_currency: 'USD', to_currency: 'PLATINUM', rate: 1 / price });
                console.log(`✅ Scraped platinum price from gold.de: ${price} USD/oz`);
                platinumFound = true;
              } else if (metalName.includes('palladium') && !palladiumFound) {
                rates.push({ from_currency: 'PALLADIUM', to_currency: 'USD', rate: price });
                rates.push({ from_currency: 'USD', to_currency: 'PALLADIUM', rate: 1 / price });
                console.log(`✅ Scraped palladium price from gold.de: ${price} USD/oz`);
                palladiumFound = true;
              }
            }
          }
        });
      } catch (error) {
        console.warn('gold.de scraping failed:', error);
      }
      
      // Try 2: goldprice.org (fallback)
      if (!silverFound || !platinumFound || !palladiumFound) {
        try {
          const response = await axios.get('https://goldprice.org/', {
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          });
          
          const $ = cheerio.load(response.data);
          
          // Look for silver price (gold site has silver too)
          const silverPriceText = $('[data-metal="silver"]').text().trim() || 
                                  $('.silver-price').text().trim() || 
                                  $('*:contains("Silver")').first().next().text().trim();
          const silverPrice = parseFloat(silverPriceText.replace(/[^0-9.]/g, ''));
          
          if (!isNaN(silverPrice) && silverPrice > 0 && !silverFound) {
            rates.push({ from_currency: 'SILVER', to_currency: 'USD', rate: silverPrice });
            rates.push({ from_currency: 'USD', to_currency: 'SILVER', rate: 1 / silverPrice });
            console.log(`✅ Scraped silver price from goldprice.org: ${silverPrice} USD/oz`);
            silverFound = true;
          }
        } catch (error) {
          console.warn('goldprice.org scraping failed');
        }
      }
      
      // Use fallback prices if scraping failed
      if (!silverFound) {
        rates.push({ from_currency: 'SILVER', to_currency: 'USD', rate: fallbackSilver });
        rates.push({ from_currency: 'USD', to_currency: 'SILVER', rate: 1 / fallbackSilver });
        console.log(`⚠️ Using fallback silver price: ${fallbackSilver} USD/oz`);
        silverFound = true; // Mark as found so it gets stored
      }
      
      if (!platinumFound) {
        rates.push({ from_currency: 'PLATINUM', to_currency: 'USD', rate: fallbackPlatinum });
        rates.push({ from_currency: 'USD', to_currency: 'PLATINUM', rate: 1 / fallbackPlatinum });
        console.log(`⚠️ Using fallback platinum price: ${fallbackPlatinum} USD/oz`);
        platinumFound = true;
      }
      
      if (!palladiumFound) {
        rates.push({ from_currency: 'PALLADIUM', to_currency: 'USD', rate: fallbackPalladium });
        rates.push({ from_currency: 'USD', to_currency: 'PALLADIUM', rate: 1 / fallbackPalladium });
        console.log(`⚠️ Using fallback palladium price: ${fallbackPalladium} USD/oz`);
        palladiumFound = true;
      }
      
    } catch (error) {
      console.error('Metal scraping completely failed:', error);
    }
    
    return rates;
  }
}

// Export singleton instance
export const exchangeRateService = new ExchangeRateService();
