:root {
  --bg: #09111d;
  --bg-soft: #0f1b2a;
  --panel: rgba(12, 21, 32, 0.92);
  --panel-soft: rgba(17, 29, 40, 0.9);
  --line: rgba(143, 162, 184, 0.18);
  --text: #edf5ff;
  --muted: #bfcedd;
  --accent: #7ae1d1;
  --accent-2: #5aa7ff;
  --success: #9ef0df;
  --warning: #ffd370;
  --shadow: 0 24px 60px rgba(0, 0, 0, 0.24);
}

* {
  box-sizing: border-box;
}

html, body, #root {
  margin: 0;
  min-height: 100%;
  min-height: 100vh;
  background: radial-gradient(circle at top, rgba(32, 104, 163, 0.3), transparent 28%), var(--bg);
  color: var(--text);
  font-family: Inter, 'Segoe UI', sans-serif;
}

button, input {
  font: inherit;
}

button {
  cursor: pointer;
}

body {
  min-height: 100vh;
}

button:disabled,
input:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

h1, h2, h3, p {
  margin-top: 0;
}

h1, h2, h3 {
  margin-bottom: 0;
}

.loading-shell,
.error-shell,
.auth-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: var(--bg);
}

.auth-card,
.error-card {
  width: min(100%, 560px);
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: clamp(1.25rem, 2vw, 2rem);
  box-shadow: var(--shadow);
}

.auth-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.brand-mark {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #03131c;
  font-weight: 800;
}

.eyebrow {
  margin: 0;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.7rem;
  color: #8ab6d8;
}

.primary-button,
.secondary-button,
.nav-item {
  border: 0;
  border-radius: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.primary-button {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #03131c;
  font-weight: 700;
  padding: 0.9rem 1.5rem;
  box-shadow: 0 12px 28px rgba(90, 167, 255, 0.25);
}

.secondary-button {
  background: rgba(146, 176, 214, 0.08);
  color: var(--text);
  border: 1px solid rgba(146, 176, 214, 0.2);
  padding: 0.85rem 1.25rem;
}

.primary-button:hover,
.secondary-button:hover,
.nav-item:hover {
  transform: translateY(-1px);
}

.app-shell {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  min-height: 100vh;
  background: rgba(4, 10, 18, 0.65);
}

.sidebar {
  border-right: 1px solid rgba(143, 162, 184, 0.14);
  background: rgba(10, 19, 29, 0.95);
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.sidebar-brand {
  padding: 0.5rem 0.25rem 1.5rem;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item {
  width: 100%;
  padding: 0.8rem 0.9rem;
  text-align: left;
  background: transparent;
  color: var(--text);
  border: 1px solid transparent;
}

.nav-item.active {
  background: rgba(90, 167, 255, 0.12);
  border-color: rgba(122, 225, 209, 0.16);
}

.sidebar-footer {
  padding: 1rem 0.75rem;
  border-radius: 12px;
  background: rgba(122, 225, 209, 0.08);
  color: var(--text);
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.main-content {
  padding: clamp(1rem, 2vw, 2rem);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.topbar,
.panel-header,
.metric-header,
.chat-input-row,
.user-chip,
.status-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.topbar {
  flex-wrap: wrap;
}

.topbar-meta,
.status-panel {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.user-chip {
  background: rgba(143, 162, 184, 0.1);
  border: 1px solid rgba(143, 162, 184, 0.2);
  border-radius: 999px;
  padding: 0.5rem 0.75rem;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #09111d;
  font-weight: 700;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.metric-card,
.panel {
  background: var(--panel-soft);
  border: 1px solid rgba(143, 162, 184, 0.14);
  border-radius: 20px;
  padding: 1rem 1.1rem;
}

.metric-card strong {
  display: block;
  font-size: clamp(1.4rem, 2vw, 2.2rem);
  margin-top: 0.9rem;
}

.delta {
  font-size: 0.75rem;
  padding: 0.3rem 0.5rem;
  border-radius: 999px;
}

.delta.positive {
  background: rgba(122, 225, 209, 0.12);
  color: var(--success);
}

.delta.neutral {
  background: rgba(147, 165, 182, 0.12);
  color: var(--muted);
}

.delta.warning {
  background: rgba(255, 212, 110, 0.12);
  color: var(--warning);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  border-radius: 999px;
  font-size: 0.75rem;
  padding: 0.4rem 0.7rem;
  border: 1px solid transparent;
}

.status-badge.positive {
  background: rgba(122, 225, 209, 0.11);
  border-color: rgba(122, 225, 209, 0.18);
  color: var(--success);
}

.status-badge.neutral {
  background: rgba(130, 156, 184, 0.1);
  border-color: rgba(130, 156, 184, 0.15);
  color: var(--text);
}

.status-badge.warning {
  background: rgba(255, 212, 110, 0.12);
  border-color: rgba(255, 212, 110, 0.2);
  color: var(--warning);
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 1rem;
}

.bottom-grid {
  align-items: start;
}

.panel-large {
  min-height: 260px;
}

.chart-bars {
  height: 190px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.7rem;
  padding-top: 1.5rem;
}

.bar-column {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar-column span {
  display: block;
  width: 100%;
  border-radius: 12px 12px 0 0;
  background: linear-gradient(180deg, var(--accent), var(--accent-2));
  min-height: 18%;
}

.security-list,
.activity-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.security-list li,
.activity-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8rem 0.75rem;
  border-radius: 12px;
  background: rgba(143, 162, 184, 0.05);
}

.security-list span,
.activity-list p {
  color: var(--muted);
}

.chat-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 350px;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  overflow: auto;
  max-height: 350px;
  padding-right: 0.25rem;
}

.chat-bubble {
  max-width: 90%;
  padding: 0.8rem 0.9rem;
  border-radius: 14px;
  line-height: 1.5;
}

.chat-bubble.user {
  align-self: flex-end;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #041319;
}

.chat-bubble.assistant {
  align-self: flex-start;
  background: rgba(143, 162, 184, 0.08);
  border: 1px solid rgba(143, 162, 184, 0.14);
  color: var(--text);
}

.chat-input-row {
  margin-top: auto;
  flex-wrap: wrap;
}

.chat-input-row input {
  flex: 1;
  min-width: 200px;
  border: 1px solid rgba(143, 162, 184, 0.15);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text);
  padding: 0.8rem 0.9rem;
}

.error-card {
  text-align: center;
}

@media (max-width: 900px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    border-right: 0;
    border-bottom: 1px solid rgba(143, 162, 184, 0.14);
  }

  .metrics-grid,
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .main-content {
    padding: 1rem;
  }

  .chat-input-row,
  .topbar,
  .panel-header,
  .metric-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .primary-button,
  .secondary-button,
  .chat-input-row input {
    width: 100%;
  }
}
