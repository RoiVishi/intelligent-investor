export default function Home({
  form,
  message,
  successMessage,
  validationErrors,
  hasValidationErrors,
  onFieldChange,
  onSaveProfile,
  t,
}) {
  return (
    <div className="home-view">
      <div className="home-hero">
        <span className="logo-mark home-logo" aria-label="Intelligent Investor logo placeholder">
          <span />
        </span>
        <h1>{t.heroTitle}</h1>
        <p>{t.heroText}</p>
      </div>

      <form className="panel home-profile-card" onSubmit={onSaveProfile}>
        <div className="section-title">
          <span>01</span>
          <h2>{t.financialProfile}</h2>
        </div>

        <label htmlFor="name">{t.name}</label>
        <input id="name" name="name" value={form.name} onChange={onFieldChange} autoComplete="name" />

        <label htmlFor="grossSalary">{t.grossSalary}</label>
        <input id="grossSalary" name="grossSalary" type="number" min="1" max="1000000" step="1" value={form.grossSalary} onChange={onFieldChange} />

        <label htmlFor="bankNet">{t.bankNet}</label>
        <input id="bankNet" name="bankNet" type="number" min="1" max="1000000" step="1" value={form.bankNet} onChange={onFieldChange} />

        <button type="submit" disabled={hasValidationErrors}>{t.saveProfile}</button>
        <div className={message === successMessage ? 'notice success' : 'notice'} role="status">{message}</div>
        {hasValidationErrors && (
          <div className="validation-list" aria-label={t.validationErrors}>
            {validationErrors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
