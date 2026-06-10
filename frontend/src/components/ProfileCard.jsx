export default function ProfileCard({ form, hasErrors, message, onSave, onUpdateField }) {
  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <h2>Profile</h2>
      </div>

      <div className="profile-card-content">
        <div className="profile-field">
          <label htmlFor="profileName">Name</label>
          <input
            id="profileName"
            name="name"
            type="text"
            value={form.name}
            onChange={onUpdateField}
            placeholder="Your name"
            autoComplete="name"
          />
        </div>

        <div className="profile-field">
          <label htmlFor="profileGrossSalary">Monthly salary (משכורת חודשית)</label>
          <input
            id="profileGrossSalary"
            name="grossSalary"
            type="number"
            min="1"
            max="1000000"
            step="1"
            value={form.grossSalary}
            onChange={onUpdateField}
            placeholder="0"
          />
        </div>

        <div className="profile-field">
          <label htmlFor="profileBankNet">Bank net (נטו בבנק)</label>
          <input
            id="profileBankNet"
            name="bankNet"
            type="number"
            min="1"
            max="1000000"
            step="1"
            value={form.bankNet}
            onChange={onUpdateField}
            placeholder="0"
          />
        </div>
      </div>

      <div className="profile-card-actions">
        <button type="button" onClick={onSave} disabled={hasErrors} className="primary">
          Save Profile
        </button>
      </div>

      {message && (
        <div className={message === 'Profile saved.' ? 'notice success' : 'notice'} role="status">
          {message}
        </div>
      )}
    </div>
  );
}
