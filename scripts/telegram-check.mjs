import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const vars=Object.fromEntries(readFileSync('.dev.vars','utf8').split('\n').filter(x=>x.includes('=')).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)];}));
async function api(method,data={}){try{const r=await fetch(`https://api.telegram.org/bot${vars.TELEGRAM_BOT_TOKEN}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(10000)});return await r.json();}catch{return {ok:false,error_code:'network_uncertain'};}}
const me=await api('getMe');console.log(JSON.stringify({check:'getMe',ok:me.ok,username:me.result?.username}));
const updates=await api('getUpdates');const owner=updates.result?.map(u=>u.message).find(m=>m?.chat?.type==='private'&&m.from?.username?.toLowerCase()==='butov52'&&/^\/start(?:\s|$)/.test(m.text||''));
if(!owner){console.log(JSON.stringify({check:'owner_start',found:false,instruction:'Owner @Butov52 must press /start'}));process.exit(2);}
vars.ADMIN_IDS=String(owner.from.id);vars.ADMIN_CHAT_ID=String(owner.chat.id);
writeFileSync('.dev.vars',Object.entries(vars).map(([k,v])=>k+'='+v).join('\n')+'\n',{mode:0o600});
const text='Тест Web Lead Machine: бот подключён и уведомление доставлено в ваш чат. Рабочее ядро проходит проверки; постоянный облачный сервис пока не развёрнут — нужен Cloudflare. Сообщения посторонним не отправлялись.';
const result=await api('sendMessage',{chat_id:vars.ADMIN_CHAT_ID,text,disable_web_page_preview:true});
const evidence={checkedAt:new Date().toISOString(),getMe:me.ok,username:me.result?.username,ownerVerified:true,testNotificationSent:result.ok===true,messageId:result.result?.message_id??null,thirdPartyMessages:0};
mkdirSync('research',{recursive:true});writeFileSync('research/telegram-results.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
