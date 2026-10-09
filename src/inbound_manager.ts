import {Store} from './storage';
import type {Env,Lead} from './types';
import {hash} from './deduplicator';
import {budgetRange} from './normalizer';
const questions=['Какой сайт или доработка нужны?','Есть ли действующий сайт? Пришлите ссылку или напишите «нет».','Какие основные функции нужны?','Есть ли макет? Можно прислать ссылку или написать «нет».','Когда хотелось бы закончить?','Какой примерный бюджет? Можно написать «пока не знаю».','Пришлите дополнительные ссылки и пожелания или напишите «нет».'];
const labels=['Задача','Старый сайт','Функции','Макет','Сроки','Бюджет','Пожелания'];
function keyboard(step:number){const rows=step===0?[['Лендинг','Доработка сайта'],['Магазин','Telegram-бот'],['Нужна консультация']]:step===5?[['Пока не знаю']]:step===1||step===3||step===6?[['Нет']]:undefined;return rows?{keyboard:rows,resize_keyboard:true,one_time_keyboard:true}:{remove_keyboard:true};}
export function isStart(text:string):boolean{return /^\/start(?:@[a-zA-Z0-9_]+)?(?:\s+[a-zA-Z0-9_-]{1,64})?$/.test(text);}
export async function contactHash(env:Env,chat:string){if(!env.SUPPRESSION_SALT)throw new Error('suppression_salt_missing');return hash(env.SUPPRESSION_SALT+':'+chat);}
export async function inbound(s:Store,env:Env,chat:string,text:string,updateId:number):Promise<void>{
 const suppressed=await s.db.prepare('SELECT 1 FROM suppression WHERE contact_hash=?').bind(await contactHash(env,chat)).first();
 if(text==='/stop'||text==='/delete_me'){
  const h=await contactHash(env,chat);await s.db.batch([
   s.db.prepare('INSERT OR IGNORE INTO suppression VALUES(?,?)').bind(h,Date.now()),
   s.db.prepare('DELETE FROM inbound_sessions WHERE chat_id=?').bind(chat),
   s.db.prepare('DELETE FROM outbox WHERE chat_id=? OR subject_contact=?').bind(chat,chat),
   s.db.prepare("DELETE FROM inbox WHERE CAST(json_extract(payload,'$.message.chat.id') AS TEXT)=?").bind(chat),
   s.db.prepare("DELETE FROM leads WHERE category='inbound' AND json_extract(payload,'$.contact')=?").bind(chat),
   s.enqueueStatement(`optout:${updateId}`,chat,'Обработка остановлена, хранимые заявки и ответы удалены. Уже доставленные сообщения владельцу удалите через него: @Butov52. Для новой заявки используйте /start.')
  ]);return;
 }
 if(suppressed&&!isStart(text))return;
 if(isStart(text)){const channel=text.match(/\s+([a-zA-Z0-9_-]{1,64})$/)?.[1]??'direct';await s.db.batch([
  s.db.prepare("UPDATE outbox SET status='cancelled' WHERE chat_id=? AND status='pending' AND id LIKE 'in:%'").bind(chat),
  s.db.prepare('DELETE FROM suppression WHERE contact_hash=?').bind(await contactHash(env,chat)),
  s.db.prepare('INSERT INTO inbound_sessions(chat_id,step,data,updated_at) VALUES(?,0,?,?) ON CONFLICT(chat_id) DO UPDATE SET step=0,data=excluded.data,opted_out=0,updated_at=excluded.updated_at').bind(chat,JSON.stringify({answers:[],started:updateId,channel}),Date.now()),
  s.enqueueStatement(`in:${updateId}`,chat,'Здравствуйте! Я автоматический помощник Станислава. Соберу краткое описание и передам ему. Точную стоимость и сроки подтверждает только Станислав. Отправляя ответы, вы просите обработать заявку. Ответы хранятся до 30 дней; /cancel — отменить бриф, /stop — остановить, /delete_me — удалить. '+questions[0],keyboard(0),chat)
 ]);return;}
 if(text==='/help'||text==='/privacy'){await s.enqueue(`in:${updateId}`,chat,'Я автоматический помощник. /start — новая заявка; /cancel — отменить бриф; /stop — не писать; /delete_me — удалить данные. Контакт разработчика: @Butov52. Хранение за пределами РФ требует отдельной правовой оценки; не присылайте персональные документы.');return;}
 if(text==='/cancel'){await s.db.batch([s.db.prepare('DELETE FROM inbound_sessions WHERE chat_id=?').bind(chat),s.db.prepare("UPDATE outbox SET status='cancelled' WHERE chat_id=? AND status='pending' AND id LIKE 'in:%'").bind(chat),s.enqueueStatement(`in:${updateId}`,chat,'Бриф отменён. Новую заявку можно начать через /start; вопрос — @Butov52.',{remove_keyboard:true},chat)]);return;}
 const r=await s.db.prepare('SELECT * FROM inbound_sessions WHERE chat_id=?').bind(chat).first<{step:number;data:string}>();
 if(!r){await s.enqueue(`in:${updateId}`,chat,'По вопросам можно написать @Butov52. Если нужен сайт или доработка, /start поможет собрать заявку.');return;}
 if(!text.trim()||text.startsWith('/')){await s.enqueue(`in:${updateId}`,chat,'Ответьте текстом или ссылкой. '+questions[r.step]+' Отменить бриф: /cancel.',keyboard(r.step),chat);return;}
 const d=JSON.parse(r.data);if(d.lastUpdate===updateId)return;d.lastUpdate=updateId;d.answers[r.step]=text.slice(0,2000);const next=r.step+1;
 if(next<questions.length){await s.db.batch([s.db.prepare('UPDATE inbound_sessions SET step=?,data=?,updated_at=? WHERE chat_id=?').bind(next,JSON.stringify(d),Date.now(),chat),s.enqueueStatement(`in:${updateId}`,chat,questions[next],keyboard(next),chat)]);return;}
 const now=Date.now();const summary='Канал: '+(d.channel??'direct')+'\n'+d.answers.map((a:string,i:number)=>labels[i]+': '+a).join('\n');
 const budgetText=String(d.answers[5]??'').trim();const budget=budgetRange(/^\d[\d\s]*$/.test(budgetText)?budgetText+' ₽':budgetText);
 const lead:Lead={id:'',contentKey:'',title:'Входящая заявка',text:summary,url:`https://t.me/StanislawWeb_bot?start=request_${d.started}_${chat}`,sourceId:'inbound',publishedAt:now,...budget,currency:budget.budget===null?null:'RUB',discoveredAt:now,checkedAt:now,category:'inbound',priority:'A',score:85,confidence:'high',needsReview:true,status:'new',message:'Уточнить заявку лично; стоимость не обещана.',doNotContact:false,contact:chat,problems:[],reasons:['Клиент первым начал диалог']};
 const insert=await s.leadStatement(lead);const statements=[insert,s.enqueueStatement(`in:${updateId}`,chat,'Спасибо! Заявка передана Станиславу. Он оценит задачу и ответит лично. Можно также написать @Butov52.',{remove_keyboard:true},chat),s.db.prepare('DELETE FROM inbound_sessions WHERE chat_id=?').bind(chat)];
 if(env.ADMIN_CHAT_ID)statements.push(s.enqueueStatement(`request:${d.started}:${chat}`,env.ADMIN_CHAT_ID,'НОВАЯ ВХОДЯЩАЯ ЗАЯВКА\n'+summary+'\nКонтакт доступен через CRM, chat ID: '+chat,undefined,chat));
 await s.db.batch(statements);
}
