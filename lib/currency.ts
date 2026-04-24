
/**
 * Currency Utility for W-Tech
 * Handles exchange rates and conversions using AwesomeAPI
 */

export interface ExchangeRates {
    USD: number;
    EUR: number;
    lastUpdate: string;
}

const AWESOME_API_URL = 'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL';

export const getExchangeRates = async (): Promise<ExchangeRates> => {
    try {
        const response = await fetch(AWESOME_API_URL);
        const data = await response.json();
        
        return {
            USD: parseFloat(data.USDBRL.bid),
            EUR: parseFloat(data.EURBRL.bid),
            lastUpdate: data.USDBRL.create_date
        };
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        // Fallback rates if API fails (approximate 2024-2025 rates)
        return {
            USD: 5.50,
            EUR: 6.00,
            lastUpdate: new Date().toISOString()
        };
    }
};

/**
 * Converts value from BRL to target currency
 * @param valueBRL Value in Brazilian Reais
 * @param targetCurrency 'USD' or 'EUR'
 * @param rates Optional pre-fetched rates
 */
export const convertBRLTo = async (
    valueBRL: number, 
    targetCurrency: 'USD' | 'EUR',
    rates?: ExchangeRates
): Promise<{ value: number, rate: number }> => {
    const activeRates = rates || await getExchangeRates();
    const rate = targetCurrency === 'USD' ? activeRates.USD : activeRates.EUR;
    
    // Calculate converted value rounded to 2 decimal places
    const convertedValue = parseFloat((valueBRL / rate).toFixed(2));
    
    return {
        value: convertedValue,
        rate: rate
    };
};
