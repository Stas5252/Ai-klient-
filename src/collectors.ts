import type {RawItem,Source,Fetcher} from './types';
import {clean} from './normalizer';
import {getText,HttpFailure} from './http';
// Bounded field extraction avoids validating/parsing an entire 256KiB XML tree on Workers Free.
// Supported: official RSS2 item and simple Atom entry fields; DTD/external entities are forbidden.
function field(xml:string,name:string):string{const m=xml.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`,'i'));return (m?.[1]??'').replace(/^\s*<!\[CDATA\[([\s\S]*)\]\]>\s*$/,'$1').slice(0,16000);}
export function parseRss(xml:string,source:Source):RawItem[]{
 if(xml.length>262144||/<!DOCTYPE|<!ENTITY/i.test(xml)||!/<(?:rss|feed)\b/i.test(xml)||!/<\/(?:rss|feed)>\s*$/i.test(xml))throw new HttpFailure('invalid_feed');
 const items:RawItem[]=[];const pattern=/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;let match:RegExpExecArray|null;
 while(items.length<60&&(match=pattern.exec(xml))){const x=match[2];let link=field(x,'link');if(!link){link=x.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i)?.[1]??'';}const date=Date.parse(clean(field(x,'pubDate')||field(x,'published')||field(x,'updated')));items.push({title:clean(field(x,'title')),text:clean(field(x,'description')||field(x,'content')||field(x,'summary')),url:clean(link),sourceId:source.id,publishedAt:Number.isFinite(date)?date:null});}
 return items;
}
export async function collect(source:Source,fetcher:Fetcher=fetch):Promise<RawItem[]>{if(!source.enabled||source.policy!=='monitor')throw new HttpFailure('source_not_authorized');const r=await getText(source.url,fetcher);if(r.status!==200)throw new HttpFailure('http_'+r.status);return parseRss(r.text,source);}
