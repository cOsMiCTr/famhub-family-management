"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exchangeRateService = void 0;
const axios_1 = __importDefault(require("axios"));
const node_cron_1 = __importDefault(require("node-cron"));
const cheerio = __importStar(require("cheerio"));
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
            await this.updateCryptocurrencyRates();
            await this.updateMetalRates();
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
            const currencies = ['TRY', 'GBP', 'USD', 'EUR', 'CNY', 'JPY', 'CAD', 'AUD', 'CHF'];
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
            await this.setFallbackRates(false);
        }
    }
    async updateGoldRates() {
        if (!this.goldApiKey) {
            console.warn('⚠️ Gold API key not configured, using fallback rates');
            await this.setFallbackGoldRates();
            return;
        }
        try {
            const response = await axios_1.default.get(`https://metals-api.com/api/latest?access_key=${this.goldApiKey}&base=USD&symbols=TRY,GBP,EUR,CNY,JPY,CAD,AUD,CHF`, { timeout: 10000 });
            const goldPriceUSD = response.data.rates.GOLD || 2000;
            const currencies = ['TRY', 'GBP', 'USD', 'EUR', 'CNY', 'JPY', 'CAD', 'AUD', 'CHF'];
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
    async updateCryptocurrencyRates() {
        try {
            console.log('💰 Fetching cryptocurrency rates...');
            const response = await axios_1.default.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,cardano,solana,polkadot,polygon,avalanche-2,chainlink,uniswap&vs_currencies=usd', { timeout: 10000 });
            const cryptoData = response.data;
            const cryptoPairs = {
                'BTC': 'bitcoin',
                'ETH': 'ethereum',
                'BNB': 'binancecoin',
                'ADA': 'cardano',
                'SOL': 'solana',
                'DOT': 'polkadot',
                'MATIC': 'polygon',
                'AVAX': 'avalanche-2',
                'LINK': 'chainlink',
                'UNI': 'uniswap'
            };
            const cryptoRates = [];
            const fiatCurrencies = ['USD', 'EUR', 'GBP', 'TRY', 'CNY', 'JPY', 'CAD', 'AUD', 'CHF'];
            for (const [cryptoCode, coinGeckoId] of Object.entries(cryptoPairs)) {
                if (cryptoData[coinGeckoId]) {
                    const priceInUSD = cryptoData[coinGeckoId].usd;
                    cryptoRates.push({
                        from_currency: cryptoCode,
                        to_currency: 'USD',
                        rate: 1 / priceInUSD
                    });
                    cryptoRates.push({
                        from_currency: 'USD',
                        to_currency: cryptoCode,
                        rate: priceInUSD
                    });
                }
            }
            await this.storeExchangeRates(cryptoRates);
            console.log(`✅ Fetched ${cryptoRates.length} cryptocurrency rates`);
        }
        catch (error) {
            console.error('Failed to fetch cryptocurrency rates:', error);
        }
    }
    async updateMetalRates() {
        try {
            console.log('🥇 Fetching metal rates...');
            if (!this.goldApiKey) {
                console.log('⚠️ Metals API key not configured, skipping metal rates');
                return;
            }
            const response = await axios_1.default.get(`https://metals-api.com/api/latest?access_key=${this.goldApiKey}&base=USD&symbols=XAG,XPT,XPD`, { timeout: 10000 });
            const metalPrices = response.data.rates;
            const metals = {
                'SILVER': metalPrices.XAG,
                'PLATINUM': metalPrices.XPT,
                'PALLADIUM': metalPrices.XPD
            };
            const metalRates = [];
            for (const [metalCode, pricePerOz] of Object.entries(metals)) {
                metalRates.push({
                    from_currency: metalCode,
                    to_currency: 'USD',
                    rate: pricePerOz
                });
                metalRates.push({
                    from_currency: 'USD',
                    to_currency: metalCode,
                    rate: 1 / pricePerOz
                });
            }
            await this.storeExchangeRates(metalRates);
            console.log(`✅ Fetched ${metalRates.length} metal rates`);
        }
        catch (error) {
            console.error('Failed to fetch metal rates:', error);
        }
    }
    async setFallbackRates(forceScraping = false) {
        console.log('🔄 Attempting to use last known rates as fallback...');
        const threshold = forceScraping ? '1 hour' : '24 hours';
        const recentRates = await (0, database_1.query)(`SELECT from_currency, to_currency, rate, updated_at 
       FROM exchange_rates 
       WHERE updated_at > NOW() - INTERVAL '${threshold}'
       ORDER BY updated_at DESC`);
        if (recentRates.rows.length > 0 && !forceScraping) {
            console.log(`✅ Using ${recentRates.rows.length} recent rates as fallback (${threshold} threshold)`);
            return;
        }
        console.log(`⚠️ No recent rates found (${threshold} threshold) or force scraping enabled, attempting to scrape...`);
        const scrapedRates = await this.scrapeAllRates();
        if (scrapedRates.length > 0) {
            console.log(`✅ Scraped ${scrapedRates.length} rates successfully`);
            await this.storeExchangeRates(scrapedRates);
            return;
        }
        console.log('⚠️ Scraping failed, using static fallback rates');
        const staticRates = [
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
    async setFallbackGoldRates() {
        const fallbackGoldRates = [
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
    async scrapeAllRates() {
        const allRates = [];
        try {
            const [ecbRates, cbrtRates, boeRates, fedRates] = await Promise.allSettled([
                this.scrapeECBRates(),
                this.scrapeCBRTRates(),
                this.scrapeBOERates(),
                this.scrapeFedRates()
            ]);
            if (ecbRates.status === 'fulfilled')
                allRates.push(...ecbRates.value);
            if (cbrtRates.status === 'fulfilled')
                allRates.push(...cbrtRates.value);
            if (boeRates.status === 'fulfilled')
                allRates.push(...boeRates.value);
            if (fedRates.status === 'fulfilled')
                allRates.push(...fedRates.value);
            console.log(`📊 Scraped ${allRates.length} rates from ${[ecbRates, cbrtRates, boeRates, fedRates].filter(r => r.status === 'fulfilled').length} sources`);
        }
        catch (error) {
            console.error('Error in scrapeAllRates:', error);
        }
        return allRates;
    }
    async scrapeECBRates() {
        try {
            const response = await axios_1.default.get('https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const $ = cheerio.load(response.data);
            const rates = [];
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
        }
        catch (error) {
            console.error('ECB scraping failed:', error);
            return [];
        }
    }
    async scrapeCBRTRates() {
        try {
            const response = await axios_1.default.get('https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb+tr/main+menu/istatistikler/resmi+doviz+kurlari', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const $ = cheerio.load(response.data);
            const rates = [];
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
        }
        catch (error) {
            console.error('CBRT scraping failed:', error);
            return [];
        }
    }
    async scrapeBOERates() {
        try {
            const response = await axios_1.default.get('https://www.bankofengland.co.uk/boeapps/database/Rates.asp', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const $ = cheerio.load(response.data);
            const rates = [];
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
        }
        catch (error) {
            console.error('BoE scraping failed:', error);
            return [];
        }
    }
    async scrapeFedRates() {
        try {
            const currencies = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];
            const rates = [];
            for (const currency of currencies) {
                try {
                    const response = await axios_1.default.get(`https://fred.stlouisfed.org/series/DEXUS${currency.toLowerCase()}`, {
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
                }
                catch (error) {
                    console.warn(`Failed to scrape ${currency} rate from FRED:`, error);
                }
            }
            console.log(`🇺🇸 Fed: Scraped ${rates.length} USD-based rates`);
            return rates;
        }
        catch (error) {
            console.error('Fed scraping failed:', error);
            return [];
        }
    }
    async forceUpdate() {
        console.log('🔄 Force updating exchange rates...');
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
exports.exchangeRateService = new ExchangeRateService();
//# sourceMappingURL=exchangeRateService.js.map