# Stock analyzer

A standalone React + Vite website. No ChatGPT account, Sites plugin, or OpenAI service is required to run or host this project. Nothing in this folder has been published.

## Run locally

Install Node.js 22.13 or newer, then run in this folder:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite (normally http://127.0.0.1:5173). The development server includes the market API proxy, so local use requires no API key or Cloudflare account.

## Why there are two deployment pieces

GitHub Pages hosts static HTML, CSS, and JavaScript; it cannot run the stock-data proxy. Yahoo's unofficial endpoint does not provide a supported cross-origin browser API. The frontend runs on GitHub Pages, and the supplied small Cloudflare Worker fetches search and price data. Both pieces are ordinary source code in this repository. A Cloudflare account is required only if you choose that API deployment. Its free tier is subject to current limits; Yahoo can independently rate limit or block requests.

## Deploy when ready

1. Create your own GitHub repository and upload this folder's source, including the hidden `.github` folder. Do not upload `node_modules` or `dist`.
2. In `wrangler.toml`, replace `https://YOUR-USERNAME.github.io` with your Pages origin. For a custom domain, use that origin instead. Multiple origins can be comma-separated. Do not include the repository path.
3. Run `npx wrangler login`, then `npm run deploy:api`. Copy the HTTPS Worker URL it returns. No Yahoo key is required.
4. In GitHub, open Settings → Secrets and variables → Actions → Variables. Add `VITE_API_BASE_URL` with the Worker URL (without `/api` or a trailing slash). This is a public service URL, not a secret.
5. In Settings → Pages, set Source to GitHub Actions. Push to `main`, or manually run the Deploy GitHub Pages workflow. If your default branch has another name, edit `.github/workflows/pages.yml`.
6. The workflow runs tests, builds the site, and publishes `dist`. Relative asset paths support both username.github.io and username.github.io/repository/.

For a manual production build, copy `.env.example` to `.env.local`, replace the Worker URL, and run `npm run build`. `npm run preview` previews that static build and uses the configured remote Worker; unlike `npm run dev`, it does not include a local API proxy. A missing API URL produces an explicit configuration message and a labeled S&P 500 historical snapshot, not fake live data. The GitHub workflow refuses to publish without the API URL.

## Search behavior and coverage

Search queries Yahoo's company and symbol search service dynamically. Results show company, ticker, exchange, and instrument type. Use arrow keys and Enter to select, or click a result. For international listings, select the exchange-qualified ticker shown by the provider. Exact ticker lookup remains available if search fails.

The sidebar is only a shortcut list, never a whitelist. Chart requests accept international suffixes, numeric tickers, ampersands, and share-class punctuation. A failed exact lookup can resolve an unambiguous punctuation alias through provider search. Unknown tickers produce an error; we do not fabricate companies or price history. No provider covers literally every stock, exchange, or delisted security. Search coverage and historical availability depend on Yahoo, not the sidebar entries.

## Features

- S&P 500 landing chart; company/ticker search across provider listings
- 1D, 5D, 1M, 6M, YTD, 1Y, 5Y, and MAX; price and percentage-return views
- SMA30/SMA100/SMA200 overlays; S&P 500 comparison; volume charts
- RSI14, annualized volatility, maximum drawdown, and range statistics
- Browser-local watchlist and CSV download
- Responsive desktop/mobile navigation, keyboard search, source timestamps
- Request cancellation, debounce, API timeouts, bounded caching, distinct rate-limit errors

## Data and methodology

Yahoo Finance is an unofficial, free, no-key data source with no availability guarantee. Prices may be delayed. The API is not a real-time trading feed. Review provider terms and licensing before commercial redistribution.

The saved S&P 500 snapshot contains actual historical observations and is used only for that index when retrieval fails. It is clearly labeled and limited to approximately one year. Missing open/high/low/volume fields stay null; close-only instruments can still render their chart.

Returns use closing prices and exclude dividends; corporate actions can distort comparisons. SMA uses daily closes. RSI uses Wilder smoothing over 14 changes. Volatility uses sample standard deviation of daily log returns annualized by sqrt(252), a trading-session convention that is less suitable for 24/7 crypto markets. Drawdown is the largest peak-to-trough close decline in the selected period. Insufficient data displays a dash. This is a research tool, not investment advice.

## Verification

```sh
npm test
npm run build
```

Tests cover analytics, dynamically supplied global symbols, company search, punctuation aliases, close-only observations, missing data, rate limits, cache expiry, timeouts, and Worker CORS. Network-free tests use injected provider responses; they do not claim guaranteed live availability.

## Structure

- `src/App.tsx`: dashboard and chart interactions
- `src/Search.tsx`: debounced provider search and keyboard selection
- `src/api.ts`: frontend API configuration and errors
- `server/market.mjs`: shared provider adapter, search, validation, caching
- `server/worker.mjs`: deployable Worker and origin allowlist
- `analytics.mjs`: independent analytics calculations
- `.github/workflows/pages.yml`: Pages build and deployment

Watchlists remain in this browser's localStorage. The API receives searched queries and symbols; there is no user account or portfolio upload.

Chart intervals: 1D uses 5-minute bars, 5D uses 15-minute bars, MAX uses monthly bars, and the remaining ranges use daily bars. MAX means all history available from the provider. SMA and RSI operate on the selected bar interval. Annualized volatility is shown only for daily bars; intraday timestamps use US Eastern time. Intraday requests never fall back to the daily historical snapshot.


Each SMA has an independent ON/OFF toggle. The API fetches up to 199 earlier bars to initialize the averages without expanding the visible chart or changing period-return metrics. Missing history is labeled; newly listed instruments may still lack enough history.


Performance comparison: use Compare performance with S&P 500 above the chart. Both series are rebased to 0% at the first common observation; the summary shows each return and the difference in percentage points through their last common observation. Comparison is hidden for the S&P 500 itself. Missing overlap and provider errors are shown explicitly. Returns exclude dividends and do not adjust currencies.


Two-stock comparison: click + Compare stock to reveal the secondary search. Select a company or ticker to overlay its percentage return and show the performance gap. The selector collapses after selection; use Change comparison or the removable ticker chip to edit or exit. Comparisons persist through range changes and reset when navigating to another primary stock. Same-symbol selections (including provider-resolved aliases) are rejected. The primary stock's snapshot and analytics remain independent.


YTD returns use the last available close from December of the previous calendar year, not the first January close. This baseline is used consistently in the headline, return chart, statistics, and YTD comparisons. If a prior year-end price is unavailable, YTD returns display unavailable instead of silently substituting a different period. The headline percentage follows the selected chart range; the separate Day change row shows movement versus the previous close. Non-YTD comparisons continue to rebase at the first shared observation.

