import type {Source,Env,Fetcher,RawItem} from './types';
import {collect} from './collectors';
import {collectFlPublic} from './fl_collector';
import {collectThreads,collectVK} from './social_collectors';
import {HttpFailure} from './http';

export function sourceAuthorizationError(source:Source,env:Env):string|null{
 if(source.kind==='threads'&&!env.THREADS_ACCESS_TOKEN?.trim())return 'needs_threads_authorization';
 if(source.kind==='threads'&&env.THREADS_PUBLIC_SEARCH_VERIFIED!=='1')return 'needs_threads_public_search_verification';
 if(source.kind==='vk'&&!env.VK_ACCESS_TOKEN?.trim())return 'needs_vk_authorization';
 return null;
}

export async function collectSource(source:Source,env:Env,fetcher:Fetcher=fetch,now=Date.now()):Promise<RawItem[]>{
 if(!source.enabled||source.policy!=='monitor'||source.kind==='telegram')throw new HttpFailure('source_not_authorized');
 const authorization=sourceAuthorizationError(source,env);if(authorization)throw new HttpFailure(authorization);
 // Social adapters deliberately redact transport failures; retain the shared quota
 // signal outside their error handling so daily quota exhaustion stays observable.
 let quotaExceeded=false;
 const bounded:Fetcher=async(input,init)=>{try{return await fetcher(input,init);}catch(e){if(e instanceof HttpFailure&&e.code==='daily_http_quota')quotaExceeded=true;throw e;}};
 try{
  if(source.kind==='rss')return await collect(source,bounded);
  if(source.kind==='fl')return await collectFlPublic(source,bounded,now);
  if(source.kind==='threads')return await collectThreads(source,env,bounded,now);
  if(source.kind==='vk')return await collectVK(source,env,bounded,now);
  throw new HttpFailure('source_not_authorized');
 }catch(e){if(quotaExceeded)throw new HttpFailure('daily_http_quota');throw e;}
}
