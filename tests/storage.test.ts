import {beforeEach,afterAll,describe,it,expect} from 'vitest';
import {Miniflare} from 'miniflare';
import {readFileSync} from 'node:fs';
import {Store} from '../src/storage';
import {qualify} from '../src/validator';
import {sources} from '../src/source_registry';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});
let db:D1Database;let store:Store;
beforeEach(async()=>{db=await mf.getD1Database('DB') as unknown as D1Database;await db.exec(readFileSync('migrations/0001.sql','utf8').replace(/\n/g,' '));await db.batch(['events','outreach_queue','leads','outbox','leases','quotas','inbox','inbound_sessions','suppression'].map(t=>db.prepare(`DELETE FROM ${t}`)));store=new Store(db);});
afterAll(()=>mf.dispose());
const lead=()=>qualify({title:'Нужен сайт',text:'Нужен каталог товаров',url:'https://example.com/order',sourceId:'test',publishedAt:Date.now()},sources[0])!;
describe('persistent storage',()=>{
 it('only one lead across repeated and cross-source runs',async()=>{expect(await store.insertLead(lead())).toBe(true);expect(await store.insertLead({...lead(),url:'https://mirror.example/order',sourceId:'mirror'})).toBe(false);expect((await store.list()).length).toBe(1);});
 it('parallel duplicates converge',async()=>{const r=await Promise.all([store.insertLead(lead()),store.insertLead(lead())]);expect(r.filter(Boolean)).toHaveLength(1);});
 it('status and history survive new Store instance',async()=>{await store.insertLead(lead());const l=(await store.list())[0];await store.setStatus(l.id,'paid');expect((await new Store(db).getLead(l.id))?.status).toBe('paid');expect((await db.prepare('SELECT * FROM events WHERE type=?').bind('paid').all()).results.length).toBe(1);});
 it('lease recovers after expiry',async()=>{expect(await store.lease('run','one',1000,10)).toBe(true);expect(await store.lease('run','two',1005,10)).toBe(false);expect(await store.lease('run','two',1011,10)).toBe(true);});
 it('quota stops without overshoot',async()=>{expect(await store.consume('day',2)).toBe(true);expect(await store.consume('day',2)).toBe(true);expect(await store.consume('day',2)).toBe(false);});
 it('notification keyed by update cannot duplicate',async()=>{await store.enqueue('one','123','hello');await store.enqueue('one','123','hello');expect((await db.prepare('SELECT * FROM outbox').all()).results.length).toBe(1);});
});
