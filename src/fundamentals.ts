import {apiRequest} from './api';

// Share requests between the snapshot and logo tiles; navigating never refetches per tile.
const cache=new Map<string,{expires:number;request:Promise<any>}>();
export function getFundamentals(symbol:string):Promise<any>{
 const existing=cache.get(symbol);
 if(existing&&existing.expires>Date.now())return existing.request;
 const request=apiRequest('/api/fundamentals?symbol='+encodeURIComponent(symbol));
 if(cache.size>=100)cache.delete(cache.keys().next().value!);
 cache.set(symbol,{expires:Date.now()+60000,request});
 request.catch(()=>{if(cache.get(symbol)?.request===request)cache.delete(symbol)});
 return request;
}
