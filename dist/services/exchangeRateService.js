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
    async getActiveCurrenciesByType(type) {
        const result = await (0, database_1.query)('SELECT code FROM currencies WHERE currency_type = $1 AND is_active = true ORDER BY code', [type]);
        return result.rows.map(row => row.code);
    }
    getFinnhubSymbol(code, type) {
        if (type === 'cryptocurrency') {
            return `BINANCE:${code}USDT`;
        }
        else if (type === 'precious_metal') {
            const metalMap = {
                'GOLD': 'OANDA:XAU_USD',
                'SILVER': 'OANDA:XAG_USD',
                'PLATINUM': 'OANDA:XPT_USD',
                'PALLADIUM': 'OANDA:XPD_USD'
            };
            return metalMap[code] || '';
        }
        return '';
    }
    async updateExchangeRates() {
        if (this.isUpdating) {
            console.log('⏳ Exchange rate update already in progress, skipping...');
            return;
        }
        this.isUpdating = true;
        try {
            console.log('📈 Fetching exchange rates from scraping sources...');
            try {
                console.log('🔄 Starting ExchangeRates-Data API sync...');
                await this.updateRatesFromExchangeRatesData();
                console.log('✅ Exchange rates updated successfully from ExchangeRates-Data API');
            }
            catch (apiError) {
                console.error('❌ ExchangeRates-Data API failed with error:', apiError);
                throw new Error('Failed to sync exchange rates - API error');
            }
        }
        catch (error) {
            console.error('❌ Failed to update exchange rates:', error);
        }
        finally {
            this.isUpdating = false;
        }
    }
    async updateRatesFromExchangeRatesData() {
        const allRates = [];
        const activeFiats = await this.getActiveCurrenciesByType('fiat');
        const activeCryptos = await this.getActiveCurrenciesByType('cryptocurrency');
        const activeMetals = await this.getActiveCurrenciesByType('precious_metal');
        console.log(`📊 Active currencies: ${activeFiats.length} fiats, ${activeCryptos.length} cryptos, ${activeMetals.length} metals`);
        const processedPairs = new Set();
        for (let i = 0; i < activeFiats.length; i++) {
            const baseFiat = activeFiats[i];
            console.log(`🔄 Processing base currency: ${baseFiat}`);
            try {
                const response = await axios_1.default.get(`https://api.exchangerate-api.com/v4/latest/${baseFiat}`, { timeout: 10000 });
                console.log(`[${new Date().toISOString()}] 📥 API response for ${baseFiat}:`, JSON.stringify(response.data));
                if (response.data && response.data.rates) {
                    for (const targetFiat of activeFiats) {
                        if (targetFiat === baseFiat)
                            continue;
                        const pairKey = `${baseFiat}-${targetFiat}`;
                        const reversePairKey = `${targetFiat}-${baseFiat}`;
                        if (processedPairs.has(reversePairKey))
                            continue;
                        if (response.data.rates[targetFiat]) {
                            const rate = response.data.rates[targetFiat];
                            if (baseFiat === 'EUR' && targetFiat === 'TRY') {
                                console.log(`[${new Date().toISOString()}] 🔍 EUR/TRY rate from API: ${rate}`);
                            }
                            allRates.push({
                                from_currency: baseFiat,
                                to_currency: targetFiat,
                                rate: rate
                            });
                            processedPairs.add(pairKey);
                        }
                    }
                }
            }
            catch (error) {
                console.error(`[${new Date().toISOString()}] ❌ Failed to fetch forex rates for ${baseFiat}:`, error);
                if (error instanceof Error) {
                    console.error(`[${new Date().toISOString()}] Error details:`, error.message);
                }
            }
            for (const crypto of activeCryptos) {
                try {
                    const cmcUrls = {
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
                    if (!cmcUrl) {
                        console.warn(`No CoinMarketCap URL for ${crypto}`);
                        continue;
                    }
                    const response = await axios_1.default.get(cmcUrl, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    const $ = cheerio.load(response.data);
                    const priceText = $('span.sc-aef7b723-0.bsFTBp').first().text();
                    const cryptoPriceInUSD = parseFloat(priceText.replace(/[$,]/g, ''));
                    if (cryptoPriceInUSD && !isNaN(cryptoPriceInUSD)) {
                        let baseFiatToUSD = 1;
                        if (baseFiat !== 'USD') {
                            try {
                                const fiatResponse = await axios_1.default.get(`https://api.exchangerate-api.com/v4/latest/${baseFiat}`, { timeout: 5000 });
                                if (fiatResponse.data && fiatResponse.data.rates && fiatResponse.data.rates.USD) {
                                    baseFiatToUSD = fiatResponse.data.rates.USD;
                                }
                            }
                            catch (err) {
                                console.warn(`Could not fetch ${baseFiat}/USD rate`);
                            }
                        }
                        const baseFiatToCrypto = baseFiatToUSD / cryptoPriceInUSD;
                        console.log(`📈 Scraped ${crypto} price: $${cryptoPriceInUSD} from CoinMarketCap`);
                        allRates.push({
                            from_currency: baseFiat,
                            to_currency: crypto,
                            rate: baseFiatToCrypto
                        });
                    }
                    else {
                        console.warn(`Could not parse ${crypto} price from CoinMarketCap`);
                    }
                }
                catch (error) {
                    console.error(`Failed to scrape ${baseFiat} to ${crypto} from CoinMarketCap:`, error);
                }
            }
            for (const metal of activeMetals) {
                try {
                    const metalPricesInUSD = {
                        'GOLD': 2100,
                        'SILVER': 25,
                        'PLATINUM': 1100,
                        'PALLADIUM': 1100
                    };
                    const metalPriceInUSD = metalPricesInUSD[metal];
                    if (!metalPriceInUSD) {
                        console.warn(`No price mapping for metal: ${metal}`);
                        continue;
                    }
                    let baseFiatToUSD = 1;
                    if (baseFiat !== 'USD') {
                        try {
                            const fiatResponse = await axios_1.default.get(`https://api.exchangerate-api.com/v4/latest/${baseFiat}`, { timeout: 5000 });
                            if (fiatResponse.data && fiatResponse.data.rates && fiatResponse.data.rates.USD) {
                                baseFiatToUSD = fiatResponse.data.rates.USD;
                            }
                        }
                        catch (err) {
                            console.warn(`Could not fetch ${baseFiat}/USD rate`);
                        }
                    }
                    const baseFiatToMetal = metalPriceInUSD / baseFiatToUSD;
                    allRates.push({
                        from_currency: baseFiat,
                        to_currency: metal,
                        rate: baseFiatToMetal
                    });
                }
                catch (error) {
                    console.error(`Failed to fetch ${baseFiat} to ${metal}:`, error);
                }
            }
        }
        console.log(`[${new Date().toISOString()}] ✅ Fetched ${allRates.length} exchange rates from ExchangeRates-Data API`);
        console.log(`[${new Date().toISOString()}] 📊 Sample rates being stored:`, allRates.slice(0, 5));
        const eurRates = allRates.filter(r => r.from_currency === 'EUR');
        console.log(`[${new Date().toISOString()}] 🔍 All EUR rates:`, eurRates);
        const eurTryRate = allRates.find(r => r.from_currency === 'EUR' && r.to_currency === 'TRY');
        console.log(`[${new Date().toISOString()}] 🔍 EUR/TRY found:`, eurTryRate);
        if (eurTryRate) {
            console.log(`[${new Date().toISOString()}] 🔍 EUR/TRY rate before storing to DB: ${eurTryRate.rate}`);
        }
        else {
            console.log(`[${new Date().toISOString()}] ⚠️ EUR/TRY rate NOT found in allRates array`);
        }
        if (allRates.length > 0) {
            await this.storeExchangeRates(allRates);
            console.log(`[${new Date().toISOString()}] ✅ Successfully stored ${allRates.length} rates to database`);
        }
        else {
            throw new Error('No rates fetched from ExchangeRates-Data API');
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
            console.log('⚠️ Scraping failed, skipping CoinGecko fallback (use Finnhub instead)...');
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
        console.log('⚠️ All syncing methods failed. Please check your internet connection and Finnhub API key.');
    }
    async setFallbackGoldRates() {
        console.log('⚠️ Gold fallback rates deprecated. Use Finnhub API instead.');
    }
    async storeExchangeRates(rates) {
        console.log(`💾 Storing ${rates.length} rates to database...`);
        for (const rate of rates) {
            await (0, database_1.query)(`INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (from_currency, to_currency)
         DO UPDATE SET rate = $3, updated_at = CURRENT_TIMESTAMP`, [rate.from_currency, rate.to_currency, rate.rate]);
        }
        console.log(`✅ Stored ${rates.length} rates successfully`);
    }
    async createCrossConversions() {
        const allCurrencies = await (0, database_1.query)('SELECT code FROM currencies WHERE is_active = true');
        const currencies = allCurrencies.rows.map(row => row.code);
        try {
            console.log(`🔄 Creating cross-conversions for ${currencies.length} currencies (${currencies.length * (currencies.length - 1)} possible pairs)...`);
            for (const fromCurrency of currencies) {
                for (const toCurrency of currencies) {
                    if (fromCurrency !== toCurrency) {
                        const existingRate = await (0, database_1.query)('SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2', [fromCurrency, toCurrency]);
                        if (existingRate.rows.length === 0) {
                            try {
                                const toUSDRate = await (0, database_1.query)('SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2', [fromCurrency, 'USD']);
                                const fromUSDRate = await (0, database_1.query)('SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2', ['USD', toCurrency]);
                                if (toUSDRate.rows.length > 0 && fromUSDRate.rows.length > 0) {
                                    const fromCurrencyToUSD = parseFloat(toUSDRate.rows[0].rate);
                                    const usdToToCurrency = parseFloat(fromUSDRate.rows[0].rate);
                                    const cryptoCurrencies = await this.getActiveCurrenciesByType('cryptocurrency');
                                    const isFromCrypto = cryptoCurrencies.includes(fromCurrency);
                                    const isToCrypto = cryptoCurrencies.includes(toCurrency);
                                    if (cryptoCurrencies.includes(toCurrency)) {
                                        console.log(`🔍 DEBUG: Converting ${fromCurrency} to ${toCurrency}`);
                                        console.log(`🔍 fromCurrencyToUSD (${fromCurrency}/USD): ${fromCurrencyToUSD}`);
                                        console.log(`🔍 usdToToCurrency (USD/${toCurrency}): ${usdToToCurrency}`);
                                        console.log(`🔍 isFromCrypto: ${isFromCrypto}, isToCrypto: ${isToCrypto}`);
                                    }
                                    let crossRate;
                                    if (fromCurrency === 'USD') {
                                        crossRate = usdToToCurrency;
                                    }
                                    else if (toCurrency === 'USD') {
                                        crossRate = fromCurrencyToUSD;
                                    }
                                    else if (isFromCrypto && !isToCrypto) {
                                        crossRate = usdToToCurrency / fromCurrencyToUSD;
                                    }
                                    else if (!isFromCrypto && isToCrypto) {
                                        crossRate = fromCurrencyToUSD / usdToToCurrency;
                                    }
                                    else {
                                        crossRate = fromCurrencyToUSD / usdToToCurrency;
                                    }
                                    if (fromCurrency === 'EUR' && cryptoCurrencies.includes(toCurrency)) {
                                        console.log(`🔍 Calculated crossRate: ${crossRate}`);
                                        console.log(`🔍 This means: 1 ${fromCurrency} = ${crossRate} ${toCurrency}`);
                                    }
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
            try {
                const toUSDRate = await (0, database_1.query)('SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2', [fromCurrency, 'USD']);
                const fromUSDRate = await (0, database_1.query)('SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2', ['USD', toCurrency]);
                if (toUSDRate.rows.length > 0 && fromUSDRate.rows.length > 0) {
                    const fromCurrencyToUSD = parseFloat(toUSDRate.rows[0].rate);
                    const usdToToCurrency = parseFloat(fromUSDRate.rows[0].rate);
                    const cryptoCurrencies = await this.getActiveCurrenciesByType('cryptocurrency');
                    const isFromCrypto = cryptoCurrencies.includes(fromCurrency);
                    const isToCrypto = cryptoCurrencies.includes(toCurrency);
                    if (cryptoCurrencies.includes(toCurrency)) {
                        console.log(`🔍 DEBUG: Converting ${fromCurrency} to ${toCurrency}`);
                        console.log(`🔍 fromCurrencyToUSD (${fromCurrency}/USD): ${fromCurrencyToUSD}`);
                        console.log(`🔍 usdToToCurrency (USD/${toCurrency}): ${usdToToCurrency}`);
                        console.log(`🔍 isFromCrypto: ${isFromCrypto}, isToCrypto: ${isToCrypto}`);
                    }
                    let crossRate;
                    if (fromCurrency === 'USD') {
                        crossRate = usdToToCurrency;
                    }
                    else if (toCurrency === 'USD') {
                        crossRate = fromCurrencyToUSD;
                    }
                    else if (isFromCrypto && !isToCrypto) {
                        crossRate = usdToToCurrency / fromCurrencyToUSD;
                    }
                    else if (!isFromCrypto && isToCrypto) {
                        crossRate = fromCurrencyToUSD / usdToToCurrency;
                    }
                    else {
                        crossRate = fromCurrencyToUSD / usdToToCurrency;
                    }
                    if (cryptoCurrencies.includes(toCurrency)) {
                        console.log(`🔍 Calculated crossRate: ${crossRate}`);
                        console.log(`🔍 This means: 1 ${fromCurrency} = ${crossRate} ${toCurrency}`);
                    }
                    await (0, database_1.query)(`INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             ON CONFLICT (from_currency, to_currency)
             DO UPDATE SET rate = $3, updated_at = CURRENT_TIMESTAMP`, [fromCurrency, toCurrency, crossRate]);
                    return crossRate;
                }
            }
            catch (error) {
                console.error(`Failed to calculate ${fromCurrency} to ${toCurrency}:`, error);
            }
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
            rate: parseFloat(row.rate),
            updated_at: row.updated_at
        }));
    }
    async scrapeAllRates() {
        console.log('⚠️ Google Finance scraping deprecated. Use Finnhub API instead.');
        return [];
    }
    async scrapeECBRates() {
        return [];
    }
    async scrapeCBRTRates() {
        return [];
    }
    async scrapeBOERates() {
        return [];
    }
    async scrapeFedRates() {
        return [];
    }
    async forceUpdate() {
        console.log('🔄 Force updating exchange rates...');
        if (!this.currencyApiKey) {
            console.log('🔄 Manual sync: Attempting scraping without API keys...');
            try {
                const scrapedRates = await this.scrapeAllRates();
                if (scrapedRates.length > 0) {
                    console.log(`✅ Manual sync: Scraped ${scrapedRates.length} rates successfully`);
                    await this.storeExchangeRates(scrapedRates);
                    console.log(`✅ Stored ${scrapedRates.length} rates in database`);
                }
                else {
                    console.warn('⚠️ No rates scraped, falling back to updateExchangeRates...');
                    await this.updateExchangeRates();
                }
            }
            catch (error) {
                console.error('❌ Error during force update scraping:', error);
                await this.updateExchangeRates();
            }
        }
        else {
            await this.updateExchangeRates();
        }
        console.log('✅ Force update completed');
    }
    async scrapeGoldRates() {
        return [];
    }
    async scrapeCryptocurrencyRates() {
        return [];
    }
    async scrapeMetalRates() {
        return [];
    }
}
exports.exchangeRateService = new ExchangeRateService();
//# sourceMappingURL=exchangeRateService.js.map