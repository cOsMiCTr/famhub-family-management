interface ExchangeRateData {
    from_currency: string;
    to_currency: string;
    rate: number;
}
declare class ExchangeRateService {
    private currencyApiKey;
    private isUpdating;
    constructor();
    private startScheduledUpdates;
    private getActiveCurrenciesByType;
    private getFinnhubSymbol;
    updateExchangeRates(): Promise<void>;
    private updateRatesFromExchangeRatesData;
    private updateFiatRates;
    private updateGoldRates;
    private updateCryptocurrencyRates;
    private updateMetalRates;
    private setFallbackRates;
    private setFallbackGoldRates;
    private storeExchangeRates;
    private createCrossConversions;
    getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number>;
    convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number>;
    getAllExchangeRates(): Promise<ExchangeRateData[]>;
    private scrapeAllRates;
    private scrapeECBRates;
    private scrapeCBRTRates;
    private scrapeBOERates;
    private scrapeFedRates;
    forceUpdate(): Promise<void>;
    private scrapeGoldRates;
    private scrapeCryptocurrencyRates;
    private scrapeMetalRates;
}
export declare const exchangeRateService: ExchangeRateService;
export {};
//# sourceMappingURL=exchangeRateService.d.ts.map