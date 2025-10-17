// Base prices in AUD (Australian dollars)
const BASE_PRICES = {
  starter: 14,
  pro: 45,
  business: 150,
} as const;

// Exchange rates relative to AUD (approximate, update periodically)
const EXCHANGE_RATES: Record<string, { rate: number; symbol: string; code: string }> = {
  // Oceania
  'AU': { rate: 1.00, symbol: '$', code: 'AUD' },
  'NZ': { rate: 1.08, symbol: '$', code: 'NZD' },

  // Americas
  'US': { rate: 0.65, symbol: '$', code: 'USD' },
  'CA': { rate: 0.88, symbol: '$', code: 'CAD' },
  'MX': { rate: 13.00, symbol: '$', code: 'MXN' },
  'BR': { rate: 3.25, symbol: 'R$', code: 'BRL' },

  // Europe
  'GB': { rate: 0.51, symbol: '£', code: 'GBP' },
  'EU': { rate: 0.60, symbol: '€', code: 'EUR' },
  'CH': { rate: 0.57, symbol: 'CHF', code: 'CHF' },
  'NO': { rate: 6.85, symbol: 'kr', code: 'NOK' },
  'SE': { rate: 6.75, symbol: 'kr', code: 'SEK' },
  'DK': { rate: 4.47, symbol: 'kr', code: 'DKK' },

  // Asia
  'JP': { rate: 95.00, symbol: '¥', code: 'JPY' },
  'CN': { rate: 4.65, symbol: '¥', code: 'CNY' },
  'IN': { rate: 54.00, symbol: '₹', code: 'INR' },
  'SG': { rate: 0.87, symbol: '$', code: 'SGD' },
  'HK': { rate: 5.08, symbol: '$', code: 'HKD' },
  'KR': { rate: 860.00, symbol: '₩', code: 'KRW' },
  'TH': { rate: 22.50, symbol: '฿', code: 'THB' },
  'MY': { rate: 2.90, symbol: 'RM', code: 'MYR' },
  'ID': { rate: 10250.00, symbol: 'Rp', code: 'IDR' },
  'PH': { rate: 36.50, symbol: '₱', code: 'PHP' },

  // Middle East
  'AE': { rate: 2.39, symbol: 'د.إ', code: 'AED' },
  'SA': { rate: 2.44, symbol: 'ر.س', code: 'SAR' },
  'IL': { rate: 2.35, symbol: '₪', code: 'ILS' },

  // Africa
  'ZA': { rate: 11.80, symbol: 'R', code: 'ZAR' },
};

// Euro zone countries
const EURO_ZONE = [
  'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'
];

export interface LocalizedPrice {
  amount: number;
  symbol: string;
  code: string;
  formatted: string;
}

/**
 * Detect user's country from browser locale
 */
export function detectUserCountry(): string {
  try {
    // Try to get country from Intl API
    const locale = navigator.language || 'en-AU';
    const parts = locale.split('-');

    if (parts.length > 1) {
      const countryCode = parts[1].toUpperCase();

      // Check if it's a Euro zone country
      if (EURO_ZONE.includes(countryCode)) {
        return 'EU';
      }

      // Return country code if we have exchange rate for it
      if (EXCHANGE_RATES[countryCode]) {
        return countryCode;
      }
    }

    // Default to Australia
    return 'AU';
  } catch (error) {
    console.warn('Failed to detect user country:', error);
    return 'AU';
  }
}

/**
 * Convert AUD price to user's local currency
 */
export function convertPrice(audPrice: number, countryCode?: string): LocalizedPrice {
  const country = countryCode || detectUserCountry();
  const currencyInfo = EXCHANGE_RATES[country] || EXCHANGE_RATES['AU'];

  const amount = Math.round(audPrice * currencyInfo.rate);

  // Format based on currency
  let formatted: string;

  if (currencyInfo.code === 'JPY' || currencyInfo.code === 'KRW' || currencyInfo.code === 'IDR') {
    // Currencies without decimals
    formatted = `${currencyInfo.symbol}${amount.toLocaleString()}`;
  } else {
    formatted = `${currencyInfo.symbol}${amount}`;
  }

  return {
    amount,
    symbol: currencyInfo.symbol,
    code: currencyInfo.code,
    formatted,
  };
}

/**
 * Get all plan prices in user's local currency
 */
export function getLocalizedPricing(countryCode?: string) {
  const country = countryCode || detectUserCountry();

  return {
    starter: convertPrice(BASE_PRICES.starter, country),
    pro: convertPrice(BASE_PRICES.pro, country),
    business: convertPrice(BASE_PRICES.business, country),
    country,
  };
}

/**
 * Format currency with proper symbol and code
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(navigator.language, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    const currencyInfo = Object.values(EXCHANGE_RATES).find(c => c.code === currencyCode);
    return `${currencyInfo?.symbol || '$'}${amount}`;
  }
}
