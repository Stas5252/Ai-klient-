import {Miniflare} from 'miniflare';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {run} from '../src/scheduler';
import {Store} from '../src/storage';
import {audit} from '../src/website_auditor';
import {isFreshFreeLead} from '../src/freshness';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB'],d1Persist:'./private/fresh-live-d1'});
try{
 mkdirSync('private',{recursive:true});const db=await mf.getD1Database('DB');await db.exec(readFileSync('migrations/0001.sql','utf8').replace(/\n/g,' '));const env={DB:db,MAX_SOURCE_REQUESTS_DAY:'1000'} as any;
 if(process.argv.includes('--notify-owner')){const secrets=Object.fromEntries(readFileSync('.dev.vars','utf8').split('\n').filter(x=>x.includes('=')).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)];}));if(!secrets.ADMIN_CHAT_ID||!secrets.ADMIN_IDS?.split(',').includes(secrets.ADMIN_CHAT_ID))throw Error('Owner whitelist required');Object.assign(env,secrets);}
 const now=Date.now();const s=new Store(db as any);if(process.argv.includes('--notify-owner'))await s.enqueue('owner-smoke:'+now,env.ADMIN_CHAT_ID,'ТЕХНИЧЕСКИЙ ТЕСТ Web Lead Machine\nПроверяется обновлённый код из локального окружения, это не новая версия облачного Worker и не клиент. Фильтр: исходная публикация до 60 минут, бесплатный отклик. Реальный поиск ниже не гарантирует новых заказов.');const first=await run(env,now);const restart=await run(env,now+1000);const leads=await s.list(undefined,100);const site=await audit('https://stanislavweb.ru/');const states=await db.prepare('SELECT id,last_checked,error,inspected,found FROM source_state').all();
 const result={checkedAt:new Date().toISOString(),environment:'local execution with persistent private SQLite, NOT deployed',firstRun:first,repeatRun:restart,sourceChecks:states.results,storedLeads:leads.length,freshFreeLeads:leads.filter(x=>isFreshFreeLead(x,now,env)).length,orders:leads.filter(x=>x.category==='order').length,partners:leads.filter(x=>x.category==='partner').length,businesses:leads.filter(x=>x.category==='business').length,ownerNotifications:first.notifications+restart.notifications,thirdPartyMessages:0,audit:{state:site.state,confirmedProblems:site.problems.filter(x=>x.confirmed).map(x=>x.type),notes:site.notes}};
 writeFileSync('private/fresh-real-leads.json',JSON.stringify(leads,null,2),{mode:0o600});writeFileSync('private/fresh-audit-result.json',JSON.stringify(site,null,2),{mode:0o600});writeFileSync('research/fresh-live-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 if(first.state!=='ok'||!states.results.some((x:any)=>x.id==='fl-public-free'&&x.last_checked&&!x.error))process.exitCode=1;
}finally{await mf.dispose();}
