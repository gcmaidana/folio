const numeric = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const raw = value => numeric(value?.raw ?? value);

export function parseCompanyLogo(html, symbol) {
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!script[1].includes('data-sveltekit-fetched')) continue;
    try {
      const envelope = JSON.parse(script[2]);
      if (envelope.status !== 200) continue;
      const quote = JSON.parse(envelope.body).quoteResponse?.result?.find(item=>item.symbol===symbol);
      if (!quote) continue;
      for (const [value,theme] of [[quote.logoUrlDarkMode,'dark'],[quote.companyLogoUrl,'light'],[quote.logoUrl,'light']]) {
        if (typeof value !== 'string') continue;
        const url = new URL(value);
        if (url.protocol==='https:' && url.hostname==='s.yimg.com' && !url.username && !url.password) {
          return {logoUrl:url.href,logoTheme:theme};
        }
      }
    } catch { /* Missing or malformed logo data must not affect company statistics. */ }
  }
  return {logoUrl:null,logoTheme:null};
}

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
        ...parseCompanyLogo(html, symbol),
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
