interface ExchangeRateData {
    from_currency: string;
    to_currency: string;
    rate: number;
}
declare class ExchangeRateService {
    private currencyApiKey;
    private goldApiKey;
    private isUpdating;
    constructor();
    private startScheduledUpdates;
    updateExchangeRates(): Promise<void>;
    private updateFiatRates;
    private updateGoldRates;
    private setFallbackRates;
    private setFallbackGoldRates;
    private storeExchangeRates;
    getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number>;
    convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number>;
    getAllExchangeRates(): Promise<ExchangeRateData[]>;
    forceUpdate(): Promise<void>;
}
export declare const exchangeRateService: ExchangeRateService;
export {};
//# sourceMappingURL=exchangeRateService.d.ts.map