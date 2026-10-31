import test from 'node:test';
import assert from 'node:assert/strict';
import {createCsvExport} from './csv.mjs';
import {normalizeHistory} from './server/history.mjs';

test('CSV contains only primary candles, preserves precision and leaves missing prices blank',()=>{
 const result=createCsvExport({symbol:'^GSPC',interval:'15m',candles:[{date:'2026-10-30T13:30:00.000Z',open:null,high:1.234567,low:null,close:1.2,volume:0}],indicatorHistory:[{date:'2026-10-20',close:10}]},'5d');
 assert.equal(result.csv,'timestamp_utc,open,high,low,close,volume\r\n2026-10-30T13:30:00.000Z,,1.234567,,1.2,0\r\n');
 assert.equal(result.rowCount,1);assert.equal(result.filename,'GSPC-5d-15m-2026-10-30-to-2026-10-30.csv');
});

test('five sessions are counted in exchange time, including sessions crossing UTC midnight',()=>{
 const timestamps=Array.from({length:6},(_,i)=>[Date.UTC(2026,9,20+i,23,30)/1000,Date.UTC(2026,9,21+i,0,30)/1000]).flat();
 const result={meta:{exchangeTimezoneName:'America/New_York'},timestamp:timestamps,indicators:{quote:[{close:Array(12).fill(10)}]}};
 const bars=normalizeHistory(result,'5d','15m');assert.equal(bars.length,10);
 assert.equal(bars[0].date,'2026-10-21T23:30:00.000Z');
 assert.equal(bars.at(-1).date,'2026-10-26T00:30:00.000Z');
});

test('daily rows use exchange dates, sort and deduplicate without inventing missing sessions',()=>{
 const result={meta:{exchangeTimezoneName:'Asia/Tokyo'},timestamp:[Date.parse('2026-10-30T00:00:00Z')/1000,Date.parse('2026-10-28T23:30:00Z')/1000,Date.parse('2026-10-30T00:00:00Z')/1000],indicators:{quote:[{close:[12,10,13]}]}};
 assert.deepEqual(normalizeHistory(result,'max','1d').map(c=>[c.date,c.close]),[['2026-10-29',10],['2026-10-30',13]]);
});

test('MAX exports all daily rows and rejects monthly or snapshot substitutes',()=>{
 const candles=Array.from({length:25000},(_,i)=>({date:new Date(Date.UTC(1927,0,1)+i*86400000).toISOString().slice(0,10),close:100+i/100}));
 const data={symbol:'IBM',interval:'1d',candles};
 const output=createCsvExport(data,'max');assert.equal(output.rowCount,25000);assert.equal(output.csv.trim().split('\r\n').length,25001);
 assert.ok(output.csv.includes('1927-01-01'));assert.ok(output.csv.includes(candles.at(-1).date));
 assert.throws(()=>createCsvExport({...data,interval:'1mo'},'max'),/Full daily history/);
 assert.throws(()=>createCsvExport({...data,isSnapshot:true},'max'),/Full daily history/);
 assert.match(createCsvExport({...data,isSnapshot:true},'1y').filename,/-snapshot-/);
});
