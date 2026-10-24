# Nexus business ERP SaaS OS

A responsive React/TypeScript ERP workspace with Cloudflare Pages Functions. Authenticated CRM opportunities, finance invoice rows, and inventory counts are stored in per-identity D1 records. People operations, analytics, forecasts, social integrations, and assistant actions still include demo behavior; see the system boundaries below.

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

The Vite development and preview servers bind to port `4173` and fail with an explicit error if it is already occupied. They serve the SPA only; Pages Functions and D1 require a Cloudflare Pages-compatible runtime. Configure `VITE_APP_NAME` and `VITE_APP_ENVIRONMENT` in `.env.local` to set the page title and public environment metadata. Never put secrets in `VITE_*` values; Vite embeds them in browser assets.

## Cloudflare Pages deployment

Build with `npm run build`; the Pages output directory is `dist`. The app uses Cloudflare Pages Functions under `functions/` for identity verification and workspace data, so it is not a static-only deployment. `public/_redirects` provides SPA routing and `public/_headers` sets browser security headers. HTTPS must be enabled at the Cloudflare edge.

Before deployment:

1. Configure a Cloudflare Access self-hosted application for the Pages hostname, protect the entire hostname (including `/api/*`), configure the chosen OIDC identity provider, and limit access with an explicit identity policy.
2. For manual Wrangler deployment, replace `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` in `wrangler.toml` with the Access team hostname and application audience. The GitHub Actions workflow instead reads these values from repository variables.
3. Create the D1 database (`npx wrangler d1 create nexus-business-erp`) and set its ID in `wrangler.toml` for manual deployment, or in the `D1_DATABASE_ID` repository variable for GitHub Actions. Apply `migrations/0001_workspace_state.sql` with `npx wrangler d1 migrations apply nexus-business-erp --remote`.
4. Deploy with `npx wrangler pages deploy dist --project-name nexus-business-erp-saas-os` or configure the Pages Git integration to use `npm run build` and `dist`.

The checked-in Access values and D1 ID are deliberate placeholders; the project is not deployable for authenticated data until they are replaced and the Access application, OIDC provider, Pages project, and D1 binding exist. The serverless code and schema are ready for those environment-specific settings. Do not put secrets in Vite `VITE_*` variables.

### GitHub Actions deployment

The workflow at `.github/workflows/pages-deploy.yml` validates, builds, applies D1 migrations, then deploys the Pages assets and Functions on pushes to `main` or a manual dispatch. Before enabling it, add these repository settings:

- **Actions secrets:** `CLOUDFLARE_API_TOKEN` (scoped to Pages edit and D1 edit) and `CLOUDFLARE_ACCOUNT_ID`.
- **Actions variables:** `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, and `D1_DATABASE_ID`.

The workflow creates a temporary Wrangler config from those values and does not commit or print it. A successful Git push is still required to trigger the workflow; Actions cannot bypass missing GitHub credentials. Cloudflare plan limits and D1 usage determine costs; neither zero cost nor customer provisioning is guaranteed.

The standard Vite `npm run dev` server does not run Pages Functions. Use a Cloudflare Pages-compatible local runtime with local D1 migrations to exercise the API. Until Access and D1 are configured, the app fails closed and does not expose a demo sign-in fallback.

The client is rendered with React `createRoot` (not server-rendered/hydrated). The dashboard uses browser-supported `content-visibility` for off-screen panels, and initial workspace reads retry transient serverless/network failures up to three attempts before showing a retryable error state. These measures reduce unnecessary rendering and soften cold starts; they do not guarantee a 60 fps frame rate on every device. React error boundaries catch render/lifecycle errors, not network or serverless exceptions; API errors are handled by the data hook and surfaced in the UI.

## Arabic and English

The workspace supports Arabic (RTL) and English (LTR). Use the language control in the top bar; the preference is stored in browser local storage when available. Arabic is the initial language. This prototype keeps sample records local, and some company/product names and sample dates are intentionally retained as proper names or data values rather than translated UI labels.

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

## Identity, authorization, and workspace data

- The client-side `#117007` passkey, simulated email/password login, fake Google OAuth button, and remembered-demo-session bypass have been removed.
- Cloudflare Access is the identity provider boundary. The app calls `/api/auth/session`; the Pages Function verifies the `Cf-Access-Jwt-Assertion` signature using the Access JWKS and checks issuer, audience, subject, email, and time claims. No app code stores or accepts a client-provided session token.
- `/api/business-data` independently verifies Access identity on each read and write. It accepts same-origin JSON writes only, enforces a payload limit and strict schema, uses prepared D1 statements, scopes records to the verified Access subject, disables caching, and applies a revision check to prevent silent overwrites from concurrent sessions.
- CRM deals, finance invoice rows, and inventory counts load from and save to D1. They are no longer stored in browser localStorage; old demo storage keys are removed when the app starts. A new identity starts with empty records. D1 data remains per Access subject in this initial schema; tenant memberships, roles, shared workspaces, and audit history are not yet modeled.
- All protected Pages routes must also be covered by a Cloudflare Access application and restrictive policy. API JWT validation is defense in depth, not a substitute for configuring Access on the hostname. Keep the Access team and audience values, and the D1 database ID, correctly configured per deployment.

The microphone requests browser permission, captures audio for local level metering, and uses the browser's Web Speech recognition implementation to match only approved phrases. It is not a streaming AI provider integration; speech recognition behavior and possible vendor processing depend on the browser. Assistant actions, HR records, analytics charts, invoice file scanning, forecasts, and social channel activity remain demo behavior. Do not interpret simulated totals, channel status, or assistant output as authoritative business data. The invoice archiver only inspects file metadata and does not upload or parse document contents.

`npm run typecheck` checks both the React app and the Pages Functions. Production deployment still requires configured Cloudflare Access/OIDC, a real D1 database binding, an applied migration, TLS, tenant authorization requirements, and environment-level validation. No source-only implementation can verify a live Cloudflare account or provider configuration.

For the engineering milestone history, validation evidence, and security boundary assessment, see [PROJECT_AUDIT.md](./PROJECT_AUDIT.md).
