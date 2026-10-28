# Deployment checklist for gcmaidana/folio

This patch only changes deployment-related files. Merge the folder contents into your existing project (preserve `.github/`).

## Frontend: GitHub Pages

1. In GitHub repository **Settings → Pages**, select **GitHub Actions** as the build and deployment source.
2. Keep root `CNAME` as `folio.gcmaidana.com`. The workflow now copies it to `dist/CNAME` after building.
3. Configure DNS for `folio.gcmaidana.com` with a CNAME pointing to `gcmaidana.github.io` at your DNS provider, then verify the custom domain in GitHub Pages settings. DNS is external; this patch cannot make that change.
4. Push changes to `main` or manually run `.github/workflows/pages.yml`.
5. The site can deploy *without* the Worker variable, but live stock lookup will not work until the Worker is configured. The current frontend is expected to show a configuration message/fallback in that case.

## Market-data API: Cloudflare Worker

1. Sign in: `npx wrangler login`.
2. Deploy from your **full project root** (not this patch folder): `npm run deploy:api`.
3. Copy the resulting Worker URL (e.g., `https://stock-market-api.<your-subdomain>.workers.dev`).
4. In **Settings → Secrets and variables → Actions → Variables**, set `VITE_API_BASE_URL` to that URL (without `/api` or trailing slash). This is a public URL, not a secret.
5. Rerun the Pages workflow: Vite variables are baked into the build, so publishing again is required.
6. Verify the site at `https://folio.gcmaidana.com`, try search/quote retrieval, and check browser Network/Console for CORS and 403/429 provider errors.

## Local validation

```sh
npm ci
npm test
npm run build
```

## Notes

- The Node 20 action deprecation warning is addressed via `checkout@v7` and `setup-node@v7`. The build installs Node 24.
- `node_modules/`, `dist/`, `.wrangler/`, and local `.env*` files are ignored. Keep `.env.example` as a placeholder only; it does not contain credentials.
- GitHub Pages is static hosting; it cannot execute `server/market.mjs` as a long-running server.
- This patch does not deploy the Worker, set GitHub settings, or modify DNS automatically.
