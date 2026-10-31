/** Export only the visible primary series, never indicator warmup or comparison history. */
export function createCsvExport(data, range) {
  if (!data?.candles?.length) throw new Error('No history is available to export.');
  if (range === 'max' && (data.isSnapshot || data.interval !== '1d')) {
    throw new Error('Full daily history is unavailable. Please retry the export.');
  }
  const intraday = ['5m','15m'].includes(data.interval);
  const header = intraday ? 'timestamp_utc,open,high,low,close,volume' : 'date,open,high,low,close,volume';
  const rows = data.candles.map(bar=>{
    if (typeof bar.date !== 'string' || !(intraday ? /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/ : /^\d{4}-\d{2}-\d{2}$/).test(bar.date)) {
      throw new Error('Invalid date in export history.');
    }
    return [bar.date,...['open','high','low','close','volume'].map(key=>Number.isFinite(bar[key])?bar[key]:'')].join(',');
  });
  const start = data.candles[0].date.slice(0,10), end = data.candles.at(-1).date.slice(0,10);
  const symbol = (data.symbol || 'stock').replace(/[^a-zA-Z0-9._-]/g,'');
  return {csv:[header,...rows].join('\r\n')+'\r\n',
    filename:`${symbol}-${data.isSnapshot?'snapshot':range}-${data.interval}-${start}-to-${end}.csv`,
    rowCount:rows.length, start, end};
}
