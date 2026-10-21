:root {
  --bg-1: #09111d;
  --bg-2: #0d192d;
  --panel: rgba(13, 25, 41, 0.76);
  --panel-strong: rgba(16, 27, 42, 0.96);
  --panel-soft: rgba(19, 34, 52, 0.7);
  --line: rgba(164, 190, 220, 0.18);
  --text: #eaf4ff;
  --muted: #a9bfd7;
  --blue: #5aa7ff;
  --blue-bright: #79d3ff;
  --green: #7ef0d3;
  --green-strong: #4edf9c;
  --violet: #8c7df5;
  --warning: #ffd76e;
  --danger: #ff7b7b;
  --shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
}

* {
  box-sizing: border-box;
}

html, body, #root {
  margin: 0;
  min-height: 100%;
  min-height: 100vh;
  background: radial-gradient(circle at top, rgba(35, 120, 195, 0.22), transparent 30%), var(--bg-1);
  color: var(--text);
  font-family: Inter, 'Segoe UI', sans-serif;
}

body {
  min-height: 100vh;
}

button, input {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled,
input:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

h1, h2, h3, p {
  margin: 0;
}

input {
  outline: none;
}

.glass-panel {
  background: rgba(16, 26, 38, 0.82);
  border: 1px solid rgba(162, 187, 214, 0.12);
  border-radius: 20px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(15px);
}

.eyebrow {
  margin: 0;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.68rem;
  color: #8cb7dc;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.brand-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--green), var(--blue));
  color: #071620;
  font-weight: 800;
}

.secure-shell,
.auth-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: radial-gradient(circle at top, rgba(90, 167, 255, 0.16), transparent 32%), var(--bg-1);
}

.secure-card,
.auth-card {
  width: min(100%, 580px);
  padding: clamp(1.5rem, 2vw, 2rem);
}

.passcode-panel,
.auth-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.passcode-label,
.mfa-copy {
  color: var(--muted);
}

.passcode-form,
.login-form,
.mfa-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.passcode-form input,
.login-form input,
.mfa-form input {
  width: 100%;
  border-radius: 14px;
  border: 1px solid rgba(143, 162, 184, 0.18);
  background: rgba(255, 255, 255, 0.02);
  color: var(--text);
  padding: 0.9rem 1rem;
}

.password-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.password-row input {
  flex: 1;
}

.toggle-button {
  border: 1px solid rgba(143, 162, 184, 0.2);
  background: rgba(143, 162, 184, 0.08);
  color: var(--text);
  border-radius: 12px;
  padding: 0.85rem 0.9rem;
}

.primary-button,
.google-button,
.secondary-button,
.nav-item,
.prompt-chip {
  border: 0;
  border-radius: 12px;
  transition: transform 0.2s ease, filter 0.2s ease;
}

.primary-button,
.google-button {
  background: linear-gradient(135deg, var(--green), var(--blue));
  color: #02151d;
  font-weight: 700;
  padding: 0.9rem 1.2rem;
}

.secondary-button {
  background: rgba(143, 162, 184, 0.08);
  color: var(--text);
  border: 1px solid rgba(143, 162, 184, 0.2);
  padding: 0.9rem 1.2rem;
}

.google-button {
  width: 100%;
}

.primary-button:hover,
.secondary-button:hover,
.google-button:hover,
.nav-item:hover,
.prompt-chip:hover {
  filter: brightness(1.05);
  transform: translateY(-1px);
}

.full-width {
  width: 100%;
}

.status-row,
.topbar-actions,
.hero-right,
.database-status-row,
.panel-header,
.metric-header,
.activity-item,
.chat-input-row,
.user-chip,
.status-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.status-row,
.topbar-actions,
.status-panel {
  flex-wrap: wrap;
}

.divider {
  position: relative;
  text-align: center;
  color: var(--muted);
  font-size: 0.8rem;
}

.divider::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: rgba(143, 162, 184, 0.18);
}

.divider span {
  position: relative;
  padding: 0 0.75rem;
  background: rgba(12, 21, 32, 0.92);
}

.error-banner {
  border: 1px solid rgba(255, 123, 123, 0.28);
  background: rgba(255, 123, 123, 0.08);
  color: #ffd1d1;
  border-radius: 12px;
  padding: 0.75rem 0.9rem;
}

.dashboard-shell {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  min-height: 100vh;
  background: linear-gradient(180deg, rgba(12, 21, 32, 0.2), rgba(9, 17, 29, 0.24));
}

.sidebar {
  padding: 1.2rem 0.8rem;
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 0;
}

.sidebar-header {
  padding: 0.35rem 0.3rem 1rem;
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
  border-color: rgba(122, 225, 209, 0.18);
}

.status-card {
  padding: 0.9rem 0.75rem;
  border-radius: 16px;
  background: rgba(122, 240, 211, 0.08);
  border: 1px solid rgba(122, 240, 211, 0.15);
}

.database-status-copy {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.7rem;
  color: var(--text);
}

.database-status-copy small {
  color: var(--muted);
}

.heartbeat {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 0 0 rgba(126, 240, 211, 0.35);
}

.heartbeat.online {
  background: var(--green);
  animation: pulseGreen 1.6s infinite;
}

.heartbeat.offline {
  background: var(--danger);
  animation: pulseRed 1.6s infinite;
}

@keyframes pulseGreen {
  0% { box-shadow: 0 0 0 0 rgba(126, 240, 211, 0.45); }
  70% { box-shadow: 0 0 0 10px rgba(126, 240, 211, 0); }
  100% { box-shadow: 0 0 0 0 rgba(126, 240, 211, 0); }
}

@keyframes pulseRed {
  0% { box-shadow: 0 0 0 0 rgba(255, 123, 123, 0.45); }
  70% { box-shadow: 0 0 0 10px rgba(255, 123, 123, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 123, 123, 0); }
}

.main-panel {
  padding: clamp(1rem, 2vw, 1.8rem);
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.topbar,
.hero-bar,
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.topbar,
.hero-bar {
  padding: 1rem 1.1rem;
}

.user-chip {
  background: rgba(143, 162, 184, 0.08);
  border: 1px solid rgba(143, 162, 184, 0.18);
  border-radius: 999px;
  padding: 0.45rem 0.7rem;
}

.user-avatar {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--green), var(--blue));
  color: #02151d;
  font-weight: 700;
}

.subtle-pill {
  border-radius: 999px;
  background: rgba(90, 167, 255, 0.08);
  border: 1px solid rgba(90, 167, 255, 0.2);
  color: var(--muted);
  padding: 0.45rem 0.75rem;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.metric-card {
  padding: 1rem 1.1rem;
}

.metric-card strong {
  display: block;
  margin-top: 0.8rem;
  font-size: clamp(1.5rem, 2vw, 2.1rem);
}

.metric-header {
  align-items: center;
}

.metric-header p {
  color: var(--muted);
}

.delta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  border-radius: 999px;
  padding: 0.35rem 0.6rem;
  font-size: 0.74rem;
}

.delta.positive {
  background: rgba(126, 240, 211, 0.12);
  color: #9af5d7;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  border-radius: 999px;
  padding: 0.4rem 0.7rem;
  font-size: 0.72rem;
  border: 1px solid transparent;
}

.status-badge.positive {
  background: rgba(126, 240, 211, 0.12);
  color: #9af5d7;
  border-color: rgba(126, 240, 211, 0.15);
}

.status-badge.neutral {
  background: rgba(143, 162, 184, 0.08);
  color: var(--text);
  border-color: rgba(143, 162, 184, 0.2);
}

.analytics-grid,
.bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 1rem;
}

.large-panel,
.side-panel,
.ticker-panel,
.chat-panel {
  padding: 1.1rem;
}

.line-chart {
  width: 100%;
  height: 230px;
  margin-top: 1rem;
}

.donut-stack {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1rem;
  min-height: 220px;
}

.donut-chart {
  position: relative;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.donut-inner {
  width: 92px;
  height: 92px;
  display: grid;
  place-items: center;
  text-align: center;
  border-radius: 50%;
  background: rgba(11, 18, 27, 0.94);
  border: 1px solid rgba(143, 162, 184, 0.1);
}

.donut-inner strong {
  font-size: 1.4rem;
}

.donut-inner span {
  font-size: 0.72rem;
  color: var(--muted);
}

.legend-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  color: var(--muted);
}

.legend-list li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.legend-swatch.blue { background: var(--blue); }
.legend-swatch.green { background: var(--green); }
.legend-swatch.violet { background: var(--violet); }

.ticker-list {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.ticker-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem 0.75rem;
  border-radius: 12px;
  background: rgba(143, 162, 184, 0.05);
  color: var(--muted);
}

.ticker-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 16px rgba(126, 240, 211, 0.9);
}

.chat-panel {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-height: 360px;
}

.prompt-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.prompt-chip {
  background: rgba(90, 167, 255, 0.08);
  border: 1px solid rgba(90, 167, 255, 0.18);
  color: var(--text);
  padding: 0.75rem 0.9rem;
  text-align: left;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  overflow: auto;
  max-height: 300px;
  padding-right: 0.25rem;
}

.chat-bubble {
  max-width: 88%;
  padding: 0.8rem 0.95rem;
  border-radius: 15px;
  line-height: 1.5;
}

.chat-bubble.user {
  align-self: flex-end;
  background: linear-gradient(135deg, var(--green), var(--blue));
  color: #02151d;
}

.chat-bubble.assistant {
  align-self: flex-start;
  background: rgba(143, 162, 184, 0.08);
  border: 1px solid rgba(143, 162, 184, 0.14);
  color: var(--text);
}

.typing-bubble {
  padding: 0.7rem 0.9rem;
}

.typing-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  display: block;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  animation: typingBounce 1s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) { animation-delay: 0.15s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.3s; }

@keyframes typingBounce {
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.chat-input-row {
  margin-top: auto;
  flex-wrap: wrap;
}

.chat-input-row input {
  flex: 1;
  min-width: 180px;
  border: 1px solid rgba(143, 162, 184, 0.18);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text);
  padding: 0.8rem 0.9rem;
}

@media (max-width: 980px) {
  .dashboard-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }

  .kpi-row,
  .analytics-grid,
  .bottom-grid,
  .prompt-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .topbar,
  .hero-bar,
  .panel-header,
  .chat-input-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .passcode-form,
  .login-form,
  .mfa-form {
    gap: 0.8rem;
  }

  .password-row {
    flex-direction: column;
    align-items: stretch;
  }

  .primary-button,
  .secondary-button,
  .google-button,
  .toggle-button,
  .chat-input-row input {
    width: 100%;
  }
}
