const finite = value => typeof value === 'number' && Number.isFinite(value);

export function normalizeHistory(result, range, interval) {
  const quote = result.indicators?.quote?.[0];
  const timeZone = result.meta?.exchangeTimezoneName || 'UTC';
  const sessionDate = new Intl.DateTimeFormat('en-CA', {timeZone, year:'numeric', month:'2-digit', day:'2-digit'});
  const bars = new Map();
  for (const [index, timestamp] of (result.timestamp || []).entries()) {
    const close = quote?.close?.[index];
    if (!finite(timestamp) || !finite(close)) continue;
    const date = new Date(timestamp * 1000);
    if (!finite(date.getTime())) continue;
    const session = sessionDate.format(date);
    const key = ['5m','15m'].includes(interval) ? date.toISOString() : session;
    bars.set(key, {session, date:key,
      open: finite(quote?.open?.[index]) ? quote.open[index] : null,
      high: finite(quote?.high?.[index]) ? quote.high[index] : null,
      low: finite(quote?.low?.[index]) ? quote.low[index] : null,
      close, volume: finite(quote?.volume?.[index]) ? quote.volume[index] : null});
  }
  const sorted = [...bars.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const count = range === '5d' ? 5 : range === '1d' ? 1 : null;
  const sessions = count ? new Set([...new Set(sorted.map(bar=>bar.session))].slice(-count)) : null;
  return sorted.filter(bar=>!sessions || sessions.has(bar.session)).map(({session, ...bar})=>bar);
}
