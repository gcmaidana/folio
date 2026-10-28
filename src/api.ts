export const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const apiConfigured = import.meta.env.DEV || /^https:\/\//.test(apiBase);
export async function apiRequest(path:string, signal?:AbortSignal){
 if(!apiConfigured) throw new Error('Data connection not configured. Follow the README to deploy the free API proxy and set VITE_API_BASE_URL before building.');
 const response=await fetch(`${apiBase}${path}`,{signal});
 let body:any;try{body=await response.json()}catch{throw new Error('The data service returned an invalid response. Check the API URL configuration.');}
 if(!response.ok)throw new Error(body.error||`Data service returned HTTP ${response.status}.`);
 return body;
}
