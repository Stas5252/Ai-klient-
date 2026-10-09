import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {freeDeploymentAllowed} from './deployment-policy.mjs';
const coreOnly=process.argv.includes('--core-only');
const fail=m=>{console.error(m);process.exit(1);};
const required=['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID','TELEGRAM_BOT_TOKEN','TELEGRAM_WEBHOOK_SECRET','ADMIN_IDS','ADMIN_CHAT_ID','ADMIN_API_KEY','SUPPRESSION_SALT'];
const missing=required.filter(k=>!(coreOnly&&k==='TELEGRAM_BOT_TOKEN')&&!process.env[k]);if(missing.length)fail('Не хватает секретов: '+missing.join(', ')+'. Значения не выводятся.');
if(!/^\d+(,\d+)*$/.test(process.env.ADMIN_IDS)||!process.env.ADMIN_IDS.split(',').includes(process.env.ADMIN_CHAT_ID))fail('ADMIN_CHAT_ID должен быть в whitelist ADMIN_IDS.');
if(['TELEGRAM_WEBHOOK_SECRET','ADMIN_API_KEY','SUPPRESSION_SALT'].some(k=>process.env[k].length<24))fail('Случайные секреты должны быть длиной >=24 символов.');
const base=`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}`;
async function cf(path,method='GET',body,optional=false){try{const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const j=await r.json();if(optional&&(!r.ok||!j.success))return null;if(!r.ok||!j.success)fail(`Cloudflare отказал в ${method} ${path}; HTTP ${r.status}. Проверьте минимальные права, секреты не выводятся.`);return j.result;}catch{fail('Cloudflare недоступен; развёртывание остановлено.');}}
// No subscriptions are created. Read-only billing first; empty fresh-account bootstrap is explicit.
const subscriptions=await cf('/subscriptions','GET',undefined,true);
const databases=await cf('/d1/database');
let billing={subscriptions};
if(subscriptions===null){const account=await cf('','GET');billing={subscriptions,entitlements:await cf('/entitlements'),scripts:await cf('/workers/scripts'),databases,accountCreatedAt:Date.parse(account.created_on)};}
if(!freeDeploymentAllowed(billing))fail('Бесплатный план не подтверждён. Развёртывание остановлено; платные подписки не создаются.');
console.log(subscriptions===null?'Первичная Free настройка: новый пустой аккаунт, entitlements=[], без покупок/подписок.':'Account subscriptions проверены: платного Workers plan нет.');
const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));let database=databases.find(x=>x.name==='web-lead-machine');
let subdomain=await cf('/workers/subdomain','GET',undefined,true);
if(!subdomain)subdomain=await cf('/workers/subdomain','PUT',{subdomain:'stas5252-leads-'+process.env.CLOUDFLARE_ACCOUNT_ID.slice(0,6)});
if(!database)database=await cf('/d1/database','POST',{name:'web-lead-machine'});
config.d1_databases[0].database_id=database.uuid;writeFileSync('wrangler.jsonc',JSON.stringify(config,null,2)+'\n');
function wrangler(args,input){const p=spawnSync('npx',['--no-install','wrangler',...args],{input,encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});if(p.status!==0)fail('Wrangler завершился ошибкой. Сырой вывод скрыт, чтобы не раскрыть секреты. Повторите отдельный шаг по DEPLOYMENT.md.');return p.stdout;}
wrangler(['d1','migrations','apply','web-lead-machine','--remote']);
const secrets=Object.fromEntries(required.filter(k=>!k.startsWith('CLOUDFLARE_')&&process.env[k]&&!(coreOnly&&k==='TELEGRAM_BOT_TOKEN')).map(k=>[k,process.env[k]]));
const output=wrangler(['deploy']);wrangler(['secret','bulk'],JSON.stringify(secrets));const deployment=output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/i)?.[0];
if(!deployment)fail('Worker опубликован, URL не распознан. Проверьте панель Cloudflare и установите webhook вручную.');
async function telegram(method,data){try{const r=await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const j=await r.json();if(!j.ok)fail('Telegram '+method+' не выполнен; код '+j.error_code);return j.result;}catch{fail('Telegram API недоступен.');}}
if(!coreOnly){
await telegram('setWebhook',{url:deployment+'/webhook',secret_token:process.env.TELEGRAM_WEBHOOK_SECRET,allowed_updates:['message','callback_query','channel_post']});
await telegram('setMyCommands',{commands:[['start','Начать'],['help','Помощь'],['new','Новые'],['fresh','Свежие бесплатные'],['archive','Архив'],['search','Ручной поиск'],['connect','Подключение API'],['best','Лучшие'],['business','Аудиты'],['partners','Партнёры'],['stats','Статистика'],['today','Сегодня'],['health','Состояние'],['pause','Пауза'],['resume','Возобновить'],['sources','Источники'],['settings','Настройки'],['export','Экспорт'],['shutdown','Аварийная остановка']].map(([command,description])=>({command,description}))});
}
const check=await fetch(deployment+'/health',{headers:{'User-Agent':'WebLeadMachine/0.1 (+https://stanislavweb.ru/)'}});if(!check.ok)fail('Опубликован, но health не подтвердился.');
console.log('Worker URL: '+deployment);console.log(coreOnly?'Core развёрнут без токена Telegram. Добавьте новый TELEGRAM_BOT_TOKEN непосредственно в Cloudflare и вызовите защищённый /api/connect-telegram.':'Webhook установлен. Следующий cron ещё требуется проверить.');
