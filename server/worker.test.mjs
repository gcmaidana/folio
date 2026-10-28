import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
const env={ALLOWED_ORIGINS:'https://example.github.io'};
test('worker allows configured GitHub origin and handles preflight',async()=>{
 const r=await worker.fetch(new Request('https://api.example/api/search',{method:'OPTIONS',headers:{Origin:'https://example.github.io'}}),env);
 assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://example.github.io');
});
test('worker rejects unrelated origins and unsupported methods',async()=>{
 assert.equal((await worker.fetch(new Request('https://api.example/api/search',{headers:{Origin:'https://other.example'}}),env)).status,403);
 assert.equal((await worker.fetch(new Request('https://api.example/api/search',{method:'POST'}),env)).status,405);
});
test('worker keeps CORS headers on API validation errors',async()=>{
 const r=await worker.fetch(new Request('https://api.example/api/search?q=',{headers:{Origin:'https://example.github.io'}}),env);
 assert.equal(r.status,400);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://example.github.io');
});
