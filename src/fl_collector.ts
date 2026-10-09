import type {RawItem,Source,Fetcher} from './types';
import {clean} from './normalizer';
import {getText,HttpFailure} from './http';
type FreeOrder=RawItem&{isFreeReply:true};
const FIRST_PAGES=new Set(['https://www.fl.ru/projects/','https://www.fl.ru/projects/category/saity/','https://www.fl.ru/projects/category/programmirovanie/']);
function attribute(tag:string,name:string):string{return clean(tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`,'i'))?.[1]??'');}
function publicationTime(footer:string,now:number):number|null{
 const time=footer.match(/<time\b[^>]*>/i)?.[0];
 const absolute=time?attribute(time,'datetime'):'';
 if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(absolute)){
  const date=Date.parse(absolute);if(Number.isFinite(date))return date;
 }
 for(const m of footer.matchAll(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi)){
  if(!/\btext-gray-opacity-4\b/i.test(attribute(m[1],'class')))continue;
  const text=clean(m[2]);
  const relative=text.match(/^(?:(\d{1,4})\s+час(?:а|ов)?(?:\s+(\d{1,3})\s+минут(?:у|ы)?)?|(\d{1,4})\s+минут(?:у|ы)?)\s+назад$/i);
  if(relative)return now-(Number(relative[1]??0)*60+Number(relative[2]??relative[3]??0))*60000;
 }
 return null;
}
// Parse bounded first-page card fragments; never infer free eligibility from page FAQs or job prose.
// Public HTML has a separate 1MiB bound; RSS retains the shared default 256KiB bound.
export function parseFlPublic(html:string,source:Source,now:number):FreeOrder[]{
 if(new TextEncoder().encode(html).byteLength>1048576)throw new HttpFailure('response_too_large');
 if(!/<html\b/i.test(html)||!/<\/html>\s*$/i.test(html)||!Number.isFinite(now))throw new HttpFailure('invalid_html');
 const safe=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 const starts=[...safe.matchAll(/<div\b[^>]*\bid=["']project-item(\d+)["'][^>]*>/gi)].slice(0,60);
 const items:FreeOrder[]=[];const seen=new Set<string>();
 for(const start of starts){
  const offset=start.index!;const tags=/<\/?div\b[^>]*>/gi;tags.lastIndex=offset;let depth=0,end=-1,tag:RegExpExecArray|null;
  while((tag=tags.exec(safe))){depth+=/^<\/div/i.test(tag[0])?-1:1;if(depth===0){end=tags.lastIndex;break;}}
  if(end<0)throw new HttpFailure('invalid_html');
  const card=safe.slice(offset,end);const titleMatch=card.match(/<h2\b[^>]*\bb-post__title\b[^>]*>([\s\S]*?)<\/h2>/i);if(!titleMatch)continue;
  const header=card.slice(0,titleMatch.index);let free=false;
  for(const badge of header.matchAll(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi)){
   if(/\bbadge\b/i.test(attribute(badge[1],'class'))&&/^для всех$/i.test(clean(badge[2])))free=true;
  }
  if(!free)continue;
  const foot=card.slice(card.indexOf('b-post__foot'));if(!/<span\b[^>]*\bb-post__bold\b[^>]*>\s*Заказ\s*<\/span>/i.test(foot))continue;
  const anchor=titleMatch[1].match(/<a\b([^>]*)>([\s\S]*?)<\/a>/i);if(!anchor)continue;
  const title=clean(anchor[2]);const description=card.match(/<div\b[^>]*class=["'][^"']*\bb-post__txt\b[^"']*\btext-5\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]??'';
  const text=clean(description);const prose=title+' '+text;
  if(!/разработ|доработ|верст|вёрст|лендинг|landing|wordpress|битрикс|bitrix|интернет[ -]магазин|веб[ -](?:сервис|прилож|сайт)/i.test(prose))continue;
  if(/предлагаю услуги|разработаю|создам|услуги веб|напишу отзыв|написать отзыв|размещение отзыв|положительн\w* отзыв/i.test(prose))continue;
  let url:URL;try{url=new URL(attribute(anchor[1],'href'),'https://www.fl.ru/');}catch{continue;}
  if(url.origin!=='https://www.fl.ru'||url.search||url.hash||url.username||url.password||!new RegExp(`^/projects/${start[1]}/[^/]+\\.html$`).test(url.pathname)||seen.has(url.href))continue;
  seen.add(url.href);items.push({title,text,url:url.href,sourceId:source.id,publishedAt:publicationTime(foot,now),isFreeReply:true});
 }
 return items;
}
export async function collectFlPublic(source:Source,fetcher:Fetcher=fetch,now=Date.now()):Promise<FreeOrder[]>{
 if(!source.enabled||source.policy!=='monitor'||source.id!=='fl-public-free'||!FIRST_PAGES.has(source.url))throw new HttpFailure('source_not_authorized');
 const response=await getText(source.url,fetcher,1,1048576);
 if(response.status!==200)throw new HttpFailure('http_'+response.status);
 if(!/text\/html/i.test(response.contentType))throw new HttpFailure('invalid_html');
 return parseFlPublic(response.text,source,now);
}
