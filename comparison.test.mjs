import test from 'node:test';
import assert from 'node:assert/strict';
import {comparePerformance} from './comparison.mjs';
test('comparison rebases both series at the same first shared observation',()=>{
 const a=[{date:'2026-01-01',close:50},{date:'2026-01-02',close:100},{date:'2026-01-03',close:500},{date:'2026-01-04',close:120}];
 const b=[{date:'2026-01-02',close:200},{date:'2026-01-04',close:220},{date:'2026-01-05',close:600}];
 const r=comparePerformance(a,b);assert.equal(r.points.length,2);assert.equal(r.points[0].performance,0);assert.equal(r.points[0].benchmark,0);assert.ok(Math.abs(r.assetReturn-20)<1e-8);assert.ok(Math.abs(r.difference-10)<1e-8);assert.equal(r.end,'2026-01-04');
});
test('monthly comparisons align months; missing overlap is not fabricated',()=>{
 const a=[{date:'2025-01-02',close:10},{date:'2025-02-03',close:11}];
 const b=[{date:'2025-01-01',close:20},{date:'2025-02-01',close:18}];
 assert.equal(comparePerformance(a,b),null);assert.ok(comparePerformance(a,b,'1mo'));
 assert.equal(comparePerformance([{date:'x',close:NaN}],[]),null);
});

test('YTD comparisons use each previous year-end price rather than the first shared January close',()=>{
 const a=[{date:'2026-01-02',close:110},{date:'2026-10-21',close:120}];
 const b=[{date:'2026-01-02',close:190},{date:'2026-10-21',close:220}];
 const options={range:'ytd',assetBaseline:{date:'2025-12-31',close:100},benchmarkBaseline:{date:'2025-12-31',close:200}};
 const result=comparePerformance(a,b,'1d',options);
 assert.ok(Math.abs(result.assetReturn-20)<1e-8);assert.ok(Math.abs(result.benchmarkReturn-10)<1e-8);
 assert.ok(Math.abs(result.points[0].performance-10)<1e-8);
 assert.equal(comparePerformance(a,b,'1d',{range:'ytd'}),null);
});


test('daily comparison includes overnight gaps even when intraday prices rise',()=>{
 const asset=[{date:'2026-10-30T14:00:00Z',close:98},{date:'2026-10-30T15:00:00Z',close:98.23}];
 const benchmark=asset.map(c=>({...c,close:101}));
 const result=comparePerformance(asset,benchmark,'5m',{range:'1d',assetBaseline:{date:'Previous session close',close:100},benchmarkBaseline:{date:'Previous session close',close:100}});
 assert.ok(Math.abs(result.assetReturn+1.77)<1e-10);
 assert.ok(Math.abs(result.benchmarkReturn-1)<1e-10);
 assert.equal(comparePerformance(asset,benchmark,'5m',{range:'1d'}),null);
});
