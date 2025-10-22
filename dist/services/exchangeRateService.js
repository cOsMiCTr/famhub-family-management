"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exchangeRateService = void 0;
const axios_1 = __importDefault(require("axios"));
const node_cron_1 = __importDefault(require("node-cron"));
const database_1 = require("../config/database");
class ExchangeRateService {
    constructor() {
        this.isUpdating = false;
        this.currencyApiKey = process.env.CURRENCY_API_KEY || '';
        this.goldApiKey = process.env.GOLD_API_KEY || '';
        this.startScheduledUpdates();
    }
    startScheduledUpdates() {
        node_cron_1.default.schedule('0 */6 * * *', async () => {
            console.log('🔄 Starting scheduled exchange rate update...');
            await this.updateExchangeRates();
        });
        setTimeout(() => {
            this.updateExchangeRates();
        }, 5000);
    }
    async updateExchangeRates() {
        if (this.isUpdating) {
            console.log('⏳ Exchange rate update already in progress, skipping...');
            return;
        }
        this.isUpdating = true;
        try {
            console.log('📈 Fetching exchange rates...');
            await this.updateFiatRates();
            await this.updateGoldRates();
            console.log('✅ Exchange rates updated successfully');
        }
        catch (error) {
            console.error('❌ Failed to update exchange rates:', error);
        }
        finally {
            this.isUpdating = false;
        }
    }
    async updateFiatRates() {
        if (!this.currencyApiKey) {
            console.warn('⚠️ Currency API key not configured, using fallback rates');
            await this.setFallbackRates();
            return;
        }
        try {
            const response = await axios_1.default.get(`https://v6.exchangerate-api.com/v6/${this.currencyApiKey}/latest/USD`, { timeout: 10000 });
            const rates = response.data.conversion_rates;
            const currencies = ['TRY', 'GBP', 'USD', 'EUR'];
            const exchangeRates = [];
            for (const fromCurrency of currencies) {
                for (const toCurrency of currencies) {
                    if (fromCurrency !== toCurrency) {
                        let rate;
                        if (fromCurrency === 'USD') {
                            rate = rates[toCurrency];
                        }
                        else if (toCurrency === 'USD') {
                            rate = 1 / rates[fromCurrency];
                        }
                        else {
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
            await this.storeExchangeRates(exchangeRates);
        }
        catch (error) {
            console.error('Failed to fetch fiat rates:', error);
            await this.setFallbackRates();
        }
    }
    async updateGoldRates() {
        if (!this.goldApiKey) {
            console.warn('⚠️ Gold API key not configured, using fallback rates');
            await this.setFallbackGoldRates();
            return;
        }
        try {
            const response = await axios_1.default.get(`https://metals-api.com/api/latest?access_key=${this.goldApiKey}&base=USD&symbols=TRY,GBP,EUR`, { timeout: 10000 });
            const goldPriceUSD = response.data.rates.GOLD || 2000;
            const currencies = ['TRY', 'GBP', 'USD', 'EUR'];
            const goldRates = [];
            for (const currency of currencies) {
                if (currency === 'USD') {
                    goldRates.push({
                        from_currency: 'GOLD',
                        to_currency: 'USD',
                        rate: goldPriceUSD
                    });
                }
                else {
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
            await this.storeExchangeRates(goldRates);
        }
        catch (error) {
            console.error('Failed to fetch gold rates:', error);
            await this.setFallbackGoldRates();
        }
    }
    async setFallbackRates() {
        const fallbackRates = [
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
    async setFallbackGoldRates() {
        const fallbackGoldRates = [
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
    async storeExchangeRates(rates) {
        for (const rate of rates) {
            await (0, database_1.query)(`INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (from_currency, to_currency)
         DO UPDATE SET rate = $3, updated_at = CURRENT_TIMESTAMP`, [rate.from_currency, rate.to_currency, rate.rate]);
        }
    }
    async getExchangeRate(fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) {
            return 1;
        }
        const result = await (0, database_1.query)('SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2', [fromCurrency, toCurrency]);
        if (result.rows.length === 0) {
            throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
        }
        return parseFloat(result.rows[0].rate);
    }
    async convertCurrency(amount, fromCurrency, toCurrency) {
        const rate = await this.getExchangeRate(fromCurrency, toCurrency);
        return amount * rate;
    }
    async getAllExchangeRates() {
        const result = await (0, database_1.query)('SELECT from_currency, to_currency, rate, updated_at FROM exchange_rates ORDER BY from_currency, to_currency');
        return result.rows.map(row => ({
            from_currency: row.from_currency,
            to_currency: row.to_currency,
            rate: parseFloat(row.rate)
        }));
    }
    async forceUpdate() {
        console.log('🔄 Force updating exchange rates...');
        await this.updateExchangeRates();
    }
}
exports.exchangeRateService = new ExchangeRateService();
//# sourceMappingURL=exchangeRateService.js.map