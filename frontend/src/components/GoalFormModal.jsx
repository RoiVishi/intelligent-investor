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
  t,
}) {
  if (!isOpen || !draft) {
    return null;
  }

  function applyPreset(preset) {
    onChange({
      ...draft,
      name: t.presetNames[preset.name] || preset.name,
      category: preset.category,
      accent: preset.accent,
    });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel goal-modal" role="dialog" aria-modal="true" aria-labelledby="goal-modal-title">
        <div className="modal-header">
          <div>
            <span className="eyebrow">{t.goalsEyebrow}</span>
            <h2 id="goal-modal-title">{mode === 'edit' ? t.editGoalTitle : t.createGoalTitle}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t.closeGoalForm}>
            x
          </button>
        </div>

        <div className="preset-row" aria-label={t.goalPresets}>
          {presets.map((preset) => (
            <button type="button" className="preset-button" key={preset.name} onClick={() => applyPreset(preset)}>
              {t.presetNames[preset.name] || preset.name}
            </button>
          ))}
        </div>

        <div className="form-grid">
          <label htmlFor="goalName">
            {t.goalName}
            <input
              id="goalName"
              value={draft.name}
              onChange={(event) => onChange({ ...draft, name: event.target.value })}
            />
          </label>
          <label htmlFor="goalCategory">
            {t.category}
            <select
              id="goalCategory"
              value={draft.category}
              onChange={(event) => onChange({ ...draft, category: event.target.value })}
            >
              <option value="Transport">{t.categoryNames.Transport}</option>
              <option value="Housing">{t.categoryNames.Housing}</option>
              <option value="Education">{t.categoryNames.Education}</option>
              <option value="Lifestyle">{t.categoryNames.Lifestyle}</option>
            </select>
          </label>
          <label htmlFor="goalTargetAmount">
            {t.targetAmount}
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
            {t.currentlySaved}
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
            {t.requiredMonthly}
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
            {t.currency}
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
          <button type="button" onClick={onSubmit}>{mode === 'edit' ? t.saveChanges : t.createGoal}</button>
          <button type="button" className="secondary" onClick={onClose}>{t.cancel}</button>
        </div>
      </section>
    </div>
  );
}
