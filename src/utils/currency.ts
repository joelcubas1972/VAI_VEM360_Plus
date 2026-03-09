export type Currency = 'BRL' | 'PYG' | 'USD';

export const exchangeRates = {
  BRL: 1, // base
  PYG: 1250, // 1 BRL = 1250 PYG (promedio actual)
  USD: 0.18, // 1 BRL = 0.18 USD (aproximado)
};

export const currencySymbols = {
  BRL: 'R$',
  PYG: 'Gs',
  USD: 'US$',
};

export function convertPrice(amountInBRL: number, toCurrency: Currency): number {
  return amountInBRL * exchangeRates[toCurrency];
}

export function formatPrice(amount: number, currency: Currency): string {
  const symbol = currencySymbols[currency];
  const value = currency === 'BRL' ? amount : convertPrice(amount, currency);
  
  return `${symbol} ${value.toFixed(currency === 'PYG' ? 0 : 2)}`;
}