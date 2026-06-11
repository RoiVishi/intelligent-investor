export default function ProfileManager({
  isOpen,
  profiles,
  activeProfileId,
  draftName,
  setDraftName,
  onClose,
  onCreate,
  onRename,
  onDelete,
}) {
  if (!isOpen) {
    return null;
  }

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
        <div className="modal-header">
          <div>
            <span className="eyebrow">Profiles</span>
            <h2 id="profile-modal-title">Manage profiles</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close profile manager">
            x
          </button>
        </div>

        <label htmlFor="profileName">Profile name</label>
        <input
          id="profileName"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          placeholder={activeProfile?.name || 'New profile'}
        />

        <div className="modal-actions">
          <button type="button" onClick={onCreate}>Create</button>
          <button type="button" className="secondary" onClick={onRename} disabled={!activeProfile}>Rename</button>
          <button type="button" className="danger" onClick={onDelete} disabled={profiles.length < 2}>Delete</button>
        </div>

        <div className="profile-list">
          {profiles.map((profile) => (
            <p key={profile.id} className={profile.id === activeProfileId ? 'active' : ''}>
              {profile.name}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
