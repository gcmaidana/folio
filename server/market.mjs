export const rangeIntervals = { '1d':'5m', '5d':'15m', '1mo':'1d', '6mo':'1d', 'ytd':'1d', '1y':'1d', '5y':'1d', 'max':'1mo' };
const ranges = new Set(Object.keys(rangeIntervals));
const validSymbol = value => /^[A-Z0-9^][A-Z0-9.&^=\-]{0,39}$/.test(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const json = (body, status = 200) => Response.json(body, { status, headers: status === 200 ? { 'Cache-Control': 'public, max-age=60' } : { 'Cache-Control': 'no-store' } });

/** A portable Web Request/Response handler shared by local Node and edge hosting. */
export function createApiHandler({ fetchImpl = globalThis.fetch, now = Date.now, timeoutMs = 12000, cacheTtlMs = 60000 } = {}) {
  const cache = new Map();
  async function provider(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 StockAnalyzer/2.0' } });
      if (!response.ok) throw Object.assign(new Error('Provider request failed'), { status: response.status });
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  async function search(query) {
    const data = await provider(`https://query1.finance.yahoo.com/v1/finance/search?${new URLSearchParams({ q: query, quotesCount: '12', newsCount: '0' })}`);
    if (!Array.isArray(data.quotes)) throw new Error('Invalid provider search response');
    return data.quotes.filter(item => typeof item.symbol === 'string' && validSymbol(item.symbol.toUpperCase())).map(item => ({
      symbol: item.symbol.toUpperCase(), name: item.longname || item.shortname || item.symbol,
      exchange: item.exchDisp || item.exchange || '', type: item.quoteType || item.typeDisp || 'UNKNOWN',
    })).sort((a,b)=>Number(b.symbol===query.toUpperCase())-Number(a.symbol===query.toUpperCase()) || Number(b.type==='EQUITY')-Number(a.type==='EQUITY'));
  }
  async function chart(symbol, range) {
    const window = range === 'max' ? `period1=0&period2=${Math.floor(now()/1000)}` : `range=${range}`;
    const data = await provider(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${rangeIntervals[range]}&${window}`);
    if (data.chart?.error || !data.chart?.result?.[0]) throw Object.assign(new Error('Symbol unavailable'), { status: 404 });
    return data.chart.result[0];
  }
  return async function handle(request) {
    const url = new URL(request.url);
    if (!['/api/search', '/api/market'].includes(url.pathname)) return json({ error: 'API route not found.' }, 404);
    if (request.method !== 'GET') return json({ error: 'Use GET for market data requests.' }, 405);
    const isSearch = url.pathname === '/api/search';
    const query = (url.searchParams.get('q') || '').trim().replace(/^\$+/, '').trim();
    const symbol = (url.searchParams.get('symbol') || '^GSPC').trim().replace(/^\$+/, '').trim().toUpperCase();
    const range = url.searchParams.get('range') || '1y';
    if (isSearch ? (!query || query.length > 100 || /[\x00-\x1f\x7f]/.test(query)) : (!validSymbol(symbol) || !ranges.has(range))) {
      return json({ error: isSearch ? 'Enter a company name or ticker (up to 100 characters).' : 'Enter a valid ticker and supported chart range.' }, 400);
    }
    const key = isSearch ? `search:${query.toLowerCase()}` : `market:${symbol}:${range}:${url.searchParams.get("warmup")=== "1"}`;
    const cached = cache.get(key);
    if (cached && cached.expires > now()) return json(cached.body);
    try {
      let body;
      if (isSearch) body = { results: await search(query) };
      else {
        let result;
        try { result = await chart(symbol, range); }
        catch (error) {
          if (error.status !== 404) throw error;
          // Resolve provider-supported punctuation aliases only after direct lookup fails.
          // Exchange suffixes always get a direct lookup first and are never stripped.
          const normalized = symbol.replace(/[.-]/g, '');
          const matches = (await search(symbol)).filter(item => item.symbol !== symbol && item.symbol.replace(/[.-]/g, '') === normalized);
          if (matches.length !== 1) throw error;
          result = await chart(matches[0].symbol, range);
        }
        const quote = result.indicators?.quote?.[0];
        const candles = (result.timestamp || []).flatMap((timestamp, index) => {
          const close = quote?.close?.[index];
          if (!finite(close) || !finite(timestamp)) return [];
          const date = new Date(timestamp * 1000);
          if (!finite(date.getTime())) return [];
          // Some indexes/funds report close only; keep the valid observation.
          return [{ date: ['1d','5d'].includes(range) ? date.toISOString() : date.toISOString().slice(0, 10), open: finite(quote?.open?.[index]) ? quote.open[index] : null,
            high: finite(quote?.high?.[index]) ? quote.high[index] : null,
            low: finite(quote?.low?.[index]) ? quote.low[index] : null,
            close, volume: finite(quote?.volume?.[index]) ? quote.volume[index] : null }];
        });
        if (!candles.length) return json({ error: `No chart history is available for ${symbol} in this range.` }, 404);
        const meta = result.meta || {};
        const resolvedSymbol = meta.symbol || symbol;
        let indicatorHistory = []; let indicatorHistoryUnavailable = false;
        if(url.searchParams.get('warmup')==='1' && range!=='max'){
          try {
            const first=result.timestamp[0];
            const days=['1d','5d'].includes(range)?30:400;
            const history=await provider(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(resolvedSymbol)}?interval=${rangeIntervals[range]}&period1=${Math.max(0,first-days*86400)}&period2=${first}`);
            const h=history.chart?.result?.[0];if(!h)throw Error('History unavailable');
            indicatorHistory=(h.timestamp||[]).flatMap((t,i)=>{
              const close=h.indicators?.quote?.[0]?.close?.[i];
              const date=['1d','5d'].includes(range)?new Date(t*1000).toISOString():new Date(t*1000).toISOString().slice(0,10);
              return finite(close)&&date<candles[0].date?[{date,close}]:[];
            }).slice(-199);
          }catch{indicatorHistoryUnavailable=true;}
        }
        let returnBaseline = null;
        if(range==='ytd'){
          try{
            const year=Number(new Intl.DateTimeFormat('en-US',{year:'numeric',timeZone:meta.exchangeTimezoneName||'America/New_York'}).format(new Date(now())));
            const start=Date.UTC(year-1,11,1)/1000,end=Date.UTC(year,0,1)/1000;
            const prior=await provider(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(resolvedSymbol)}?interval=1d&period1=${start}&period2=${end}`);
            const h=prior.chart?.result?.[0];
            const candidates=(h?.timestamp||[]).flatMap((t,i)=>{const close=h.indicators?.quote?.[0]?.close?.[i];const date=new Intl.DateTimeFormat('en-CA',{timeZone:meta.exchangeTimezoneName||'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t*1000));return finite(close)&&close>0&&date>=`${year-1}-12-01`&&date<`${year}-01-01`?[{date,close}]:[];});
            returnBaseline=candidates.sort((a,b)=>a.date.localeCompare(b.date)).at(-1)||null;
          }catch{ /* Never substitute the first January close for a missing year-end baseline. */ }
        }
        // Long-range chartPreviousClose can refer to the start of the window,
        // not the previous trading session. Resolve daily metadata when needed.
        let dailyMeta = meta;
        if (range !== '1d' && !finite(meta.previousClose) && !finite(meta.regularMarketChangePercent)) {
          try { dailyMeta = (await chart(resolvedSymbol, '1d')).meta || {}; }
          catch { dailyMeta = {}; }
        }
        const price = finite(dailyMeta.regularMarketPrice) ? dailyMeta.regularMarketPrice
          : finite(meta.regularMarketPrice) ? meta.regularMarketPrice : candles.at(-1).close;
        const previousClose = finite(dailyMeta.previousClose) && dailyMeta.previousClose > 0 ? dailyMeta.previousClose
          : finite(dailyMeta.regularMarketChangePercent) && dailyMeta.regularMarketChangePercent > -100
            ? price / (1 + dailyMeta.regularMarketChangePercent / 100)
            : (range === '1d' || dailyMeta !== meta) && finite(dailyMeta.chartPreviousClose) && dailyMeta.chartPreviousClose > 0
              ? dailyMeta.chartPreviousClose : null;
        if (range === '1d' && previousClose !== null) returnBaseline = { date: 'Previous session close', close: previousClose };
        const marketTime = dailyMeta.regularMarketTime ?? meta.regularMarketTime;
        const marketDate = new Date(marketTime * 1000);
        body = { symbol: resolvedSymbol, name: meta.longName || meta.shortName || resolvedSymbol,
          currency: meta.currency || 'USD', exchange: meta.fullExchangeName || meta.exchangeName || '',
          instrumentType: meta.instrumentType || 'EQUITY', price, previousClose,
          change: previousClose === null ? null : price - previousClose, changePercent: previousClose === null ? null : (price / previousClose - 1) * 100,
          marketTime: finite(marketTime) && finite(marketDate.getTime()) ? marketDate.toISOString() : null,
          fiftyTwoWeekHigh: finite(meta.fiftyTwoWeekHigh) ? meta.fiftyTwoWeekHigh : null,
          fiftyTwoWeekLow: finite(meta.fiftyTwoWeekLow) ? meta.fiftyTwoWeekLow : null,
          source: 'Yahoo Finance (unofficial)', sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(resolvedSymbol)}/history/`,
          fetchedAt: new Date(now()).toISOString(), isSnapshot: false, range, interval: rangeIntervals[range], candles, indicatorHistory, indicatorHistoryUnavailable, returnBaseline };
      }
      if (cache.size >= 300) cache.delete(cache.keys().next().value);
      cache.set(key, { body, expires: now() + cacheTtlMs });
      return json(body);
    } catch (error) {
      if (error.status === 404) return json({ error: `No market data found for ${symbol}. Search by company name to find the exchange-specific ticker.` }, 404);
      if (error.status === 429) return json({ error: 'The data provider is rate limiting requests. Please retry in a minute.' }, 429);
      return json({ error: 'The market data provider is temporarily unavailable. Please retry shortly.' }, 503);
    }
  };
}

export const handleApi = createApiHandler();


