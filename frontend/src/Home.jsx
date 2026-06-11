export default function Home({
  form,
  message,
  validationErrors,
  hasValidationErrors,
  onFieldChange,
  onSaveProfile,
}) {
  return (
    <div className="home-view">
      <div className="home-hero">
        <span className="logo-mark home-logo" aria-label="Intelligent Investor logo placeholder">
          <span />
        </span>
        <h1>Own Your Finances. Shape Your Future.</h1>
        <p>
          Build a financial profile once, then move through focused budget and goal planning views without the noise.
        </p>
      </div>

      <form className="panel home-profile-card" onSubmit={onSaveProfile}>
        <div className="section-title">
          <span>01</span>
          <h2>Financial profile</h2>
        </div>

        <label htmlFor="name">Name</label>
        <input id="name" name="name" value={form.name} onChange={onFieldChange} autoComplete="name" />

        <label htmlFor="grossSalary">Gross salary</label>
        <input id="grossSalary" name="grossSalary" type="number" min="1" max="1000000" step="1" value={form.grossSalary} onChange={onFieldChange} />

        <label htmlFor="bankNet">Bank net</label>
        <input id="bankNet" name="bankNet" type="number" min="1" max="1000000" step="1" value={form.bankNet} onChange={onFieldChange} />

        <button type="submit" disabled={hasValidationErrors}>Save Profile</button>
        <div className={message === 'Profile saved.' ? 'notice success' : 'notice'} role="status">{message}</div>
        {hasValidationErrors && (
          <div className="validation-list" aria-label="Validation errors">
            {validationErrors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
