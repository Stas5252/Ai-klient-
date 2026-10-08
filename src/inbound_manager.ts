import {Store} from './storage';
import type {Env,Lead} from './types';
import {hash} from './deduplicator';
const questions=['Какой сайт или доработка нужны?','Есть ли действующий сайт? Пришлите ссылку или напишите «нет».','Какие основные функции нужны?','Есть ли макет? Можно прислать ссылку или написать «нет».','Когда хотелось бы закончить?','Какой примерный бюджет? Можно написать «пока не знаю».','Пришлите дополнительные ссылки и пожелания или напишите «нет».'];
const labels=['Задача','Старый сайт','Функции','Макет','Сроки','Бюджет','Пожелания'];
export async function contactHash(env:Env,chat:string){if(!env.SUPPRESSION_SALT)throw new Error('suppression_salt_missing');return hash(env.SUPPRESSION_SALT+':'+chat);}
export async function inbound(s:Store,env:Env,chat:string,text:string,updateId:number):Promise<void>{
 const suppressed=await s.db.prepare('SELECT 1 FROM suppression WHERE contact_hash=?').bind(await contactHash(env,chat)).first();
 if(text==='/stop'||text==='/delete_me'){
  const h=await contactHash(env,chat);await s.db.prepare('INSERT OR IGNORE INTO suppression VALUES(?,?)').bind(h,Date.now()).run();
  await s.db.batch([s.db.prepare('DELETE FROM inbound_sessions WHERE chat_id=?').bind(chat),s.db.prepare('DELETE FROM outbox WHERE chat_id=?').bind(chat)]);
  const leads=await s.list('inbound',1000);for(const l of leads)if(l.contact===chat)await s.db.prepare('DELETE FROM leads WHERE id=?').bind(l.id).run();
  await s.enqueue(`in:${updateId}`,chat,'Обработка остановлена, заявка и ответы удалены. Для новой заявки используйте /start.');return;
 }
 if(suppressed&&text!=='/start')return;
 if(text==='/start'){await s.db.prepare('DELETE FROM suppression WHERE contact_hash=?').bind(await contactHash(env,chat)).run();await s.db.prepare('INSERT INTO inbound_sessions(chat_id,step,data,updated_at) VALUES(?,0,?,?) ON CONFLICT(chat_id) DO UPDATE SET step=0,data=excluded.data,opted_out=0,updated_at=excluded.updated_at').bind(chat,JSON.stringify({answers:[],started:updateId}),Date.now()).run();await s.enqueue(`in:${updateId}`,chat,'Здравствуйте! Я автоматический помощник Станислава. Соберу краткое описание и передам ему. Точную стоимость и сроки подтверждает только Станислав. Отправляя ответы, вы просите обработать заявку. Ответы хранятся до 30 дней; /stop — остановить, /delete_me — удалить. '+questions[0]);return;}
 if(text==='/help'||text==='/privacy'){await s.enqueue(`in:${updateId}`,chat,'Я автоматический помощник. /start — новая заявка; /stop — не писать; /delete_me — удалить данные. Контакт разработчика: @Butov52. Хранение за пределами РФ требует отдельной правовой оценки; не присылайте персональные документы.');return;}
 const r=await s.db.prepare('SELECT * FROM inbound_sessions WHERE chat_id=?').bind(chat).first<{step:number;data:string}>();
 if(!r){await s.enqueue(`in:${updateId}`,chat,'По вопросам можно написать @Butov52. Если нужен сайт или доработка, /start поможет собрать заявку.');return;}
 const d=JSON.parse(r.data);if(d.lastUpdate===updateId)return;d.lastUpdate=updateId;d.answers[r.step]=text.slice(0,2000);const next=r.step+1;
 if(next<questions.length){await s.db.prepare('UPDATE inbound_sessions SET step=?,data=?,updated_at=? WHERE chat_id=?').bind(next,JSON.stringify(d),Date.now(),chat).run();await s.enqueue(`in:${updateId}`,chat,questions[next]);return;}
 const now=Date.now();const summary=d.answers.map((a:string,i:number)=>labels[i]+': '+a).join('\n');
 const lead:Lead={id:'',contentKey:'',title:'Входящая заявка',text:summary,url:`https://t.me/StanislawWeb_bot?start=request_${d.started}_${chat}`,sourceId:'inbound',publishedAt:now,budget:null,currency:null,discoveredAt:now,checkedAt:now,category:'inbound',priority:'A',score:85,confidence:'high',needsReview:true,status:'new',message:'Уточнить заявку лично; стоимость не обещана.',doNotContact:false,contact:chat,problems:[],reasons:['Клиент первым начал диалог']};
 await s.insertLead(lead);if(env.ADMIN_CHAT_ID)await s.enqueue(`request:${d.started}:${chat}`,env.ADMIN_CHAT_ID,'НОВАЯ ВХОДЯЩАЯ ЗАЯВКА\n'+summary+'\nКонтакт доступен через CRM, chat ID: '+chat);
 await s.enqueue(`in:${updateId}`,chat,'Спасибо! Заявка передана Станиславу. Он оценит задачу и ответит лично. Можно также написать @Butov52.');await s.db.prepare('DELETE FROM inbound_sessions WHERE chat_id=?').bind(chat).run();
}
