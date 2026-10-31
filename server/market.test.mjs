import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiHandler } from './market.mjs';

const request = path => new Request(`https://folio.example${path}`);
const chart = symbol => ({ chart: { result: [{ meta: { symbol, longName: 'Provider company', currency: 'INR', previousClose: 10 },
  timestamp: [1700000000, 1700086400, 1700172800],
  indicators: { quote: [{ open: [null, 12, 1], high: [null, 14, 2], low: [null, 11, 1], close: [10, 13, null], volume: [null, 123, 999] }] } }] } });

test('arbitrary global symbols go directly to the provider, including ampersands and exchange suffixes', async () => {
  for (const symbol of ['M&M.NS', '7203.T', 'NOVO-B.CO', '0700.HK', 'VOD.L', 'EURUSD=X', '^GSPC', 'NEWCO']) {
    const handler = createApiHandler({ fetchImpl: async url => {
      assert.equal(decodeURIComponent(new URL(url).pathname.split('/').at(-1)), symbol);
      return Response.json(chart(symbol));
    } });
    const response = await handler(request(`/api/market?symbol=${encodeURIComponent(symbol)}`));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).symbol, symbol);
  }
});

test('company names search the provider and retain international results', async () => {
  const handler = createApiHandler({ fetchImpl: async url => {
    assert.equal(new URL(url).searchParams.get('q'), 'Mahindra & Mahindra');
    return Response.json({ quotes: [{ symbol: 'M&M.NS', longname: 'Mahindra & Mahindra Limited', exchDisp: 'NSE', quoteType: 'EQUITY' }, { name: 'news story' }] });
  } });
  const result = await handler(request('/api/search?q=Mahindra%20%26%20Mahindra'));
  assert.deepEqual(await result.json(), { results: [{ symbol: 'M&M.NS', name: 'Mahindra & Mahindra Limited', exchange: 'NSE', type: 'EQUITY' }] });
});

test('class punctuation aliases resolve through provider search without a symbol list', async () => {
  const calls = [];
  const handler = createApiHandler({ fetchImpl: async url => {
    calls.push(url);
    if (url.includes('/search?')) return Response.json({ quotes: [{ symbol: 'ARBITRARY-B', shortname: 'Any class B' }] });
    if (url.includes('ARBITRARY.B')) return new Response(null, { status: 404 });
    return Response.json(chart('ARBITRARY-B'));
  } });
  const response = await handler(request('/api/market?symbol=ARBITRARY.B'));
  assert.equal((await response.json()).symbol, 'ARBITRARY-B');
  assert.equal(calls.length, 3);
});

test('missing OHLC retains valid closing prices and skips null closes', async () => {
  const handler = createApiHandler({ fetchImpl: async () => Response.json(chart('FUND')) });
  const response = await handler(request('/api/market?symbol=FUND'));
  const body = await response.json();
  assert.equal(body.candles.length, 2);
  assert.deepEqual(body.candles[0], { date: '2023-11-14', open: null, high: null, low: null, close: 10, volume: null });
  assert.equal(body.previousClose, 10);
  assert.equal(body.price, 13);
});

test('invalid input never reaches the provider', async () => {
  const handler = createApiHandler({ fetchImpl: async () => { throw new Error('Must not fetch'); } });
  for (const path of ['/api/market?symbol=../../etc', '/api/market?symbol=AAPL&range=bad', '/api/search?q=%00hello', '/api/search?q=', `/api/search?q=${'a'.repeat(101)}`]) {
    assert.equal((await handler(request(path))).status, 400);
  }
});

test('rate limits remain distinguishable from symbol-not-found errors', async () => {
  for (const path of ['/api/search?q=test', '/api/market?symbol=ANYTHING']) {
    const handler = createApiHandler({ fetchImpl: async () => new Response(null, { status: 429 }) });
    const result = await handler(request(path));
    assert.equal(result.status, 429);
    assert.match((await result.json()).error, /rate limiting/);
  }
});

test('successful results are cached and expire', async () => {
  let clock = 1700000000000, count = 0;
  const handler = createApiHandler({ now: () => clock, cacheTtlMs: 100, fetchImpl: async () => { count++; return Response.json(chart('XYZ')); } });
  await handler(request('/api/market?symbol=XYZ'));
  await handler(request('/api/market?symbol=XYZ'));
  assert.equal(count, 1);
  clock += 101;
  await handler(request('/api/market?symbol=XYZ'));
  assert.equal(count, 2);
});

test('provider timeout returns unavailable rather than fake history', async () => {
  const handler = createApiHandler({ timeoutMs: 5, fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Timeout')), { once: true });
  }) });
  assert.equal((await handler(request('/api/market?symbol=XYZ'))).status, 503);
});

test('unknown symbols and empty searches do not invent results', async () => {
  const handler = createApiHandler({ fetchImpl: async url => url.includes('/search?') ? Response.json({ quotes: [] }) : new Response(null, { status: 404 }) });
  assert.equal((await handler(request('/api/market?symbol=DOESNOTEXIST'))).status, 404);
  assert.deepEqual(await (await handler(request('/api/search?q=DOESNOTEXIST'))).json(), { results: [] });
});


test('each chart range requests the matching provider interval and preserves intraday timestamps', async () => {
 const expected={'1d':'5m','5d':'15m','1mo':'1d','6mo':'1d','ytd':'1d','1y':'1d','5y':'1d','max':'1mo'};
 for(const [range,interval] of Object.entries(expected)){
  const handler=createApiHandler({fetchImpl:async url=>{const u=new URL(url);if(range==='max'){assert.equal(u.searchParams.get('period1'),'0');assert.ok(Number(u.searchParams.get('period2'))>0)}else assert.equal(u.searchParams.get('range'),range);assert.equal(u.searchParams.get('interval'),interval);return Response.json(chart('TEST'));}});
  const r=await handler(new Request(`https://example.com/api/market?symbol=TEST&range=${range}`));
  assert.equal(r.status,200);const data=await r.json();assert.equal(data.interval,interval);
  assert.equal(data.candles[0].date.includes('T'),range==='1d'||range==='5d');
 }
});


test('SMA history is separate from the visible range and unavailable history does not break prices',async()=>{
 const first=1700000000;
 const handler=createApiHandler({fetchImpl:async url=>{
  if(new URL(url).searchParams.has('period1'))return Response.json({chart:{result:[{timestamp:Array.from({length:220},(_,i)=>first-(220-i)*86400),indicators:{quote:[{close:Array.from({length:220},(_,i)=>100+i)}]}}]}});
  return Response.json(chart('TEST'));
 }});
 const data=await (await handler(new Request('https://local/api/market?symbol=TEST&range=1mo&warmup=1'))).json();
 assert.equal(data.candles.length,2);assert.equal(data.indicatorHistory.length,199);
 assert.ok(data.indicatorHistory.every(c=>c.date<data.candles[0].date));
 assert.equal(data.indicatorHistoryUnavailable,false);
 const failed=createApiHandler({fetchImpl:async url=>new URL(url).searchParams.has('period1')?new Response('',{status:429}):Response.json(chart('TEST'))});
 const fallback=await (await failed(new Request('https://local/api/market?symbol=TEST&range=1mo&warmup=1'))).json();
 assert.equal(fallback.candles.length,2);assert.equal(fallback.indicatorHistoryUnavailable,true);
});

test('cashtags normalize for search and charts and exact matches outrank ETFs',async()=>{
 for(const ticker of ['GOOG','XYZ','7203.T']){
  const handler=createApiHandler({fetchImpl:async url=>{
   const u=new URL(url);
   if(u.pathname.includes('/search')){assert.equal(u.searchParams.get('q'),ticker);return Response.json({quotes:[{symbol:ticker+'ETF',quoteType:'ETF'},{symbol:ticker,quoteType:'EQUITY'},{symbol:'OTHER',quoteType:'EQUITY'}]});}
   assert.equal(decodeURIComponent(u.pathname.split('/').at(-1)),ticker);return Response.json(chart(ticker));
  }});
  const found=await (await handler(request('/api/search?q='+encodeURIComponent(' $'+ticker+' ')))).json();
  assert.equal(found.results[0].symbol,ticker);assert.equal(found.results[0].type,'EQUITY');
  assert.equal((await handler(request('/api/market?symbol='+encodeURIComponent('$'+ticker)))).status,200);
 }
});

test('YTD API returns last December close separately from visible January bars',async()=>{
 const handler=createApiHandler({now:()=>Date.UTC(2026,9,21),fetchImpl:async url=>{
  const u=new URL(url);const prior=u.searchParams.has('period1');
  if(prior){assert.equal(Number(u.searchParams.get('period1')),Date.UTC(2025,11,1)/1000);assert.equal(Number(u.searchParams.get('period2')),Date.UTC(2026,0,1)/1000);}
  const dates=prior?['2025-12-30T21:00:00Z','2025-12-31T21:00:00Z']:['2026-01-02T21:00:00Z','2026-10-21T14:00:00Z'];
  return Response.json({chart:{result:[{meta:{symbol:'TEST',exchangeTimezoneName:'America/New_York'},timestamp:dates.map(d=>Date.parse(d)/1000),indicators:{quote:[{close:prior?[99,100]:[110,120]}]}}]}});
 }});
 const data=await (await handler(request('/api/market?symbol=TEST&range=ytd'))).json();
 assert.deepEqual(data.returnBaseline,{date:'2025-12-31',close:100});assert.equal(data.candles[0].date,'2026-01-02');
});


test('daily change includes overnight movement instead of the last intraday bar', async () => {
 const handler=createApiHandler({fetchImpl:async()=>{
  const payload=chart('^GSPC');const result=payload.chart.result[0];
  result.meta={symbol:'^GSPC',regularMarketPrice:98.23,previousClose:100};
  result.indicators.quote[0].close=[98.8,98.23,null];
  return Response.json(payload);
 }});
 const data=await (await handler(request('/api/market?symbol=^GSPC&range=1d'))).json();
 assert.ok(Math.abs(data.changePercent+1.77)<1e-10);
 assert.equal(data.previousClose,100);
 assert.equal(data.returnBaseline.close,100);
});

test('long-range daily change uses daily metadata, not a window baseline or monthly bar', async () => {
 const handler=createApiHandler({fetchImpl:async url=>{
  const payload=chart('TEST');const daily=new URL(url).searchParams.get('range')==='1d';
  payload.chart.result[0].meta={symbol:'TEST',regularMarketPrice:98.23,chartPreviousClose:daily?100:50};
  return Response.json(payload);
 }});
 const data=await (await handler(request('/api/market?symbol=TEST&range=max'))).json();
 assert.equal(data.previousClose,100);
 assert.ok(Math.abs(data.changePercent+1.77)<1e-10);
});

test('missing daily baseline stays unavailable rather than using an intraday bar', async () => {
 const handler=createApiHandler({fetchImpl:async()=>{
  const payload=chart('TEST');payload.chart.result[0].meta={symbol:'TEST'};
  return Response.json(payload);
 }});
 const data=await (await handler(request('/api/market?symbol=TEST&range=1d'))).json();
 assert.equal(data.previousClose,null);assert.equal(data.changePercent,null);
 assert.equal(data.change,null);assert.equal(data.returnBaseline,null);
});
