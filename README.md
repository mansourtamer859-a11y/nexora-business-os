# Nexus business ERP SaaS OS

A responsive enterprise workspace for finance, sales, people operations, inventory, and business analytics. The current release is a client-side interactive demo built with React, TypeScript, and Vite; all operational data and assistant actions are simulated locally.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Production build

```bash
npm run build
npm run typecheck
npm run preview
```

The development and preview servers bind to port `4173` and fail with an explicit error if it is already occupied. Configure `VITE_APP_NAME` and `VITE_APP_ENVIRONMENT` in `.env.local` to set the page title and public environment metadata. Never put secrets in `VITE_*` values; Vite embeds them in browser assets.

## Workspace modules

- **Overview** — Revenue metrics, business activity, sales pipeline, and AI assistant.
- **AI assistant** — Simulated voice prompts, execution status, and business actions.
- **Finance** — Cash flow, recurring revenue, expense distribution, and invoice status.
- **Sales & CRM** — Drag-and-drop sales stages with keyboard/touch-friendly move controls.
- **People** — Employee directory, payroll metrics, and team schedule.
- **Inventory** — Stock thresholds and simulated supplier reorders.
- **Analytics** — Cross-functional performance trends and operational health.

Use **⌘ K** (or **Ctrl K**) to search and switch modules. The theme control in the top bar toggles dark and light appearance. The system tray at the lower-right shows background demo workflows.

## Demo access and security boundary

The access-gate demonstration token is `#117007`. The following login accepts any valid email and a password of at least eight characters; the Google button also advances through a local simulation. These screens demonstrate UI flows only: the gate token is present in the public client bundle, sign-in does not establish an authenticated identity, and no cryptographic protection or OAuth exchange takes place. Because the application is a client-rendered SPA, the gate is not a pre-framework or network-layer HTTPS gate.

Do not use this prototype to protect production systems or sensitive data. A production deployment needs server-side identity verification (for example, a configured OIDC provider), HTTPS enforced at the hosting edge, server-validated sessions, and authorization checks on every protected API and data operation. Replace the local demo data and simulated actions with audited backend workflows before connecting business data.
