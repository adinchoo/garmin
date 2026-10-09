import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Home', path: '/home' },
  { label: 'Activities', path: '/activities' },
  { label: 'Trends', path: '/trends' },
  { label: 'Nutrition', path: '/nutrition' },
  { label: 'Coach', path: '/coach' },
  { label: 'Profile', path: '/profile' },
] as const;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">G</div>
          <div>
            <div className="brand-title">Garmin</div>
            <div className="brand-subtitle">Performance OS</div>
          </div>
        </div>

        <nav className="nav-stack" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive || location.pathname === item.path ? 'active' : ''}`}
            >
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <div className="eyebrow">Readiness</div>
          <div className="kpi-big">84%</div>
          <div className="muted">Strong recovery window</div>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div>
            <div className="eyebrow">Fitness intelligence</div>
            <h1>Performance overview</h1>
          </div>
          <button className="topbar-action" type="button">
            Export snapshot
          </button>
        </header>

        <main className="page-root">{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
