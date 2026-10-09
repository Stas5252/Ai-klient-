import type {Env,Fetcher,Lead,Source} from './types';
import {Store} from './storage';
import {sources} from './source_registry';
import {collectSource,sourceAuthorizationError} from './collector_dispatch';
import {qualify} from './validator';
import {getText,HttpFailure} from './http';
import {audit,robotsAllow} from './website_auditor';
import {flush,card,buttons,handleUpdate} from './telegram_bot';
import {buildMessage} from './message_builder';
import {report} from './analytics';
import {keyFor,hash} from './deduplicator';
import {critical} from './monitoring';
import {budgetedFetch,sourceRequestLimit} from './request_budget';
import {isFreshFreeLead,freshWindowMs} from './freshness';
export async function drainInbox(s:Store,env:Env){const owner=crypto.randomUUID();if(!await s.lease('inbox',owner,Date.now(),60000))return;try{const rows=await s.db.prepare("SELECT id,payload FROM inbox WHERE status='pending' ORDER BY id LIMIT 5").all<{id:number;payload:string}>();for(const row of rows.results){await handleUpdate(s,env,JSON.parse(row.payload));await s.db.prepare("UPDATE inbox SET status='done' WHERE id=?").bind(row.id).run();}}finally{await s.release('inbox',owner);}}
export interface RunSummary {inspected:number;qualified:number;inserted:number;rejected:number;audits:number;notifications:number;state:string;}
export async function run(env:Env,now=Date.now(),fetcher:Fetcher=fetch,configuredSources:Source[]=sources):Promise<RunSummary>{const s=new Store(env.DB),owner=crypto.randomUUID();const result:RunSummary={inspected:0,qualified:0,inserted:0,rejected:0,audits:0,notifications:0,state:'ok'};if(!await s.lease('scheduler',owner,now,240000)){result.state='already_running';return result;}
 try{fetcher=budgetedFetch(s,env,fetcher);await s.set('last_tick',new Date(now).toISOString());await drainInbox(s,env);if(await s.get('paused')==='1'){result.state='paused';result.notifications=await flush(s,env,fetcher);return result;}
  const day=new Date(now).toISOString().slice(0,10);const max=sourceRequestLimit(env);
  for(const source of configuredSources.filter(x=>x.enabled&&x.policy==='monitor'&&x.kind!=='telegram')){
   const st=await s.db.prepare('SELECT * FROM source_state WHERE id=?').bind(source.id).first<any>();if(st?.enabled===0||st?.next_run>now)continue;
   const authorization=sourceAuthorizationError(source,env);
   if(authorization){await s.db.prepare('INSERT INTO source_state(id,last_checked,next_run,failures,error) VALUES(?,?,?,0,?) ON CONFLICT(id) DO UPDATE SET last_checked=excluded.last_checked,next_run=excluded.next_run,failures=0,error=excluded.error').bind(source.id,now,now+source.intervalMinutes*60000,authorization).run();continue;}
   if(max===0){result.state='quota_exhausted';await critical(s,env,'source_daily_quota');break;}
   try{if(source.kind==='rss'||source.kind==='fl'){const robots=await getText(new URL('/robots.txt',source.url).toString(),fetcher,1);if((robots.status!==200&&robots.status!==404)||robots.status===200&&!robotsAllow(robots.text,source.url))throw new HttpFailure('robots_denied');}
    const items=await collectSource(source,env,fetcher,now);result.inspected+=items.length;const leads=items.map(x=>x.isFreeReply===false?null:qualify(x,source,now)).filter((l):l is Lead=>Boolean(l)&&isFreshFreeLead(l!,now,env));result.qualified+=leads.length;result.rejected+=items.length-leads.length;
    // Batch insert keeps one D1 request for all feed items; never counts duplicate rows as new leads.
    const statements:D1PreparedStatement[]=[];
    for(const l of leads){l.contentKey=await keyFor(l);l.id=(await hash(l.url)).slice(0,24);statements.push(s.db.prepare('INSERT OR IGNORE INTO leads(id,content_key,url,source_id,category,priority,score,status,discovered_at,published_at,checked_at,do_not_contact,payload) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(l.id,l.contentKey,l.url,l.sourceId,l.category,l.priority,l.score,l.status,l.discoveredAt,l.publishedAt,l.checkedAt,0,JSON.stringify(l)));}
    let inserted=0;if(statements.length){const rows=await s.db.batch(statements);inserted=rows.reduce((n,r)=>n+(r.meta.changes??0),0);result.inserted+=inserted;}
    await s.db.prepare('INSERT INTO source_state(id,last_checked,next_run,failures,error,inspected,found) VALUES(?,?,?,0,NULL,?,?) ON CONFLICT(id) DO UPDATE SET last_checked=excluded.last_checked,next_run=excluded.next_run,failures=0,error=NULL,inspected=inspected+excluded.inspected,found=found+excluded.found').bind(source.id,now,now+source.intervalMinutes*60000,items.length,inserted).run();
   }catch(e){const failures=(st?.failures??0)+1;const code=e instanceof HttpFailure?e.code:'source_failed';if(code==='daily_http_quota')result.state='quota_exhausted';await s.db.prepare('INSERT INTO source_state(id,last_checked,next_run,failures,error) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET last_checked=excluded.last_checked,next_run=excluded.next_run,failures=excluded.failures,error=excluded.error').bind(source.id,now,now+Math.max(Math.min(24*3600000,60000*2**Math.min(failures,10)),e instanceof HttpFailure?e.retryAfter:0),failures,code).run();if(failures>=3&&code!=='daily_http_quota')await critical(s,env,'source_'+source.id);if(code==='daily_http_quota')break;}
  }
  if(env.BUSINESS_BBOX&&await s.get('business_day')!==day){
   try{const {discoverBusinesses}=await import('./business_discovery');const companies=await discoverBusinesses(env.BUSINESS_BBOX,fetcher);for(const company of companies)await s.insertLead(company);await s.set('business_day',day);}catch{await s.error('business_discovery_unavailable');await s.set('business_day',day);}
  }
  const jobs=await s.db.prepare("SELECT * FROM audit_jobs WHERE status='pending' ORDER BY checked_at LIMIT 1").all<any>();for(const job of jobs.results){if(!await s.consume('audit:'+day,8))break;const a=await audit(job.url,fetcher);result.audits++;await s.db.prepare('UPDATE audit_jobs SET status=?,checked_at=?,result=? WHERE url=?').bind(a.state==='uncertain'?'review':'done',now,JSON.stringify(a),job.url).run();if(a.problems.some(p=>p.confirmed)){const l:Lead={id:'',contentKey:'',title:job.company,text:a.problems.map(p=>p.type+': '+p.evidence).join('\n'),url:job.url,sourceId:'website-audit',publishedAt:null,budget:null,currency:null,discoveredAt:now,checkedAt:now,category:'business',priority:'C',score:45,confidence:'medium',needsReview:true,status:'new',message:'',doNotContact:false,contact:null,problems:a.problems,reasons:['Техническое наблюдение; повторная проверка обязательна']};l.message=buildMessage(l);await s.insertLead(l);}}
  // Backfill drafts and notifications: safe after a crash between batch insert and enqueue.
  const pending=await s.db.prepare("SELECT l.* FROM leads l LEFT JOIN outbox o ON o.id='lead:'||l.id WHERE o.id IS NULL AND l.do_not_contact=0 AND l.status='new' AND (l.category IN ('inbound','business') OR (l.published_at>=? AND l.published_at<=? AND json_extract(l.payload,'$.isFreeReply')=1)) ORDER BY l.score DESC LIMIT 3").bind(now-freshWindowMs(env),now).all<any>();
  for(const row of pending.results){const l=s.decode(row);await s.db.prepare('INSERT OR IGNORE INTO outreach_queue(lead_id,draft,updated_at) VALUES(?,?,?)').bind(l.id,l.message,now).run();if(env.ADMIN_CHAT_ID)await s.enqueue('lead:'+l.id,env.ADMIN_CHAT_ID,card(l),buttons(l),l.category==='inbound'?l.contact??undefined:undefined);}
  if(env.ADMIN_CHAT_ID){if(!await s.db.prepare('SELECT 1 FROM outbox WHERE id=?').bind('daily:'+day).first())await s.enqueue('daily:'+day,env.ADMIN_CHAT_ID,await report(s,Date.parse(day)));const dt=new Date(now);if(dt.getUTCDay()===1&&!await s.db.prepare('SELECT 1 FROM outbox WHERE id=?').bind('weekly:'+day).first())await s.enqueue('weekly:'+day,env.ADMIN_CHAT_ID,await report(s,now-7*86400000));}
  result.notifications=await flush(s,env,fetcher);
  // Ambiguous sends are not automatically replayed after process termination.
  await s.db.prepare("UPDATE outbox SET status='unknown',error='interrupted_delivery' WHERE status='sending' AND created_at<?").bind(now-600000).run();
  if(await s.get('last_cleanup')!==day){const days=Math.max(1,Math.min(90,Number(env.RETENTION_DAYS??90)||90));await s.db.batch([s.db.prepare('DELETE FROM leads WHERE discovered_at<? AND status NOT IN (?,?,?)').bind(now-days*86400000,'working','agreed','paid'),s.db.prepare('DELETE FROM inbound_sessions WHERE updated_at<?').bind(now-30*86400000),s.db.prepare('DELETE FROM inbox WHERE created_at<?').bind(now-86400000),s.db.prepare('DELETE FROM outbox WHERE created_at<?').bind(now-30*86400000),s.db.prepare('DELETE FROM events WHERE created_at<?').bind(now-90*86400000),s.db.prepare('DELETE FROM quotas WHERE key NOT LIKE ? AND key NOT LIKE ?').bind('%'+day,'%'+day),s.db.prepare("DELETE FROM leads WHERE category='inbound' AND discovered_at<?").bind(now-30*86400000)]);await s.set('last_cleanup',day);}
  await s.set('last_run',JSON.stringify({...result,at:now}));console.log(JSON.stringify({event:'scheduled_run',...result,at:now}));return result;
 }catch{await critical(s,env,'scheduler_failed');result.state='failed';return result;}finally{await s.release('scheduler',owner);}}
