import axios from 'axios';
import cron from 'node-cron';
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
      const currencies = ['TRY', 'GBP', 'USD', 'EUR'];

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
      await this.setFallbackRates();
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
        `https://metals-api.com/api/latest?access_key=${this.goldApiKey}&base=USD&symbols=TRY,GBP,EUR`,
        { timeout: 10000 }
      );

      const goldPriceUSD = response.data.rates.GOLD || 2000; // Fallback gold price
      const currencies = ['TRY', 'GBP', 'USD', 'EUR'];

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
  private async setFallbackRates(): Promise<void> {
    const fallbackRates: ExchangeRateData[] = [
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
      { from_currency: 'TRY', to_currency: 'GBP', rate: 0.024 }
    ];

    await this.storeExchangeRates(fallbackRates);
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
      { from_currency: 'TRY', to_currency: 'GOLD', rate: 0.0000167 }
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

  // Force update exchange rates (for manual refresh)
  async forceUpdate(): Promise<void> {
    console.log('🔄 Force updating exchange rates...');
    await this.updateExchangeRates();
  }
}

// Export singleton instance
export const exchangeRateService = new ExchangeRateService();
