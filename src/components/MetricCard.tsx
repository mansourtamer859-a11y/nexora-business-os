const navItems = ['Overview', 'Analytics', 'Team', 'Security', 'AI Suite'];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand-row sidebar-brand">
        <div className="brand-mark">N</div>
        <div>
          <p className="eyebrow">Business OS</p>
          <strong>NEXORA</strong>
        </div>
      </div>

      <nav className="nav-list" aria-label="Main navigation">
        {navItems.map((item, index) => (
          <button key={item} className={index === 0 ? 'nav-item active' : 'nav-item'}>
            {item}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span>Secure route</span>
        <strong>Protected</strong>
      </div>
    </aside>
  );
}
