import { currencies } from './CurrencySelector.jsx';

const presets = [
  { name: 'Car', category: 'Transport', accent: 'teal' },
  { name: 'Apartment Deposit', category: 'Housing', accent: 'blue' },
  { name: 'Vacation', category: 'Lifestyle', accent: 'gold' },
  { name: 'Education', category: 'Education', accent: 'blue' },
];

export default function GoalFormModal({
  isOpen,
  mode,
  draft,
  onChange,
  onClose,
  onSubmit,
}) {
  if (!isOpen || !draft) {
    return null;
  }

  function applyPreset(preset) {
    onChange({
      ...draft,
      name: preset.name,
      category: preset.category,
      accent: preset.accent,
    });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel goal-modal" role="dialog" aria-modal="true" aria-labelledby="goal-modal-title">
        <div className="modal-header">
          <div>
            <span className="eyebrow">Goals</span>
            <h2 id="goal-modal-title">{mode === 'edit' ? 'Edit goal' : 'Create goal'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close goal form">
            x
          </button>
        </div>

        <div className="preset-row" aria-label="Goal presets">
          {presets.map((preset) => (
            <button type="button" className="preset-button" key={preset.name} onClick={() => applyPreset(preset)}>
              {preset.name}
            </button>
          ))}
        </div>

        <div className="form-grid">
          <label htmlFor="goalName">
            Goal name
            <input
              id="goalName"
              value={draft.name}
              onChange={(event) => onChange({ ...draft, name: event.target.value })}
            />
          </label>
          <label htmlFor="goalCategory">
            Category
            <select
              id="goalCategory"
              value={draft.category}
              onChange={(event) => onChange({ ...draft, category: event.target.value })}
            >
              <option value="Transport">Transport</option>
              <option value="Housing">Housing</option>
              <option value="Education">Education</option>
              <option value="Lifestyle">Lifestyle</option>
            </select>
          </label>
          <label htmlFor="goalTargetAmount">
            Target amount
            <input
              id="goalTargetAmount"
              type="number"
              min="1"
              step="100"
              value={draft.targetAmount}
              onChange={(event) => onChange({ ...draft, targetAmount: Number(event.target.value) })}
            />
          </label>
          <label htmlFor="goalCurrentAmount">
            Currently saved
            <input
              id="goalCurrentAmount"
              type="number"
              min="0"
              step="100"
              value={draft.currentAmount}
              onChange={(event) => onChange({ ...draft, currentAmount: Number(event.target.value) })}
            />
          </label>
          <label htmlFor="goalMonthlyAmount">
            Required monthly
            <input
              id="goalMonthlyAmount"
              type="number"
              min="0"
              step="100"
              value={draft.monthlyContribution}
              onChange={(event) => onChange({ ...draft, monthlyContribution: Number(event.target.value) })}
            />
          </label>
          <label htmlFor="goalFormCurrency">
            Currency
            <select
              id="goalFormCurrency"
              value={draft.currency}
              onChange={(event) => onChange({ ...draft, currency: event.target.value })}
            >
              {Object.entries(currencies).map(([code, currency]) => (
                <option key={code} value={code}>{currency.symbol} {currency.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onSubmit}>{mode === 'edit' ? 'Save changes' : 'Create goal'}</button>
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
        </div>
      </section>
    </div>
  );
}
