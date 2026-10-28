import {handleApi} from './market.mjs';
export default {async fetch(request,env){
 const origin=request.headers.get('Origin');
 const allowed=(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim());
 const headers={'Vary':'Origin','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
 if(origin&&!allowed.includes(origin))return Response.json({error:'This website origin is not configured for the data API.'},{status:403});
 if(origin)headers['Access-Control-Allow-Origin']=origin;
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405,headers});
 const result=await handleApi(request);
 const response=new Response(result.body,result);Object.entries(headers).forEach(([k,v])=>response.headers.set(k,v));return response;
}};
