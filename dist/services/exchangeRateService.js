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
const cheerio = __importStar(require("cheerio"));
const database_1 = require("../config/database");
class ExchangeRateService {
    constructor() {
        this.isUpdating = false;
        this.currencyApiKey = process.env.CURRENCY_API_KEY || '';
        this.startScheduledUpdates();
    }
    startScheduledUpdates() {
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
            console.log('⏳ Sync already in progress, skipping...');
            return;
        }
        this.isUpdating = true;
        console.log('🔄 Starting exchange rate sync...');
        try {
            await this.updateRatesFromExchangeRatesData();
            console.log('✅ Exchange rate sync completed successfully');
        }
        catch (apiError) {
            console.error('❌ ExchangeRate-API.com failed:', apiError);
            throw new Error('Failed to sync exchange rates - API error');
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
        console.log(`📊 Fetching rates for ${activeFiats.length} fiats, ${activeCryptos.length} cryptos, ${activeMetals.length} metals`);
        const cryptoPricesInUSD = {};
        const yahooTickers = {
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
                let cryptoPriceInUSD = null;
                try {
                    const yahooApiUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
                    const yahooResponse = await axios_1.default.get(yahooApiUrl, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    if (yahooResponse.data?.chart?.result?.[0]?.meta?.regularMarketPrice) {
                        cryptoPriceInUSD = yahooResponse.data.chart.result[0].meta.regularMarketPrice;
                    }
                }
                catch (apiError) {
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
                        if (cmcUrl) {
                            const cmcResponse = await axios_1.default.get(cmcUrl, {
                                timeout: 10000,
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                                }
                            });
                            const $ = cheerio.load(cmcResponse.data);
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
                    }
                    catch (scrapeError) {
                    }
                }
                if (cryptoPriceInUSD && !isNaN(cryptoPriceInUSD)) {
                    cryptoPricesInUSD[crypto] = cryptoPriceInUSD;
                }
            }
            catch (error) {
            }
        }
        try {
            for (const baseFiat of activeFiats) {
                let apiUrl = '';
                try {
                    const timestamp = Date.now();
                    const random = Math.random().toString(36).substring(7);
                    if (this.currencyApiKey) {
                        apiUrl = `https://v6.exchangerate-api.com/v6/${this.currencyApiKey}/latest/${baseFiat}`;
                    }
                    else {
                        apiUrl = `https://api.exchangerate-api.com/v4/latest/${baseFiat}?t=${timestamp}&r=${random}`;
                    }
                    const response = await axios_1.default.get(apiUrl, {
                        timeout: 15000,
                        headers: {
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache'
                        }
                    });
                    console.log(`📥 API Response ${baseFiat}:`, {
                        url: apiUrl.includes('v6') ? 'v6 (with API key)' : 'v4 (free tier)',
                        status: response.status,
                        statusText: response.statusText,
                        base: response.data?.base || 'N/A',
                        date: response.data?.date || 'N/A',
                        hasRates: !!(response.data && response.data.rates),
                        ratesCount: response.data?.rates ? Object.keys(response.data.rates).length : 0,
                        sampleRates: response.data?.rates ? {
                            USD: response.data.rates.USD || 'N/A',
                            EUR: response.data.rates.EUR || 'N/A',
                            GBP: response.data.rates.GBP || 'N/A'
                        } : 'No rates'
                    });
                    if (response.data && response.data.rates) {
                        const fiatToUSD = response.data.rates.USD || 1;
                        for (const targetFiat of activeFiats) {
                            if (targetFiat === baseFiat)
                                continue;
                            if (response.data.rates[targetFiat]) {
                                const rate = response.data.rates[targetFiat];
                                allRates.push({
                                    from_currency: baseFiat,
                                    to_currency: targetFiat,
                                    rate: rate
                                });
                            }
                        }
                        for (const crypto of activeCryptos) {
                            if (!cryptoPricesInUSD[crypto])
                                continue;
                            const fiatToCrypto = cryptoPricesInUSD[crypto] / fiatToUSD;
                            allRates.push({
                                from_currency: baseFiat,
                                to_currency: crypto,
                                rate: fiatToCrypto
                            });
                        }
                        for (const metal of activeMetals) {
                            const metalPricesInUSD = {
                                'GOLD': 2100,
                                'SILVER': 25,
                                'PLATINUM': 1100,
                                'PALLADIUM': 1100
                            };
                            const metalPriceInUSD = metalPricesInUSD[metal];
                            if (!metalPriceInUSD) {
                                continue;
                            }
                            const fiatToMetal = metalPriceInUSD / fiatToUSD;
                            allRates.push({
                                from_currency: baseFiat,
                                to_currency: metal,
                                rate: fiatToMetal
                            });
                        }
                    }
                }
                catch (error) {
                    console.error(`❌ Failed to fetch rates for ${baseFiat}:`, {
                        status: error.response?.status,
                        message: error.message
                    });
                }
            }
        }
        catch (error) {
            console.error(`❌ Failed to fetch forex rates:`, error);
            throw error;
        }
        if (allRates.length > 0) {
            console.log(`💾 Storing ${allRates.length} exchange rates to database...`);
            await this.storeExchangeRates(allRates);
            console.log(`✅ Successfully stored ${allRates.length} rates`);
        }
        else {
            throw new Error('No rates fetched from ExchangeRate-API.com');
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
            console.log('💰 Scraping cryptocurrency rates from CoinMarketCap...');
            const scrapedCryptoRates = await this.scrapeCryptocurrencyRates();
            if (scrapedCryptoRates.length > 0) {
                await this.storeExchangeRates(scrapedCryptoRates);
                console.log(`✅ Scraped ${scrapedCryptoRates.length} cryptocurrency rates`);
                return;
            }
            console.log('⚠️ Scraping failed from CoinMarketCap...');
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
        for (const rate of rates) {
            await (0, database_1.query)(`INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (from_currency, to_currency)
         DO UPDATE SET rate = $3, updated_at = CURRENT_TIMESTAMP`, [rate.from_currency, rate.to_currency, rate.rate]);
        }
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
        try {
            await this.updateExchangeRates();
        }
        catch (error) {
            console.error(`❌ Force update failed:`, error);
            throw error;
        }
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