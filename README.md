# Stock analyzer

A standalone React + Vite website. Made with Codex + Astra!

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


# CSV exports and market statistics

CSV exports include only the primary stock’s displayed candles (no indicator warmup or benchmark rows). 5D is capped at five exchange-local trading dates, which can span more than five calendar days. Intraday timestamps are explicitly labeled UTC; daily rows use exchange-local dates. MAX keeps monthly chart bars but fetches all available daily history on demand through `/api/export`, starting at the provider’s first-trade timestamp, including pre-1970 records. Missing first-trade metadata falls back to requesting history since 1900. Exports preserve price precision, leave missing values blank, and include range, interval, and actual coverage in the filename. Saved snapshots are labeled in filenames; MAX never silently exports a snapshot or monthly substitute. Provider coverage can be shorter than the company’s lifetime.


Market snapshot statistics: `/api/fundamentals` reads structured JSON embedded in Yahoo Finance’s public quote page and caches it independently of chart history. The snapshot includes market capitalization, trailing P/E, forward annual dividend yield, latest reported dividend per share, and explicit 52-week high/low values. Dividend yield is stored as a fraction; the latest dividend is an actual payment, not an assumed annual rate divided by four. Missing statistics display a dash, and unavailable quote pages do not prevent charts from loading. Daily high, low, and volume use session metadata instead of the final intraday bar. Both the frontend and API worker must be deployed for these additions.
