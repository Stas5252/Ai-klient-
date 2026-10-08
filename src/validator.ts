import type {Lead,RawItem,Source} from './types';
import {clean,canonicalUrl,budgetRange} from './normalizer';
import {scoreLead} from './lead_scoring';
import {buildMessage} from './message_builder';
const skills=/сайт|лендинг|landing|wordpress|вордпресс|вёрст|верст|react|next\.?js|интернет.{0,2}магазин|веб.{0,2}(?:прилож|разраб)|web.{0,2}(?:app|dev)|квиз|woocommerce|opencart|html|css|javascript|telegram.{0,8}бот|телеграм.{0,8}бот|каталог товаров/i;
const request=/нуж(?:ен|на|но|ны)|ищ(?:у|ем|ет)|требу(?:ется|ются)|сделать|создать|разработать|исправить|починить|доработать|сверстать|перенести|настроить|переделать|подключить|обновить|интегрировать|выполнить|заказ|проект/i;
export function qualify(raw:RawItem,source:Source,now=Date.now()):Lead|null {
 const title=clean(raw.title),text=clean(raw.text);const t=title+' '+text;const url=canonicalUrl(raw.url);if(!url||!skills.test(t))return null;
 if(/заказ закрыт|исполнитель найден|уже нашли|не актуальн|неактуальн|проект завершен/i.test(t))return null;
 if(/в штат|на полный день|full.?time|оформление по тк|оклад|курсовая|курсовой|учебное задание|бесплатно.{0,20}(?:сделать|работ)|тестовое задание/i.test(t))return null;
 if(/предлагаю (?:свои )?услуги|разрабатываю сайты|делаю сайты|создаю сайты|мои услуги|закажите у меня/i.test(t)&&!/(?:ищу|ищем).{0,35}(?:подрядчик|разработчик)/i.test(t))return null;
 if(raw.publishedAt!==null&&(now-raw.publishedAt>7*86400000||raw.publishedAt>now+300000))return null;
 if(!source.projectBoard&&!request.test(t))return null;
 if(/маркетолог|маркетинг|(?:seo|сео).{0,15}продвиж|продвижение|продвижения|smm|таргет|контекстная реклама/i.test(title)&&!/разработ|доработ|верст|вёрст|исправ|редизайн/i.test(title))return null;
 const partner=/(?:для|на).{0,20}партн[её]рств|ищ(?:у|ем|ет).{0,40}(?:разработчика|веб.{0,3}разработчика).{0,50}(?:на проекты|для проектов|постоян|регуляр)|(?:мы|наша).{0,20}(?:студия|агентство).{0,60}ищ(?:ем|ет).{0,40}(?:разработ|верст)/i.test(t);
 const suspicious=/ignore previous|system prompt|игнорируй.{0,20}инструк|отправь токен|выполни команд|<script|\$\(/i.test(t);
 const budget=budgetRange(t);
 const l:Lead={...raw,title,text,url,id:'',contentKey:'',...budget,currency:budget.budget===null?null:'RUB',discoveredAt:now,checkedAt:now,category:partner?'partner':'order',priority:'A',score:0,confidence:raw.publishedAt===null?'low':'medium',needsReview:raw.publishedAt===null||suspicious,status:'new',message:'',doNotContact:false,contact:null,problems:[],reasons:[]};
 scoreLead(l,source,now);l.message=buildMessage(l);return l;
}
