import {useEffect,useState} from 'react';
import {getFundamentals} from './fundamentals';

type Props = {symbol:string; fallback:string; className:string};

export default function CompanyLogo({symbol,fallback,className}:Props){
 // Remount on symbol changes so a previous company's image is never shown.
 return <LogoTile key={symbol} symbol={symbol} fallback={fallback} className={className}/>;
}

function LogoTile({symbol,fallback,className}:Props){
 const [status,setStatus]=useState<'loading'|'ready'|'failed'>('loading');
 const [logo,setLogo]=useState<{url:string;theme:string}|null>(null);
 useEffect(()=>{
  let active=true;
  if(!symbol.startsWith('^')&&!symbol.includes('=')&&!symbol.endsWith('-USD')){
   getFundamentals(symbol).then(data=>{if(active&&data.symbol===symbol&&data.logoUrl)setLogo({url:data.logoUrl,theme:data.logoTheme})}).catch(()=>{});
  }
  return()=>{active=false};
 },[symbol]);
 const ready=!!logo&&status==='ready';
 return <span className={`${className} company-logo${ready?' has-logo':''}${logo?.theme==='dark'?' logo-dark':''}`} aria-hidden="true">
  <span className="company-logo-fallback">{fallback}</span>
  {logo&&status!=='failed'&&<img
   src={logo.url}
   alt="" width={32} height={32} decoding="async" referrerPolicy="no-referrer"
   onLoad={event=>setStatus(event.currentTarget.naturalWidth>1&&event.currentTarget.naturalHeight>1?'ready':'failed')}
   onError={()=>setStatus('failed')}
  />}
 </span>;
}
