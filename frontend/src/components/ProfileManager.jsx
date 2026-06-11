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
            <span className="eyebrow">Profiles</span>
            <h2 id="profile-modal-title">Manage profiles</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close profile manager">
            x
          </button>
        </div>

        <div className="profile-list" aria-label="Saved profiles">
          {profiles.map((profile) => (
            <button
              type="button"
              key={profile.id}
              className={profile.id === activeProfileId ? 'profile-row active' : 'profile-row'}
              onClick={() => onSelect(profile.id)}
            >
              <strong>{profile.name}</strong>
              <small>
                Gross {formatCurrency(profile.form.grossSalary)} · Net {formatCurrency(profile.form.bankNet)}
              </small>
            </button>
          ))}
        </div>

        <div className="form-grid profile-form-grid">
          <label htmlFor="profileName" className="span-2">
            Profile name
            <input
              id="profileName"
              value={draft.name}
              onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
              placeholder={activeProfile?.name || 'New profile'}
            />
          </label>
          <label htmlFor="profileGrossSalary">
            Gross salary
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
            Bank net
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
            Save changes
          </button>
          <button type="button" className="secondary" onClick={onCreate} disabled={Boolean(error)}>
            Create new
          </button>
          <button type="button" className="danger" onClick={onDelete} disabled={profiles.length < 2}>
            Delete
          </button>
        </div>
      </section>
    </div>
  );
}
