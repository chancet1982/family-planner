# Family Chores Weekly Schedule

Tablet-first web app for family activities, chores, work-from-home days, and school run allocation.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the contents of `supabase/migrations/00001_schema.sql` (creates tables and RLS).
3. Copy `.env.example` to `.env` and set:
   - `VITE_SUPABASE_URL` – Project URL (Settings → API)
   - `VITE_SUPABASE_ANON_KEY` – anon public key

### 3. Run locally

```bash
npm run dev
```

## Auth flow

- Sign in with email/password. If you have no profile yet, you’ll be guided to create or join a household (create household → profile gets `household_id` and `role`).
- Only users with a `household_id` in `profiles` can access Schedule and Admin.

## Deploy to hosting

The app is a static Vite + React SPA that talks to Supabase. Deploy the build output and set your Supabase env vars on the host.

### Before you deploy

1. **Supabase**: Create a project at [supabase.com](https://supabase.com) and run all migrations in `supabase/migrations/` in order (SQL Editor or `supabase db push` if using the CLI).
2. **Env vars**: You will need `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (from Supabase → Settings → API) in your hosting dashboard.

### Option 1: Vercel (recommended)

1. Push the project to GitHub (or GitLab/Bitbucket).
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** and import the repo.
3. **Build settings** (usually auto-detected):
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. **Environment variables**: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Settings → Environment Variables).
5. Deploy. Vercel will serve the SPA and handle client-side routing.

### Option 2: Netlify

1. Push the project to GitHub and go to [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project**.
2. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Environment variables**: Site settings → Environment variables → Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Netlify serves the SPA with client-side routing by default.

### Option 3: Cloudflare Pages

1. Push to GitHub, then [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. **Build configuration**:
   - Framework preset: None (or Vite if listed)
   - Build command: `npm run build`
   - Build output directory: `dist`
3. **Environment variables**: Settings → Environment variables for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy.

### Build locally (to test or upload elsewhere)

```bash
npm run build
```

Output is in `dist/`. Upload the contents to any static host that supports SPA fallback (all routes → `index.html`).
