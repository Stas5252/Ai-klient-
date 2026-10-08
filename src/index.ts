import type {Env} from './types';
import {Store} from './storage';
import {drainInbox,run} from './scheduler';
import {flush} from './telegram_bot';
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {
 async fetch(req:Request,env:Env,ctx:ExecutionContext):Promise<Response>{const url=new URL(req.url);const s=new Store(env.DB);
  if(url.pathname==='/health')return json({service:'web-lead-machine',alive:true});
  if(url.pathname==='/webhook'){
   if(req.method!=='POST')return json({error:'method_not_allowed'},405);
   if(!env.TELEGRAM_WEBHOOK_SECRET||req.headers.get('X-Telegram-Bot-Api-Secret-Token')!==env.TELEGRAM_WEBHOOK_SECRET)return json({error:'unauthorized'},401);
   if(Number(req.headers.get('content-length')||0)>65536)return json({error:'too_large'},413);
   let u:any;try{const reader=req.body?.getReader();if(!reader)return json({error:'invalid_update'},400);let n=0;const chunks:Uint8Array[]=[];while(true){const r=await reader.read();if(r.done)break;n+=r.value.byteLength;if(n>65536){await reader.cancel();return json({error:'too_large'},413);}chunks.push(r.value);}const b=new Uint8Array(n);let i=0;for(const c of chunks){b.set(c,i);i+=c.length;}u=JSON.parse(new TextDecoder().decode(b));if(!Number.isSafeInteger(u.update_id))return json({error:'invalid_update'},400);}catch{return json({error:'invalid_update'},400);}
   try{await s.db.prepare('INSERT OR IGNORE INTO inbox(id,payload,created_at) VALUES(?,?,?)').bind(u.update_id,JSON.stringify(u),Date.now()).run();await drainInbox(s,env);await flush(s,env);return json({ok:true});}catch{console.error(JSON.stringify({code:'webhook_storage_failed'}));return json({error:'temporarily_unavailable'},503);}
  }
  if(url.pathname.startsWith('/api/')){if(!env.ADMIN_API_KEY||req.headers.get('Authorization')!==`Bearer ${env.ADMIN_API_KEY}`)return json({error:'unauthorized'},401);
   try{if(url.pathname==='/api/export'&&req.method==='GET'){const cursor=url.searchParams.get('cursor')||'';const rows=await s.db.prepare('SELECT * FROM leads WHERE id>? ORDER BY id LIMIT 100').bind(cursor).all<any>();return json({leads:rows.results.map(r=>s.decode(r)),nextCursor:rows.results.length===100?rows.results.at(-1).id:null});}
    if(url.pathname==='/api/health')return json({lastTick:await s.get('last_tick','never'),lastRun:await s.get('last_run','none'),paused:await s.get('paused'),outboundStopped:await s.get('outbound_stopped')});
    if(url.pathname==='/api/run'&&req.method==='POST')return json(await run(env));
   }catch{return json({error:'temporarily_unavailable'},503);}
  }
  return json({service:'Web Lead Machine',control:'Telegram owner commands'},404);
 },
 async scheduled(event:ScheduledController,env:Env,ctx:ExecutionContext){ctx.waitUntil(run(env,event.scheduledTime));}
};
