const numeric = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const raw = value => numeric(value?.raw ?? value);

// Read JSON embedded by the provider, never execute page scripts or parse display text.
export function parseFundamentals(html, symbol) {
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!script[1].includes('data-sveltekit-fetched') || !script[1].includes('/quoteSummary/')) continue;
    try {
      const envelope = JSON.parse(script[2]);
      const summary = JSON.parse(envelope.body).quoteSummary?.result?.[0];
      if (envelope.status !== 200 || summary?.price?.symbol?.toUpperCase() !== symbol.toUpperCase()) continue;
      const detail = summary.summaryDetail || {}, stats = summary.defaultKeyStatistics || {};
      return {
        symbol, marketCap: raw(summary.price.marketCap ?? detail.marketCap),
        trailingPE: raw(detail.trailingPE), dividendYield: raw(detail.dividendYield),
        dividendRate: raw(detail.dividendRate), lastDividendValue: raw(stats.lastDividendValue),
        lastDividendDate: raw(stats.lastDividendDate),
        open: raw(detail.open ?? detail.regularMarketOpen),
        dayHigh: raw(detail.dayHigh ?? detail.regularMarketDayHigh),
        dayLow: raw(detail.dayLow ?? detail.regularMarketDayLow),
        averageVolume: raw(detail.averageVolume),
      };
    } catch { /* Ignore unrelated or malformed embedded responses. */ }
  }
  throw new Error('Quote statistics unavailable');
}
