import {XMLParser,XMLValidator} from 'fast-xml-parser';
import type {RawItem,Source,Fetcher} from './types';
import {clean} from './normalizer';
import {getText,HttpFailure} from './http';
export function parseRss(xml:string,source:Source):RawItem[]{
 if(/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw new HttpFailure('invalid_feed');
 const root=new XMLParser({ignoreAttributes:false,processEntities:true}).parse(xml);const raw=root.rss?.channel?.item??root.feed?.entry??[];const items=Array.isArray(raw)?raw:[raw];
 return items.slice(0,60).map((x:any)=>{const link=typeof x.link==='string'?x.link:Array.isArray(x.link)?x.link.find((l:any)=>!l['@_rel']||l['@_rel']==='alternate')?.['@_href']:x.link?.['@_href'];const date=Date.parse(String(x.pubDate??x.published??x.updated??''));return {title:clean(String(x.title?.['#text']??x.title??'')),text:clean(String(x.description??x.content?.['#text']??x.summary??'')),url:String(link??''),sourceId:source.id,publishedAt:Number.isFinite(date)?date:null};});
}
export async function collect(source:Source,fetcher:Fetcher=fetch):Promise<RawItem[]>{if(!source.enabled||source.policy!=='monitor')throw new HttpFailure('source_not_authorized');const r=await getText(source.url,fetcher);if(r.status!==200)throw new HttpFailure('http_'+r.status);return parseRss(r.text,source);}
