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
        try {
            console.log('💰 Scraping fiat currency rates...');
            const scrapedRates = await this.scrapeAllRates();
            if (scrapedRates.length > 0) {
                await this.storeExchangeRates(scrapedRates);
                console.log(`✅ Scraped ${scrapedRates.length} fiat rates successfully`);
            }
            else {
                console.warn('⚠️ No rates scraped, using fallback rates');
                await this.setFallbackRates(false);
            }
        }
        catch (error) {
            console.error('Failed to scrape fiat rates:', error);
            await this.setFallbackRates(false);
        }
    }
    async updateGoldRates() {
        try {
            console.log('🥇 Scraping gold rates...');
            const goldRates = await this.scrapeGoldRates();
            if (goldRates.length > 0) {
                await this.storeExchangeRates(goldRates);
                console.log(`✅ Scraped ${goldRates.length} gold rates successfully`);
            }
            else {
                console.warn('⚠️ No gold rates scraped, using fallback rates');
                await this.setFallbackGoldRates();
            }
        }
        catch (error) {
            console.error('Failed to scrape gold rates:', error);
            await this.setFallbackGoldRates();
        }
    }
    async updateCryptocurrencyRates() {
        try {
            console.log('💰 Scraping cryptocurrency rates...');
            const scrapedCryptoRates = await this.scrapeCryptocurrencyRates();
            if (scrapedCryptoRates.length > 0) {
                await this.storeExchangeRates(scrapedCryptoRates);
                console.log(`✅ Scraped ${scrapedCryptoRates.length} cryptocurrency rates`);
                return;
            }
            console.log('⚠️ Scraping failed, trying CoinGecko API...');
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
            console.log(`✅ Fetched ${cryptoRates.length} cryptocurrency rates from CoinGecko`);
        }
        catch (error) {
            console.error('Failed to fetch cryptocurrency rates:', error);
        }
    }
    async updateMetalRates() {
        try {
            console.log('🥇 Scraping metal rates...');
            const metalRates = await this.scrapeMetalRates();
            if (metalRates.length > 0) {
                await this.storeExchangeRates(metalRates);
                console.log(`✅ Scraped ${metalRates.length} metal rates successfully`);
            }
            else {
                console.warn('⚠️ No metal rates scraped');
            }
        }
        catch (error) {
            console.error('Failed to scrape metal rates:', error);
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
        await this.createCrossConversions();
    }
    async createCrossConversions() {
        const currencies = ['USD', 'EUR', 'GBP', 'TRY', 'CNY', 'JPY', 'CAD', 'AUD', 'CHF', 'GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM', 'BTC', 'ETH', 'XRP'];
        try {
            for (const fromCurrency of currencies) {
                for (const toCurrency of currencies) {
                    if (fromCurrency !== toCurrency) {
                        const existingRate = await (0, database_1.query)('SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2', [fromCurrency, toCurrency]);
                        if (existingRate.rows.length === 0) {
                            try {
                                const toUSDRate = await (0, database_1.query)('SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2', [fromCurrency, 'USD']);
                                const fromUSDRate = await (0, database_1.query)('SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2', ['USD', toCurrency]);
                                if (toUSDRate.rows.length > 0 && fromUSDRate.rows.length > 0) {
                                    const crossRate = parseFloat(toUSDRate.rows[0].rate) * parseFloat(fromUSDRate.rows[0].rate);
                                    await (0, database_1.query)(`INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
                     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                     ON CONFLICT (from_currency, to_currency)
                     DO UPDATE SET rate = $3, updated_at = CURRENT_TIMESTAMP`, [fromCurrency, toCurrency, crossRate]);
                                }
                            }
                            catch (error) {
                            }
                        }
                    }
                }
            }
            console.log('✅ Created cross-currency conversions');
        }
        catch (error) {
            console.error('Error creating cross-conversions:', error);
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
            console.log('🌐 Scraping exchange rates from Google Finance...');
            const fiatPairs = [
                'EURUSD', 'EURGBP', 'EURTRY', 'EURSGD', 'EURCAD',
                'USDGBP', 'USDTRY', 'USDCNY', 'USDJPY', 'USDCAD', 'USDAUD', 'USDCHF'
            ];
            for (const pair of fiatPairs) {
                try {
                    const fromCurrency = pair.substring(0, 3);
                    const toCurrency = pair.substring(3);
                    const response = await axios_1.default.get(`https://www.google.com/finance/quote/${fromCurrency}-${toCurrency}`, {
                        timeout: 8000,
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                    });
                    const $ = cheerio.load(response.data);
                    const priceText = $('.AHmHk').text().trim() ||
                        $('[data-last-price]').attr('data-last-price') ||
                        $('.YMlKec').text().trim();
                    const rate = parseFloat(priceText.replace(/[^0-9.,]/g, '').replace(',', '.'));
                    if (!isNaN(rate) && rate > 0) {
                        allRates.push({
                            from_currency: fromCurrency,
                            to_currency: toCurrency,
                            rate: rate
                        });
                        allRates.push({
                            from_currency: toCurrency,
                            to_currency: fromCurrency,
                            rate: 1 / rate
                        });
                    }
                }
                catch (error) {
                    console.warn(`Failed to scrape ${pair}:`, error);
                }
            }
            console.log(`✅ Scraped ${allRates.length} fiat rates from Google Finance`);
        }
        catch (error) {
            console.error('Error scraping from Google Finance:', error);
        }
        try {
            const cryptoList = ['BTC-USD', 'ETH-USD', 'XRP-USD'];
            for (const crypto of cryptoList) {
                try {
                    const response = await axios_1.default.get(`https://www.google.com/finance/quote/${crypto}`, {
                        timeout: 8000,
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                    });
                    const $ = cheerio.load(response.data);
                    const priceText = $('.AHmHk').text().trim() ||
                        $('[data-last-price]').attr('data-last-price') ||
                        $('.YMlKec').text().trim();
                    const price = parseFloat(priceText.replace(/[^0-9.,]/g, '').replace(',', '.'));
                    if (!isNaN(price) && price > 0) {
                        const cryptoCode = crypto.split('-')[0];
                        allRates.push({ from_currency: cryptoCode, to_currency: 'USD', rate: price });
                        allRates.push({ from_currency: 'USD', to_currency: cryptoCode, rate: 1 / price });
                    }
                }
                catch (error) {
                    console.warn(`Failed to scrape ${crypto}`);
                }
            }
            console.log(`✅ Added crypto rates from Google Finance`);
        }
        catch (error) {
            console.error('Error scraping crypto from Google Finance:', error);
        }
        try {
            const metals = ['GOLD', 'SILVER'];
            for (const metal of metals) {
                try {
                    const response = await axios_1.default.get(`https://www.google.com/finance/quote/${metal}:COMEX`, {
                        timeout: 8000,
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                    });
                    const $ = cheerio.load(response.data);
                    const priceText = $('.AHmHk').text().trim() ||
                        $('[data-last-price]').attr('data-last-price') ||
                        $('.YMlKec').text().trim();
                    const price = parseFloat(priceText.replace(/[^0-9.,]/g, '').replace(',', '.'));
                    if (!isNaN(price) && price > 0) {
                        allRates.push({ from_currency: metal, to_currency: 'USD', rate: price });
                        allRates.push({ from_currency: 'USD', to_currency: metal, rate: 1 / price });
                    }
                }
                catch (error) {
                    console.warn(`Failed to scrape ${metal}`);
                }
            }
            console.log(`✅ Added precious metal rates from Google Finance`);
        }
        catch (error) {
            console.error('Error scraping metals from Google Finance:', error);
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
    async scrapeGoldRates() {
        const rates = [];
        try {
            const response = await axios_1.default.get('https://www.gold.de/preise/', {
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const $ = cheerio.load(response.data);
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
            if (rates.length === 0) {
                const fallbackGold = 2000;
                rates.push({ from_currency: 'GOLD', to_currency: 'USD', rate: fallbackGold });
                rates.push({ from_currency: 'USD', to_currency: 'GOLD', rate: 1 / fallbackGold });
                console.log(`⚠️ Using fallback gold price: ${fallbackGold} USD/oz`);
            }
        }
        catch (error) {
            console.error('Gold scraping failed:', error);
            const fallbackGold = 2000;
            rates.push({ from_currency: 'GOLD', to_currency: 'USD', rate: fallbackGold });
            rates.push({ from_currency: 'USD', to_currency: 'GOLD', rate: 1 / fallbackGold });
        }
        return rates;
    }
    async scrapeCryptocurrencyRates() {
        const rates = [];
        try {
            const cryptos = [
                { code: 'BTC', url: 'https://www.coingecko.com/en/coins/bitcoin' },
                { code: 'ETH', url: 'https://www.coingecko.com/en/coins/ethereum' },
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
            const results = await Promise.allSettled(cryptos.slice(0, 3).map(async ({ code, url }) => {
                const response = await axios_1.default.get(url, {
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
            }));
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    const { code, price } = result.value;
                    rates.push({ from_currency: code, to_currency: 'USD', rate: 1 / price });
                    rates.push({ from_currency: 'USD', to_currency: code, rate: price });
                }
            });
            console.log(`✅ Scraped ${rates.length} cryptocurrency rates`);
        }
        catch (error) {
            console.error('Crypto scraping failed:', error);
        }
        return rates;
    }
    async scrapeMetalRates() {
        const rates = [];
        try {
            const fallbackSilver = 24.50;
            const fallbackPlatinum = 1050;
            const fallbackPalladium = 1050;
            let silverFound = false;
            let platinumFound = false;
            let palladiumFound = false;
            try {
                const response = await axios_1.default.get('https://www.gold.de/preise/', {
                    timeout: 10000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });
                const $ = cheerio.load(response.data);
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
                            }
                            else if (metalName.includes('platin') && !platinumFound) {
                                rates.push({ from_currency: 'PLATINUM', to_currency: 'USD', rate: price });
                                rates.push({ from_currency: 'USD', to_currency: 'PLATINUM', rate: 1 / price });
                                console.log(`✅ Scraped platinum price from gold.de: ${price} USD/oz`);
                                platinumFound = true;
                            }
                            else if (metalName.includes('palladium') && !palladiumFound) {
                                rates.push({ from_currency: 'PALLADIUM', to_currency: 'USD', rate: price });
                                rates.push({ from_currency: 'USD', to_currency: 'PALLADIUM', rate: 1 / price });
                                console.log(`✅ Scraped palladium price from gold.de: ${price} USD/oz`);
                                palladiumFound = true;
                            }
                        }
                    }
                });
            }
            catch (error) {
                console.warn('gold.de scraping failed:', error);
            }
            if (!silverFound || !platinumFound || !palladiumFound) {
                try {
                    const response = await axios_1.default.get('https://goldprice.org/', {
                        timeout: 10000,
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                    });
                    const $ = cheerio.load(response.data);
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
                }
                catch (error) {
                    console.warn('goldprice.org scraping failed');
                }
            }
            if (!silverFound) {
                rates.push({ from_currency: 'SILVER', to_currency: 'USD', rate: fallbackSilver });
                rates.push({ from_currency: 'USD', to_currency: 'SILVER', rate: 1 / fallbackSilver });
                console.log(`⚠️ Using fallback silver price: ${fallbackSilver} USD/oz`);
                silverFound = true;
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
        }
        catch (error) {
            console.error('Metal scraping completely failed:', error);
        }
        return rates;
    }
}
exports.exchangeRateService = new ExchangeRateService();
//# sourceMappingURL=exchangeRateService.js.map