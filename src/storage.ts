import type {Lead} from './types';
import {keyFor,hash} from './deduplicator';
export class Store {
 constructor(public db:D1Database){}
 async get(key:string,fallback='0'):Promise<string>{return (await this.db.prepare('SELECT value FROM settings WHERE key=?').bind(key).first<{value:string}>())?.value??fallback;}
 async set(key:string,value:string){await this.db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,value).run();}
 async leadStatement(l:Lead):Promise<D1PreparedStatement>{l.contentKey=await keyFor(l);l.id=(await hash(l.url)).slice(0,24);return this.db.prepare('INSERT OR IGNORE INTO leads(id,content_key,url,source_id,category,priority,score,status,discovered_at,published_at,checked_at,do_not_contact,payload) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(l.id,l.contentKey,l.url,l.sourceId,l.category,l.priority,l.score,l.status,l.discoveredAt,l.publishedAt,l.checkedAt,l.doNotContact?1:0,JSON.stringify(l));}
 async insertLead(l:Lead):Promise<boolean>{const statement=await this.leadStatement(l);const rows=await this.db.batch([statement,this.db.prepare('INSERT OR IGNORE INTO outreach_queue(lead_id,draft,updated_at) SELECT id,?,? FROM leads WHERE id=?').bind(l.message,Date.now(),l.id)]);if(rows[0].meta.changes){await this.db.prepare('INSERT INTO events(lead_id,type,detail,created_at) VALUES(?,?,?,?)').bind(l.id,'found','',Date.now()).run();return true;}return false;}
 decode(row:any):Lead {return {...JSON.parse(row.payload),status:row.status,doNotContact:Boolean(row.do_not_contact)};}
 async getLead(id:string):Promise<Lead|null>{const r=await this.db.prepare('SELECT * FROM leads WHERE id=?').bind(id).first();return r?this.decode(r):null;}
 async list(category?:string,limit=10):Promise<Lead[]>{const q=category==='new'?'WHERE status=\'new\'':category?'WHERE category=?':'';const s=this.db.prepare(`SELECT * FROM leads ${q} ORDER BY score DESC,discovered_at DESC LIMIT ?`);const r=await (category&&category!=='new'?s.bind(category,limit):s.bind(limit)).all();return r.results.map(x=>this.decode(x));}
 async setStatus(id:string,status:string){await this.db.batch([this.db.prepare('UPDATE leads SET status=? WHERE id=?').bind(status,id),this.db.prepare('INSERT INTO events(lead_id,type,detail,created_at) VALUES(?,?,?,?)').bind(id,status,'owner',Date.now())]);}
 async suppress(id:string){await this.db.batch([this.db.prepare('UPDATE leads SET do_not_contact=1,status=? WHERE id=?').bind('hidden',id),this.db.prepare('UPDATE outreach_queue SET status=? WHERE lead_id=?').bind('blocked',id)]);}
 async lease(key:string,owner:string,now:number,ttl:number):Promise<boolean>{const r=await this.db.prepare('INSERT INTO leases(key,owner,expires_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE leases.expires_at<?').bind(key,owner,now+ttl,now).run();return (r.meta.changes??0)>0;}
 async release(key:string,owner:string){await this.db.prepare('DELETE FROM leases WHERE key=? AND owner=?').bind(key,owner).run();}
 async consume(key:string,max:number):Promise<boolean>{const r=await this.db.prepare('INSERT INTO quotas(key,used) SELECT ?,1 WHERE ?>0 ON CONFLICT(key) DO UPDATE SET used=used+1 WHERE used<?').bind(key,max,max).run();return (r.meta.changes??0)>0;}
 enqueueStatement(id:string,chat:string,text:string,keyboard?:unknown,subjectContact?:string):D1PreparedStatement{return this.db.prepare('INSERT OR IGNORE INTO outbox(id,chat_id,text,keyboard,created_at,subject_contact) VALUES(?,?,?,?,?,?)').bind(id,chat,text.slice(0,3900),keyboard?JSON.stringify(keyboard):null,Date.now(),subjectContact??null);}
 async enqueue(id:string,chat:string,text:string,keyboard?:unknown,subjectContact?:string){await this.enqueueStatement(id,chat,text,keyboard,subjectContact).run();}
 async error(type:string){await this.db.prepare('INSERT INTO events(type,detail,created_at) VALUES(?,?,?)').bind('error',type.slice(0,80),Date.now()).run();}
}
