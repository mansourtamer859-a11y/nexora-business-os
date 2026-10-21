# NEXORA Business OS

A secure, mobile-first enterprise dashboard and AI assistant scaffold for the NEXORA Business OS platform.

## Features
- Mobile-first business dashboard with responsive layout
- Protected routes and secure auth flow shell for Supabase Auth + Google OAuth
- Centralized environment-based configuration and modular security boundaries
- Dashboard metrics for users, latency, API uptime, and system health
- Persistent AI chat session with local browser session storage
- Error boundary and resilient UI patterns
- Relational schema examples for Supabase/Postgres analytics and chat persistence

## Getting started

1. Install dependencies:
   npm install
2. Copy the environment template:
   cp .env.example .env.local
3. Fill in the Supabase and Google OAuth values for your environment.
4. Run the app:
   npm run dev

## Production notes

- Do not commit `.env.local` or any real secrets.
- Keep all runtime-configurable values in `VITE_*` variables.
- Replace the in-browser demo auth with your production Supabase client when ready.

## Project structure
- `src/components` — reusable dashboard and chat components
- `src/config` — app configuration and environment validation
- `src/hooks` — auth and persistence hooks
- `src/lib` — Supabase client, schema definitions, and state helpers
- `src/styles.css` — enterprise styling and responsive layout

## Security model

This scaffold intentionally separates presentation, security boundaries, and environment configuration. Sensitive values are not embedded in the UI layer. Authentication is isolated behind the auth provider, while the dashboard remains protected behind route guards.
