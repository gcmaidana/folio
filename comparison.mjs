/** Compare price returns only at common observations; never fill missing sessions. */
export function comparePerformance(asset, benchmark, interval='1d', options={}) {
 const key=date=>interval==='1mo'?date.slice(0,7):date;
 const valid=c=>c&&typeof c.close==='number'&&Number.isFinite(c.close)&&c.close>0;
 const reference=new Map(benchmark.filter(valid).map(c=>[key(c.date),c]));
 const shared=asset.filter(valid).filter(c=>reference.has(key(c.date))).sort((a,b)=>a.date.localeCompare(b.date));
 if(shared.length<(options.range==='ytd'?1:2))return null;
 if(options.range==='ytd'&&(!valid(options.assetBaseline)||!valid(options.benchmarkBaseline)))return null;
 const first=shared[0],assetBase=options.range==='ytd'?options.assetBaseline.close:first.close,base=options.range==='ytd'?options.benchmarkBaseline.close:reference.get(key(first.date)).close;
 const points=shared.map(c=>({...c,performance:(c.close/assetBase-1)*100,benchmark:(reference.get(key(c.date)).close/base-1)*100}));
 const last=points.at(-1);
 return {points,start:options.range==='ytd'?options.assetBaseline.date:first.date,end:last.date,assetReturn:last.performance,benchmarkReturn:last.benchmark,difference:last.performance-last.benchmark};
}
