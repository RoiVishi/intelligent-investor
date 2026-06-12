import { formatCurrency } from '../calculations';

export default function ProfileManager({
  isOpen,
  profiles,
  activeProfileId,
  draft,
  onDraftChange,
  error,
  onClose,
  onCreate,
  onSave,
  onDelete,
  onSelect,
  t,
}) {
  if (!isOpen || !draft) {
    return null;
  }

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
        <div className="modal-header">
          <div>
            <span className="eyebrow">{t.profilesEyebrow}</span>
            <h2 id="profile-modal-title">{t.manageProfiles}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t.closeProfileManager}>
            x
          </button>
        </div>

        <div className="profile-list" aria-label={t.savedProfiles}>
          {profiles.map((profile) => (
            <button
              type="button"
              key={profile.id}
              className={profile.id === activeProfileId ? 'profile-row active' : 'profile-row'}
              onClick={() => onSelect(profile.id)}
            >
              <strong>{profile.name}</strong>
              <small>
                {t.profileSalaries(formatCurrency(profile.form.grossSalary), formatCurrency(profile.form.bankNet))}
              </small>
            </button>
          ))}
        </div>

        <div className="form-grid profile-form-grid">
          <label htmlFor="profileName" className="span-2">
            {t.profileName}
            <input
              id="profileName"
              value={draft.name}
              onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
              placeholder={activeProfile?.name || t.newProfile}
            />
          </label>
          <label htmlFor="profileGrossSalary">
            {t.grossSalary}
            <input
              id="profileGrossSalary"
              type="number"
              min="1"
              max="1000000"
              step="1"
              value={draft.grossSalary}
              onChange={(event) => onDraftChange({
                ...draft,
                grossSalary: event.target.value === '' ? '' : Number(event.target.value),
              })}
            />
          </label>
          <label htmlFor="profileBankNet">
            {t.bankNet}
            <input
              id="profileBankNet"
              type="number"
              min="1"
              max="1000000"
              step="1"
              value={draft.bankNet}
              onChange={(event) => onDraftChange({
                ...draft,
                bankNet: event.target.value === '' ? '' : Number(event.target.value),
              })}
            />
          </label>
        </div>

        {error && <p className="modal-error" role="alert">{error}</p>}

        <div className="modal-actions">
          <button type="button" onClick={onSave} disabled={Boolean(error) || !activeProfile}>
            {t.saveChanges}
          </button>
          <button type="button" className="secondary" onClick={onCreate} disabled={Boolean(error)}>
            {t.createNew}
          </button>
          <button type="button" className="danger" onClick={onDelete} disabled={profiles.length < 2}>
            {t.deleteLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
