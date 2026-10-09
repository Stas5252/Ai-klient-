import type {Source,Env,Fetcher,RawItem} from './types';
import {HttpFailure,readLimited} from './http';
import {clean} from './normalizer';

// Auth-dependent adapters tested with substituted HTTP only. Live connections
// remain unverified until each owner's real token passes an official API check.
// Threads public results require approved threads_keyword_search + threads_basic;
// an unapproved search permission searches only the authenticated user's posts.
const THREADS_ENDPOINT='https://graph.threads.com/v1.0/keyword_search';
const VK_ENDPOINT='https://api.vk.com/method/newsfeed.search';
const closed=/заказ закрыт|исполнитель найден|уже нашли|не актуальн|неактуальн|проект заверш[её]н/i;
type Provider='threads'|'vk';
type RecordValue=Record<string,unknown>;
function record(value:unknown):RecordValue|null{return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as RecordValue:null;}
function authorize(source:Source,token:string|undefined,provider:Provider):string{
 if(!source.enabled||source.policy!=='monitor'||source.kind!==provider)throw new HttpFailure('source_not_authorized');
 if(!token?.trim())throw new HttpFailure(`needs_${provider}_authorization`);
 return token;
}
function bounds(env:Env,now:number):{since:number;until:number}{
 const minutes=Number(env.FRESH_WINDOW_MINUTES??'60');
 const window=Number.isFinite(minutes)&&minutes>0?minutes:60;
 return {since:Math.max(0,Math.floor((now-window*60000)/1000)),until:Math.floor(now/1000)};
}
function errorCode(value:unknown):string{return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?String(value):'unknown';}
async function request(provider:Provider,url:string,init:RequestInit,fetcher:Fetcher):Promise<RecordValue>{
 let response:Response;
 try{response=await fetcher(url,{...init,redirect:'manual',signal:AbortSignal.timeout(8000)});}
 catch{throw new HttpFailure(`${provider}_network_uncertain`);}
 let text:string;
 try{text=await readLimited(response);}
 catch(e){if(e instanceof HttpFailure&&e.code==='response_too_large')throw e;throw new HttpFailure(`${provider}_network_uncertain`);}
 let parsed:RecordValue|null;
 try{parsed=record(JSON.parse(text));}
 catch{throw new HttpFailure(response.ok?`${provider}_invalid_response`:`${provider}_http_${response.status}`);}
 if(!parsed)throw new HttpFailure(response.ok?`${provider}_invalid_response`:`${provider}_http_${response.status}`);
 if(parsed.error){const error=record(parsed.error);throw new HttpFailure(`${provider}_api_error_${errorCode(error?.[provider==='vk'?'error_code':'code'])}`);}
 if(!response.ok)throw new HttpFailure(`${provider}_http_${response.status}`);
 return parsed;
}
function keepFresh(items:RawItem[],time:{since:number;until:number}):RawItem[]{
 return items.filter(x=>x.publishedAt===null||(x.publishedAt>=time.since*1000&&x.publishedAt<=time.until*1000))
  .sort((a,b)=>(b.publishedAt??-Infinity)-(a.publishedAt??-Infinity)).slice(0,25);
}
function threadsLink(value:unknown):string|null{
 if(typeof value!=='string')return null;
 try{const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.port||!['threads.com','www.threads.com','threads.net','www.threads.net'].includes(url.hostname)||!/^\/@[^/]+\/post\/[\w-]+\/?$/.test(url.pathname))return null;
  url.search='';url.hash='';return url.toString();
 }catch{return null;}
}

export async function collectThreads(source:Source,env:Env,fetcher:Fetcher,now:number):Promise<RawItem[]>{
 const token=authorize(source,env.THREADS_ACCESS_TOKEN,'threads');
 const time=bounds(env,now),url=new URL(THREADS_ENDPOINT);
 url.searchParams.set('q',source.query?.trim()||'нужен сайт');
 url.searchParams.set('search_type','RECENT');url.searchParams.set('search_mode','KEYWORD');
 url.searchParams.set('since',String(time.since));url.searchParams.set('until',String(time.until));
 // The extra flags let us discard quotes/replies whose timestamp could otherwise
 // be confused with an original buyer request's publication date.
 url.searchParams.set('fields','id,text,timestamp,permalink,is_quote_post,is_reply');
 url.searchParams.set('limit','25');
 const body=await request('threads',url.toString(),{method:'GET',headers:{Authorization:`Bearer ${token}`}},fetcher);
 if(!Array.isArray(body.data))throw new HttpFailure('threads_invalid_response');
 const items:RawItem[]=[];
 for(const value of body.data){
  const post=record(value);if(!post||typeof post.id!=='string'||!post.id||post.is_quote_post===true||post.is_reply===true)continue;
  const link=threadsLink(post.permalink),text=typeof post.text==='string'?clean(post.text):'';
  if(!link||!text||closed.test(text))continue;
  const date=typeof post.timestamp==='string'?Date.parse(post.timestamp):NaN;
  items.push({title:text.slice(0,140),text,url:link,sourceId:source.id,publishedAt:Number.isFinite(date)&&date>0?date:null});
 }
 return keepFresh(items,time);
}

export async function collectVK(source:Source,env:Env,fetcher:Fetcher,now:number):Promise<RawItem[]>{
 const token=authorize(source,env.VK_ACCESS_TOKEN,'vk');
 const time=bounds(env,now),form=new URLSearchParams({v:'5.199',q:source.query?.trim()||'нужен сайт',count:'25',start_time:String(time.since),end_time:String(time.until),access_token:token});
 const body=await request('vk',VK_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form.toString()},fetcher);
 const response=record(body.response);if(!response||!Array.isArray(response.items))throw new HttpFailure('vk_invalid_response');
 const items:RawItem[]=[];
 for(const value of response.items){
  const post=record(value);if(!post||typeof post.owner_id!=='number'||!Number.isSafeInteger(post.owner_id)||post.owner_id===0||typeof post.id!=='number'||!Number.isSafeInteger(post.id)||post.id<=0)continue;
  if(post.is_deleted===true||(Array.isArray(post.copy_history)&&post.copy_history.length>0))continue;
  const text=typeof post.text==='string'?clean(post.text):'';if(!text||closed.test(text))continue;
  const date=typeof post.date==='number'&&Number.isSafeInteger(post.date)&&post.date>0?post.date*1000:null;
  items.push({title:text.slice(0,140),text,url:`https://vk.com/wall${post.owner_id}_${post.id}`,sourceId:source.id,publishedAt:date});
 }
 return keepFresh(items,time);
}
