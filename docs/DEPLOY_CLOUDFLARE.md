# Cloudflare Pages Deployment Guide ($0 Tier)

Cloudflare updates its web dashboard UI regularly, so UI buttons frequently move.
Therefore, this guide prioritizes **CLI-based deployment (Wrangler)** and explains GitHub integration by configuration settings rather than specific UI button locations.

---

## 1. Prerequisites (Strictly $0)
- A free [Cloudflare](https://dash.cloudflare.com/) account.
- Node.js & npm installed locally.
- Git repository pushed to GitHub.

---

## 2. Recommended: Deploy via Wrangler CLI (Never breaks when UI changes)

1. Open PowerShell in `C:\Projects\web\plawza`.
2. Build the production app:
   ```powershell
   npm run build
   ```
3. Deploy directly using `npx wrangler pages deploy`:
   ```powershell
   npx wrangler pages deploy dist --project-name=plawza
   ```
   - On the first run, Wrangler will open a browser to authenticate with Cloudflare.
   - It will automatically create the project `plawza` under your Cloudflare account and deploy `dist/`.
   - You will receive a direct URL (e.g., `https://plawza.pages.dev`).

---

## 3. Alternative: GitHub Auto-Deploy (Continuous Deployment)

If you connect your GitHub repository to Cloudflare Pages:

1. In the Cloudflare Dashboard, look for **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
2. Select your repository (`plawza`).
3. Set the **Build settings**:
   - **Framework preset**: `Vite` (or `None`)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Set **Environment variables**:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL (`https://<project-ref>.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Publishable / Anon Key
5. Save and Deploy.

---

## 4. SPA Routing Requirement (`_redirects`)

Because Plawza is a Single Page Application (React Router), any direct visit to `/accommodation` or `/dashboard` must route to `index.html`.

This is handled by `public/_redirects` with the following rule:
```text
/*    /index.html   200
```
Vite copies this file automatically into `dist/` on build.

---

## 5. Free Tier Notes & Limitations
- **Cloudflare Pages Free Tier**:
  - Unlimited requests.
  - Unlimited bandwidth.
  - 500 builds per month (more than enough for MVP).
  - Commercial use is permitted on Cloudflare Pages free tier (unlike Vercel Hobby).
- **Supabase Free Tier**:
  - Pauses after ~7 days of inactivity.
  - Set up a scheduled GitHub Action or cron ping to keep the project active during pilot testing.
