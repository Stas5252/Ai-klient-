import type {Lead,Source} from './types';
export function scoreLead(lead:Lead,source:Source,now:number):Lead {
 const t=(lead.title+' '+lead.text).toLowerCase();const age=lead.publishedAt===null?Infinity:now-lead.publishedAt;
 const urgent=/срочн|сегодня|до вечера|завтра|asap/.test(t);
 lead.priority=lead.category==='partner'?'B':urgent&&age<86400000&&source.freeReply===true?'A+':'A';
 lead.score=Math.min(100,45+(age<3600000?20:age<86400000?12:0)+(urgent?8:0)+(lead.budget!==null?5:0)+(/макет|техническ.{0,10}задан|\bтз\b|figma/.test(t)?8:0)+(source.freeReply?10:0)+(lead.category==='partner'?10:0));
 lead.reasons=[lead.category==='partner'?'Публичный запрос на сотрудничество':'Запрос на веб-задачу'];
 if(source.freeReply!==true){lead.needsReview=true;lead.reasons.push('Бесплатность и правила отклика требуют проверки');}
 if(lead.publishedAt===null)lead.reasons.push('Дата публикации не подтверждена');
 return lead;
}
