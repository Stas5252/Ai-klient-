import {beforeEach,afterAll,it,expect} from 'vitest';
import {Miniflare} from 'miniflare';
import {readFileSync} from 'node:fs';
import {Store} from '../src/storage';
import {run} from '../src/scheduler';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});
let s:Store;let env:any;
beforeEach(async()=>{const db=await mf.getD1Database('DB');await db.exec(readFileSync('migrations/0001.sql','utf8').replace(/\n/g,' '));await db.batch(['events','outreach_queue','leads','outbox','leases','quotas','source_state','inbox','inbound_sessions','audit_jobs'].map(t=>db.prepare(`DELETE FROM ${t}`)));await db.prepare("DELETE FROM settings").run();s=new Store(db as any);env={DB:db,MAX_SOURCE_REQUESTS_DAY:'20'};});
afterAll(()=>mf.dispose());
function feed(now:number){return `<rss><channel><item><title>Разработка сайта доставки</title><description>Нужен каталог и корзина, бюджет 3 000 ₽</description><link>https://example.com/a</link><pubDate>${new Date(now).toUTCString()}</pubDate></item></channel></rss>`;}
const f=(now:number)=>async(u:any)=>new Response(String(u).includes('robots.txt')?'User-agent: *\nAllow: /':feed(now),{headers:{'Content-Type':'application/xml'}});
it('real pipeline collector to durable CRM with budget',async()=>{const now=Date.now();const r=await run(env,now,f(now) as any);expect(r.state).toBe('ok');expect(r.inserted).toBe(1);expect((await s.list())[0].budget).toBe(3000);expect((await s.db.prepare('SELECT * FROM outreach_queue').all()).results).toHaveLength(1);});
it('restarting scheduler preserves uniqueness',async()=>{const now=Date.now();await run(env,now,f(now) as any);await run(env,now+3600001,f(now) as any);expect(await s.list()).toHaveLength(1);});
it('source daily quota skips fetch entirely',async()=>{let n=0;const r=await run({...env,MAX_SOURCE_REQUESTS_DAY:'0'},Date.now(),async()=>{n++;return new Response('');});expect(n).toBe(0);expect(r.state).toBe('quota_exhausted');});
it('source outage enters persistent backoff',async()=>{const now=Date.now();await run(env,now,async()=>new Response('',{status:503}));const st=await s.db.prepare('SELECT * FROM source_state').first<any>();expect(st.failures).toBe(1);expect(st.next_run).toBeGreaterThan(now);expect(st.error).toBe('http_503');});
it('pause prevents source and audit requests',async()=>{await s.set('paused','1');let n=0;const r=await run(env,Date.now(),async()=>{n++;return new Response('');});expect(n).toBe(0);expect(r.state).toBe('paused');});
it('global budget charges every robots/feed HTTP attempt',async()=>{const now=Date.now();let n=0;const r=await run({...env,MAX_SOURCE_REQUESTS_DAY:'1'},now,async(u:any)=>{n++;return f(now)(u);});expect(n).toBe(1);expect(r.inserted).toBe(0);});
