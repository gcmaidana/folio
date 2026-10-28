import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {handleApi} from './server/market.mjs';
export default defineConfig({base:'./',plugins:[react(),{name:'folio-local-api',configureServer(server){server.middlewares.use(async(req,res,next)=>{if(!req.url?.startsWith('/api/'))return next();try{const response=await handleApi(new Request(new URL(req.url,'http://localhost')));res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));res.end(await response.text());}catch{res.statusCode=500;res.end(JSON.stringify({error:'Local data service failed.'}));}})}}]});
