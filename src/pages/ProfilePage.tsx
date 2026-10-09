import SectionHeader from '../components/SectionHeader';

export default function ProfilePage() {
  return (
    <>
      <SectionHeader eyebrow="Profile" title="Personal settings and goals" />
      <div className="profile-grid">
        <div className="panel profile-card">
          <div className="profile-header">
            <div className="avatar">AM</div>
            <div>
              <h3>Alex Morgan</h3>
              <div className="muted">Endurance Athlete</div>
            </div>
          </div>
          <div className="field-list">
            <label>
              Target readiness
              <input defaultValue="85%" />
            </label>
            <label>
              Weekly training target
              <input defaultValue="250 minutes" />
            </label>
            <label>
              Recovery focus
              <input defaultValue="Aerobic base" />
            </label>
          </div>
        </div>

        <div className="panel profile-card">
          <h3>Goal summary</h3>
          <ul className="goal-list">
            <li>Increase weekly active minutes by 12%</li>
            <li>Hold average sleep above 8 hours</li>
            <li>Keep heart rate zone balance in aerobic range</li>
          </ul>
        </div>
      </div>
    </>
  );
}
