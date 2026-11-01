# Nexora Business OS

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

Build with `npm run build`; the Pages output directory is `dist`. The app uses Cloudflare Pages Functions under `functions/` for identity verification and workspace data, so it is not a static-only deployment. `public/_headers` sets browser security headers. The Pages SPA fallback handles client-side routes; HTTPS must be enabled at the Cloudflare edge.

Before deployment:

1. Configure HTTPS for the Pages hostname. Authentication cookies require HTTPS.
2. The checked-in `[[d1_databases]]` binding uses database name `nexora-db` and the configured D1 UUID. Confirm that this UUID belongs to the target Cloudflare account before deployment.
3. Apply the checked-in migrations with `npx wrangler d1 migrations apply nexora-db --remote`.
4. Deploy with `npx wrangler pages deploy dist --project-name nexus-business-erp-saas-os` or configure the Pages Git integration to use `npm run build` and `dist`.

Do not replace the D1 UUID with an all-zero or placeholder value. Do not put secrets in Vite `VITE_*` variables.

### GitHub Actions deployment

The workflow at `.github/workflows/pages-deploy.yml` validates, builds, applies D1 migrations, then deploys the Pages assets and Functions on pushes to `main` or a manual dispatch. Before enabling it, add these repository settings:

- **Actions secrets:** `CLOUDFLARE_API_TOKEN` (scoped to Pages edit and D1 edit) and `CLOUDFLARE_ACCOUNT_ID`.
- **Actions variables:** none required for this deployment workflow.

The workflow validates the checked-in D1 binding, applies pending D1 migrations, and deploys Pages. A successful Git push or manual workflow dispatch is still required; Actions cannot bypass missing GitHub or Cloudflare credentials. Cloudflare plan limits and D1 usage determine costs; neither zero cost nor customer provisioning is guaranteed.

For Google sign-in, configure `GOOGLE_CLIENT_ID` as a Pages Function environment variable and `GOOGLE_CLIENT_SECRET` as a Pages Function secret. Register `https://<your-pages-hostname>/api/auth/google/callback` as an authorized Google OAuth redirect URI. Google sign-in remains unavailable until those provider settings are configured.

For the optional shared access gate, configure `NEXORA_GATE_PASSCODE` and `NEXORA_GATE_SIGNING_KEY` as Cloudflare Pages Function secrets. Set the passcode out of band to the value your administrators selected; it is never embedded in the Vite bundle. The signing key must be at least 32 characters of cryptographically random data. The gate grants a 12-hour signed `HttpOnly`, `Secure`, `SameSite=Lax` cookie; D1-backed IP rate limiting applies to passcode attempts. The gate is defense in depth, not a replacement for native user authentication. Its secrets are required for auth, workspace, and assistant routes; if they are unset, those routes fail closed. For local Pages-runtime testing, supply both secrets through the runtime's local secret facility, not committed files.

For the authenticated AI gateway, configure these **Pages Function runtime variables**:

- `ACTIVE_AI_PROVIDER`: `openai-compatible` or `anthropic`.
- `ACTIVE_AI_PROVIDER_URL`: the full HTTPS API endpoint. For example, Groq uses `https://api.groq.com/openai/v1/chat/completions`, OpenAI uses `https://api.openai.com/v1/chat/completions`, and Anthropic uses `https://api.anthropic.com/v1/messages`.
- `TARGET_MODEL_NAME`: a model supported by the selected provider.
- `AI_API_KEY`: the provider key, configured as a Cloudflare Pages Function secret. Never put it in `VITE_*`, `.env.example`, or committed files.
- `AI_ALLOWED_HOSTS`: optional comma-separated exact public hostnames to add for a self-hosted OpenAI-compatible provider. The URL must use HTTPS and a host in this allowlist; redirects are rejected.
- `AI_AUDIO_MODEL_NAME`: optional transcription model for OpenAI-compatible providers. Audio requests require it and use the matching `/audio/transcriptions` endpoint.

The gateway supports OpenAI-compatible chat-completions APIs (including compatible Groq endpoints) and Anthropic Messages. Anthropic accepts PDF documents; OpenAI-compatible endpoints accept extracted text documents. Audio transcription is available only through an OpenAI-compatible endpoint configured with `AI_AUDIO_MODEL_NAME`; the browser can read generated responses aloud. The gateway requires the access gate and native authenticated session, reads only the signed-in user's workspace record, and sends aggregate CRM/invoice/inventory counts—not individual records—as context. Submitted prompts, documents, and audio are sent to the configured provider only after submission. Uploads are limited to 1 MB; spreadsheet binary formats are not parsed. Provider compatibility, quotas, and terms still apply. The gateway does not rotate keys/providers or bypass HTTP 429 rate limits.

The standard Vite `npm run dev` server does not run Pages Functions. Use a Cloudflare Pages-compatible local runtime with local D1 migrations to exercise authentication and the workspace API. The app fails closed when the session endpoint or D1 is unavailable.

The client is rendered with React `createRoot` (not server-rendered/hydrated). The dashboard uses browser-supported `content-visibility` for off-screen panels, and initial workspace reads retry transient serverless/network failures up to three attempts before showing a retryable error state. These measures reduce unnecessary rendering and soften cold starts; they do not guarantee a 60 fps frame rate on every device. React error boundaries catch render/lifecycle errors, not network or serverless exceptions; API errors are handled by the data hook and surfaced in the UI.

## Arabic and English

The workspace supports Arabic (RTL) and English (LTR). Use the language control in the top bar; the preference is stored in browser local storage when available. Arabic is the initial language. Locale resources live in `src/i18n/translations/ar.json` and `src/i18n/translations/en.json`. The onboarding snapshot summarizes authenticated CRM, invoice, and inventory counts from the workspace API; it is a deterministic status summary, not generated AI advice. Dashboard overview charts and several non-core modules use clearly marked illustrative sample values.

The runtime bundle is limited to React and React DOM; unused Supabase and router packages were removed. Vite is a development/build dependency and is not required to serve the built static assets.

## Workspace modules

- **Overview** — Revenue metrics, business activity, sales pipeline, and AI assistant.
- **AI assistant** — Allow-listed demo voice actions plus an authenticated, provider-configurable text/document/audio gateway. The browser's speech synthesis can read answers aloud. Provider setup is required, and provider limits are respected; no key pool or quota bypass is used.
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

- Native email/password registration and sign-in use `/api/auth/register` and `/api/auth/login`. Passwords are salted and hashed server-side with PBKDF2-SHA-256; plaintext passwords are never stored. Authentication attempts are rate-limited per Cloudflare-provided client IP.
- `/api/auth/session` validates an opaque random session cookie against its SHA-256 hash in D1. The cookie is Secure, HttpOnly, SameSite=Lax, and expires after seven days. `/api/auth/session` DELETE revokes the stored session. There is no client-side authentication flag or hardcoded global passcode.
- `/api/business-data` requires a valid server-side session for each read and write. It accepts same-origin JSON writes only, enforces payload limits and schema validation, uses prepared D1 statements, scopes records to the authenticated user, disables caching, and applies a revision check to prevent silent overwrites.
- CRM deals, finance invoice rows, and inventory counts load from and save to D1. D1 data is per account; tenant memberships, roles, shared workspaces, email verification, password recovery, and audit history are not yet modeled.
- Google OAuth uses authorization code + PKCE, one-time server-stored state/nonce, Google JWKS ID-token signature and claim validation, and verified-email account linking. Configure the provider credentials and callback URL above before enabling it in production.
- The requested global passcode is intentionally not implemented: any passcode embedded in a public Vite bundle can be extracted and bypassed, so it cannot serve as an authentication control.

The microphone requests browser permission, captures audio for local level metering, and uses the browser's Web Speech recognition implementation to match only approved phrases. It is not a streaming AI provider integration; speech recognition behavior and possible vendor processing depend on the browser. Assistant actions, HR records, analytics charts, invoice file scanning, forecasts, and social channel activity remain demo behavior. Do not interpret simulated totals, channel status, or assistant output as authoritative business data. The invoice archiver only inspects file metadata and does not upload or parse document contents.

`npm run typecheck` checks both the React app and the Pages Functions. Production deployment still requires a real D1 database binding, applied migrations, HTTPS, Google provider configuration where used, account lifecycle controls (including email verification and password recovery), tenant authorization requirements, and environment-level validation. No source-only implementation can verify a live Cloudflare account or database configuration.

For the engineering milestone history, validation evidence, and security boundary assessment, see [PROJECT_AUDIT.md](./PROJECT_AUDIT.md).
