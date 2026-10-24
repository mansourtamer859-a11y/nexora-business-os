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
npm run lint
npm audit
npm run preview
```

The development and preview servers bind to port `4173` and fail with an explicit error if it is already occupied. Configure `VITE_APP_NAME` and `VITE_APP_ENVIRONMENT` in `.env.local` to set the page title and public environment metadata. Never put secrets in `VITE_*` values; Vite embeds them in browser assets.

## Static deployment

The app can be deployed as static assets to Cloudflare Pages with the build command `npm run build` and output directory `dist`. The checked-in `public/_headers` file is copied to the output and supplies baseline browser security headers plus long-lived caching for hashed assets. Enforce HTTPS at the hosting edge. Cloudflare plan quotas and overages vary; a static build does not guarantee zero-cost hosting.

The runtime bundle is limited to React and React DOM; unused Supabase and router packages were removed. Vite is a development/build dependency and is not required to serve the built static assets.

## Workspace modules

- **Overview** — Revenue metrics, business activity, sales pipeline, and AI assistant.
- **AI assistant** — Simulated voice prompts, execution status, and business actions.
- **Finance** — Cash flow, recurring revenue, expense distribution, and invoice status.
- **Sales & CRM** — Drag-and-drop sales stages with keyboard/touch-friendly move controls.
- **People** — Employee directory, payroll metrics, and team schedule.
- **Inventory** — Stock thresholds and simulated supplier reorders.
- **Analytics** — Cross-functional performance trends and operational health.
- **Integrations** — Local simulations for WhatsApp, Messenger, Instagram, and TikTok, with sample lead creation in Sales & CRM.
- **Invoice archiver** — Finance-page demo drop zone with file-type/size checks and local metadata-only status simulation.
- **Forecasts** — Simple explanatory projections derived from the current sample MRR and inventory count.

Use **⌘ K** (or **Ctrl K**) to search and switch modules. The theme control in the top bar toggles dark and light appearance. The system tray at the lower-right shows background demo workflows.

## Demo access and security boundary

The access-gate demonstration token is `#117007`. The following login accepts any valid email and a password of at least eight characters; the Google button also advances through a local simulation. These screens demonstrate UI flows only: the gate token is present in the public client bundle, sign-in does not establish an authenticated identity, and no cryptographic protection or OAuth exchange takes place. Because the application is a client-rendered SPA, the gate is not a pre-framework or network-layer HTTPS gate.

The login offers an opt-in “Remember this demo device” option. When selected, the browser stores a plain JSON demo continuity record and a randomly generated local installation marker for up to 14 days. A matching record skips the demo gate and login screens on that browser profile; signing out removes both local records. This is not encryption, a secure device identity, or a server-validated session: browser storage can be inspected, edited, copied, or cleared, and it must not authorize access to real data.

Demo email input is bounded and validated, the passphrase is checked exactly (not transformed), and passwords are not persisted. These client-side checks improve input handling only: the shared source and built assets remain inspectable and modifiable by users. Browser storage changes in another tab or detected on focus/expiry return a remembered demo session to the presentation gate, but same-origin code or a user with developer tools can bypass that state.

The demo passphrase screen applies a temporary in-memory lockout after five failed attempts in a 60-second window. The 30-second cooldown is deliberately described as a UI deterrent, not cryptographic fallback or a reliable brute-force defense; reloads and modified client code can reset or bypass it.

Assistant actions are a fixed allowlist of local demo operations. Unknown requests are declined rather than mapped to a plausible-looking report. The “مسار اتخاذ القرار الذكي” panel describes the deterministic UI path; it is not a model reasoning trace, independent data verification, or a guarantee of factual accuracy. There is no GenAI service or microphone capture in this build.

The invoice archiver accepts PDF/PNG/JPEG selections up to 10 MB and simulates scanning based on filename/type/size metadata only. It never reads file contents or uploads them. Forecast charts extrapolate fixed sample assumptions from displayed mock telemetry; they are not predictive analytics or financial advice. No parsed metadata is posted to a ledger.

Social channels are similarly UI-only simulations. Their switches, message counters, and CRM lead creation do not connect to provider APIs or process real messages. Configure and validate provider webhooks, credentials, consent, and server-side authorization before implementing real channel integrations.

The app includes module-level React error boundaries to keep a rendering failure in a workspace view from taking down the app shell. React error boundaries do not catch every event-handler, network, or asynchronous failure; this static prototype has no backend workflow or service-level isolation.

Do not use this prototype to protect production systems or sensitive data. The `#117007` gate cannot be cryptographically isolated in a browser bundle. A production deployment needs server-side identity verification (for example, a configured OIDC provider), HTTPS enforced at the hosting edge, server-validated sessions, and authorization checks on every protected API and data operation. Replace the local demo data and simulated actions with audited backend workflows before connecting business data.

For the engineering milestone history, validation evidence, and security boundary assessment, see [PROJECT_AUDIT.md](./PROJECT_AUDIT.md).
