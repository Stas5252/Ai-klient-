import {Miniflare} from 'miniflare';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {run} from '../src/scheduler';
import {Store} from '../src/storage';
import {audit} from '../src/website_auditor';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB'],d1Persist:'./private/verified-live-d1'});
try{
 mkdirSync('private',{recursive:true});const db=await mf.getD1Database('DB');await db.exec(readFileSync('migrations/0001.sql','utf8').replace(/\n/g,' '));const env={DB:db,MAX_SOURCE_REQUESTS_DAY:'200'} as any;
 const now=Date.now();const first=await run(env,now);const restart=await run(env,now+1000);const s=new Store(db as any);const leads=await s.list(undefined,100);const site=await audit('https://stanislavweb.ru/');
 const result={checkedAt:new Date().toISOString(),environment:'local execution with persistent private SQLite, NOT deployed',firstRun:first,repeatRun:restart,storedLeads:leads.length,orders:leads.filter(x=>x.category==='order').length,partners:leads.filter(x=>x.category==='partner').length,businesses:leads.filter(x=>x.category==='business').length,ownerNotifications:0,thirdPartyMessages:0,audit:{state:site.state,confirmedProblems:site.problems.filter(x=>x.confirmed).map(x=>x.type),notes:site.notes}};
 writeFileSync('private/real-leads.json',JSON.stringify(leads,null,2),{mode:0o600});writeFileSync('private/audit-result.json',JSON.stringify(site,null,2),{mode:0o600});writeFileSync('research/live-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 if(first.state!=='ok'||first.inspected===0)process.exitCode=1;
}finally{await mf.dispose();}
