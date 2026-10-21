import { useEffect, useState } from 'react';
import { checkDatabaseConnectivity } from '../lib/supabase';

const navItems = ['Overview', 'Analytics', 'Team', 'Security', 'AI Suite'];

export function Sidebar() {
  const [databaseStatus, setDatabaseStatus] = useState({
    healthy: false,
    latencyMs: 0,
    message: 'Checking connectivity...',
    checkedAt: '',
  });

  useEffect(() => {
    let active = true;

    const refreshStatus = async () => {
      const status = await checkDatabaseConnectivity();
      if (active) {
        setDatabaseStatus(status);
      }
    };

    void refreshStatus();
    const timer = window.setInterval(() => {
      void refreshStatus();
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <aside className="sidebar">
      <div className="brand-row sidebar-brand">
        <div className="brand-mark">N</div>
        <div>
          <p className="eyebrow">Nexus Prime</p>
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

      <div className="sidebar-footer sidebar-status-block">
        <div className="database-status-row">
          <span className={`heartbeat ${databaseStatus.healthy ? 'online' : 'offline'}`} aria-label="Database connectivity" />
          <span>Database</span>
        </div>
        <div className="database-status-copy">
          <strong>{databaseStatus.healthy ? 'Connected' : 'Offline'}</strong>
          <small>{databaseStatus.latencyMs ? `${databaseStatus.latencyMs}ms` : 'Awaiting check'}</small>
        </div>
      </div>
    </aside>
  );
}

