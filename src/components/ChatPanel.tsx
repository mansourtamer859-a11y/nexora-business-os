import { useEffect, useState } from 'react';
import { checkDatabaseConnectivity } from '../lib/supabase';

const navItems = ['Overview', 'Operations', 'Finance', 'Security', 'Automation'];

export function Sidebar() {
  const [databaseStatus, setDatabaseStatus] = useState({
    healthy: false,
    latencyMs: 0,
    message: 'Checking connectivity...',
  });

  useEffect(() => {
    let active = true;

    const refreshStatus = async () => {
      const nextStatus = await checkDatabaseConnectivity();
      if (active) {
        setDatabaseStatus(nextStatus);
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
    <aside className="sidebar glass-panel">
      <div className="sidebar-header">
        <div className="brand-row">
          <div className="brand-mark">N</div>
          <div>
            <p className="eyebrow">ERP Matrix</p>
            <strong>NEXUS</strong>
          </div>
        </div>
      </div>

      <nav className="nav-list" aria-label="Main navigation">
        {navItems.map((item, index) => (
          <button key={item} className={index === 0 ? 'nav-item active' : 'nav-item'}>
            {item}
          </button>
        ))}
      </nav>

      <div className="status-card">
        <div className="database-status-row">
          <span className={`heartbeat ${databaseStatus.healthy ? 'online' : 'offline'}`} aria-label="Database connectivity" />
          <span>Database</span>
        </div>

        <div className="database-status-copy">
          <strong>{databaseStatus.healthy ? 'Connected' : 'Awaiting'}</strong>
          <small>{databaseStatus.latencyMs ? `${databaseStatus.latencyMs}ms` : 'checking...'}</small>
        </div>
      </div>
    </aside>
  );
}

