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
  private isUpdating: boolean = false;

  constructor() {
    this.currencyApiKey = process.env.CURRENCY_API_KEY || '';
    this.goldApiKey = process.env.GOLD_API_KEY || '';
    
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

  // Update exchange rates from external API
  async updateExchangeRates(): Promise<void> {
    if (this.isUpdating) {
      console.log('⏳ Exchange rate update already in progress, skipping...');
      return;
    }

    this.isUpdating = true;

    try {
      console.log('📈 Fetching exchange rates...');

      // Update fiat currency rates
      await this.updateFiatRates();

      // Update gold rates
      await this.updateGoldRates();

      console.log('✅ Exchange rates updated successfully');
    } catch (error) {
      console.error('❌ Failed to update exchange rates:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  // Update fiat currency exchange rates
  private async updateFiatRates(): Promise<void> {
    if (!this.currencyApiKey) {
      console.warn('⚠️ Currency API key not configured, using fallback rates');
      await this.setFallbackRates();
      return;
    }

    try {
      // Using ExchangeRate-API (free tier)
      const response = await axios.get(
        `https://v6.exchangerate-api.com/v6/${this.currencyApiKey}/latest/USD`,
        { timeout: 10000 }
      );

      const rates = response.data.conversion_rates;
      const currencies = ['TRY', 'GBP', 'USD', 'EUR', 'CNY', 'JPY', 'CAD', 'AUD', 'CHF'];

      const exchangeRates: ExchangeRateData[] = [];

      // Create all currency pairs
      for (const fromCurrency of currencies) {
        for (const toCurrency of currencies) {
          if (fromCurrency !== toCurrency) {
            let rate: number;

            if (fromCurrency === 'USD') {
              rate = rates[toCurrency];
            } else if (toCurrency === 'USD') {
              rate = 1 / rates[fromCurrency];
            } else {
              // Convert through USD
              rate = rates[toCurrency] / rates[fromCurrency];
            }

            exchangeRates.push({
              from_currency: fromCurrency,
              to_currency: toCurrency,
              rate: rate
            });
          }
        }
      }

      // Store in database
      await this.storeExchangeRates(exchangeRates);

    } catch (error) {
      console.error('Failed to fetch fiat rates:', error);
      await this.setFallbackRates(false);
    }
  }

  // Update gold rates
  private async updateGoldRates(): Promise<void> {
    if (!this.goldApiKey) {
      console.warn('⚠️ Gold API key not configured, using fallback rates');
      await this.setFallbackGoldRates();
      return;
    }

    try {
      // Using Metals-API
      const response = await axios.get(
        `https://metals-api.com/api/latest?access_key=${this.goldApiKey}&base=USD&symbols=TRY,GBP,EUR,CNY,JPY,CAD,AUD,CHF`,
        { timeout: 10000 }
      );

      const goldPriceUSD = response.data.rates.GOLD || 2000; // Fallback gold price
      const currencies = ['TRY', 'GBP', 'USD', 'EUR', 'CNY', 'JPY', 'CAD', 'AUD', 'CHF'];

      const goldRates: ExchangeRateData[] = [];

      for (const currency of currencies) {
        if (currency === 'USD') {
          goldRates.push({
            from_currency: 'GOLD',
            to_currency: 'USD',
            rate: goldPriceUSD
          });
        } else {
          const currencyRate = response.data.rates[currency] || 1;
          const goldToCurrencyRate = goldPriceUSD * currencyRate;
          
          goldRates.push({
            from_currency: 'GOLD',
            to_currency: currency,
            rate: goldToCurrencyRate
          });

          goldRates.push({
            from_currency: currency,
            to_currency: 'GOLD',
            rate: 1 / goldToCurrencyRate
          });
        }
      }

      // Store gold rates
      await this.storeExchangeRates(goldRates);

    } catch (error) {
      console.error('Failed to fetch gold rates:', error);
      await this.setFallbackGoldRates();
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
    
    // Last resort: use static fallback rates
    console.log('⚠️ Scraping failed, using static fallback rates');
    const staticRates: ExchangeRateData[] = [
      { from_currency: 'USD', to_currency: 'EUR', rate: 0.85 },
      { from_currency: 'EUR', to_currency: 'USD', rate: 1.18 },
      { from_currency: 'USD', to_currency: 'GBP', rate: 0.73 },
      { from_currency: 'GBP', to_currency: 'USD', rate: 1.37 },
      { from_currency: 'USD', to_currency: 'TRY', rate: 30.0 },
      { from_currency: 'TRY', to_currency: 'USD', rate: 0.033 },
      { from_currency: 'EUR', to_currency: 'GBP', rate: 0.86 },
      { from_currency: 'GBP', to_currency: 'EUR', rate: 1.16 },
      { from_currency: 'EUR', to_currency: 'TRY', rate: 35.3 },
      { from_currency: 'TRY', to_currency: 'EUR', rate: 0.028 },
      { from_currency: 'GBP', to_currency: 'TRY', rate: 41.1 },
      { from_currency: 'TRY', to_currency: 'GBP', rate: 0.024 },
      // Additional currencies
      { from_currency: 'USD', to_currency: 'CNY', rate: 7.2 },
      { from_currency: 'CNY', to_currency: 'USD', rate: 0.139 },
      { from_currency: 'USD', to_currency: 'JPY', rate: 150.0 },
      { from_currency: 'JPY', to_currency: 'USD', rate: 0.0067 },
      { from_currency: 'USD', to_currency: 'CAD', rate: 1.35 },
      { from_currency: 'CAD', to_currency: 'USD', rate: 0.74 },
      { from_currency: 'USD', to_currency: 'AUD', rate: 1.5 },
      { from_currency: 'AUD', to_currency: 'USD', rate: 0.67 },
      { from_currency: 'USD', to_currency: 'CHF', rate: 0.88 },
      { from_currency: 'CHF', to_currency: 'USD', rate: 1.14 }
    ];

    await this.storeExchangeRates(staticRates);
  }

  // Set fallback gold rates
  private async setFallbackGoldRates(): Promise<void> {
    const fallbackGoldRates: ExchangeRateData[] = [
      { from_currency: 'GOLD', to_currency: 'USD', rate: 2000 },
      { from_currency: 'USD', to_currency: 'GOLD', rate: 0.0005 },
      { from_currency: 'GOLD', to_currency: 'EUR', rate: 1700 },
      { from_currency: 'EUR', to_currency: 'GOLD', rate: 0.000588 },
      { from_currency: 'GOLD', to_currency: 'GBP', rate: 1460 },
      { from_currency: 'GBP', to_currency: 'GOLD', rate: 0.000685 },
      { from_currency: 'GOLD', to_currency: 'TRY', rate: 60000 },
      { from_currency: 'TRY', to_currency: 'GOLD', rate: 0.0000167 },
      { from_currency: 'GOLD', to_currency: 'CNY', rate: 14400 },
      { from_currency: 'CNY', to_currency: 'GOLD', rate: 0.0000694 },
      { from_currency: 'GOLD', to_currency: 'JPY', rate: 300000 },
      { from_currency: 'JPY', to_currency: 'GOLD', rate: 0.0000033 },
      { from_currency: 'GOLD', to_currency: 'CAD', rate: 2700 },
      { from_currency: 'CAD', to_currency: 'GOLD', rate: 0.000370 },
      { from_currency: 'GOLD', to_currency: 'AUD', rate: 3000 },
      { from_currency: 'AUD', to_currency: 'GOLD', rate: 0.000333 },
      { from_currency: 'GOLD', to_currency: 'CHF', rate: 1760 },
      { from_currency: 'CHF', to_currency: 'GOLD', rate: 0.000568 }
    ];

    await this.storeExchangeRates(fallbackGoldRates);
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

  // Scrape all exchange rates from multiple sources
  private async scrapeAllRates(): Promise<ExchangeRateData[]> {
    const allRates: ExchangeRateData[] = [];
    
    try {
      // Scrape from multiple sources in parallel
      const [ecbRates, cbrtRates, boeRates, fedRates] = await Promise.allSettled([
        this.scrapeECBRates(),
        this.scrapeCBRTRates(),
        this.scrapeBOERates(),
        this.scrapeFedRates()
      ]);

      // Collect successful results
      if (ecbRates.status === 'fulfilled') allRates.push(...ecbRates.value);
      if (cbrtRates.status === 'fulfilled') allRates.push(...cbrtRates.value);
      if (boeRates.status === 'fulfilled') allRates.push(...boeRates.value);
      if (fedRates.status === 'fulfilled') allRates.push(...fedRates.value);

      console.log(`📊 Scraped ${allRates.length} rates from ${[ecbRates, cbrtRates, boeRates, fedRates].filter(r => r.status === 'fulfilled').length} sources`);
      
    } catch (error) {
      console.error('Error in scrapeAllRates:', error);
    }

    return allRates;
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
      const scrapedRates = await this.scrapeAllRates();
      
      if (scrapedRates.length > 0) {
        console.log(`✅ Manual sync: Scraped ${scrapedRates.length} rates successfully`);
        await this.storeExchangeRates(scrapedRates);
        return;
      }
    }
    
    await this.updateExchangeRates();
  }
}

// Export singleton instance
export const exchangeRateService = new ExchangeRateService();
