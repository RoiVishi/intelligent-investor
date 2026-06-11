export const currencies = {
  ILS: { label: 'ILS', symbol: '₪', rateToIls: 1 },
  USD: { label: 'USD', symbol: '$', rateToIls: 3.7 },
  EUR: { label: 'EUR', symbol: '€', rateToIls: 4 },
};

export function convertCurrency(amount, fromCurrency, toCurrency) {
  const from = currencies[fromCurrency] || currencies.ILS;
  const to = currencies[toCurrency] || currencies.ILS;
  return ((Number(amount) || 0) * from.rateToIls) / to.rateToIls;
}

export default function CurrencySelector({ value, onChange }) {
  return (
    <label className="toolbar-field" htmlFor="currency">
      <span>Currency</span>
      <select id="currency" value={value} onChange={(event) => onChange(event.target.value)}>
        {Object.entries(currencies).map(([code, currency]) => (
          <option key={code} value={code}>
            {currency.symbol} {currency.label}
          </option>
        ))}
      </select>
    </label>
  );
}
