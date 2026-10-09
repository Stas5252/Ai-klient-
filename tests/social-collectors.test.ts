import {it,expect} from 'vitest';
import type {Source,Env,Fetcher} from '../src/types';
import {HttpFailure} from '../src/http';
import {collectThreads,collectVK} from '../src/social_collectors';

// These assertions exercise the production collector through its external API;
// only the HTTP transport is substituted, so no real account or network is used.
const collectors=async()=>({collectThreads,collectVK});
const now=Date.parse('2026-10-08T12:00:00Z');
const source=(kind:'threads'|'vk',extra:Partial<Source>={}):Source=>({id:kind,name:kind,url:kind==='threads'?'https://graph.threads.com/v1.0/keyword_search':'https://api.vk.com/method/newsfeed.search',kind,intervalMinutes:60,enabled:true,policy:'monitor',freeReply:null,projectBoard:false,notes:'Authorization required; live connection unverified',...extra});
const env=(extra:Partial<Env>={}):Env=>({DB:{} as any,...extra});
const reply=(body:unknown,status=200):Fetcher=>(async()=>new Response(JSON.stringify(body),{status})) as Fetcher;

it.each(['threads','vk'] as const)('%s refuses missing authorization before issuing a request',async provider=>{
 const m=await collectors();let calls=0;
 const fetcher=(async()=>{calls++;throw Error('must not run');}) as Fetcher;
 await expect((provider==='threads'?m.collectThreads:m.collectVK)(source(provider),env(),fetcher,now)).rejects.toMatchObject({code:`needs_${provider}_authorization`});
 expect(calls).toBe(0);
});

it('Threads requests recent keyword posts inside the exact freshness window without token URLs',async()=>{
 const {collectThreads}=await collectors();let requestUrl='';let init:RequestInit|undefined;
 const fetcher=(async(input,options)=>{requestUrl=String(input);init=options;return new Response(JSON.stringify({data:[]}));}) as Fetcher;
 await collectThreads(source('threads',{query:'ищу разработчика сайта'}),env({THREADS_ACCESS_TOKEN:'test-private-token',FRESH_WINDOW_MINUTES:'90'}),fetcher,now);
 const u=new URL(requestUrl);
 expect(u.origin+u.pathname).toBe('https://graph.threads.com/v1.0/keyword_search');
 expect(u.searchParams.get('q')).toBe('ищу разработчика сайта');
 expect(u.searchParams.get('search_type')).toBe('RECENT');
 expect(u.searchParams.get('search_mode')).toBe('KEYWORD');
 expect(u.searchParams.get('since')).toBe(String(now/1000-5400));
 expect(u.searchParams.get('until')).toBe(String(now/1000));
 expect(u.searchParams.get('limit')).toBe('25');
 expect(u.searchParams.get('fields')?.split(',')).toEqual(expect.arrayContaining(['id','text','timestamp','permalink']));
 expect(requestUrl).not.toContain('test-private-token');
 expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-private-token');
 expect(init?.redirect).toBe('manual');
});

it('VK uses a form POST and keeps the API key out of its URL',async()=>{
 const {collectVK}=await collectors();let url='';let init:RequestInit|undefined;
 const fetcher=(async(input,options)=>{url=String(input);init=options;return new Response(JSON.stringify({response:{items:[]}}));}) as Fetcher;
 await collectVK(source('vk'),env({VK_ACCESS_TOKEN:'vk-private-token'}),fetcher,now);
 expect(url).toBe('https://api.vk.com/method/newsfeed.search');
 expect(url).not.toContain('vk-private-token');
 expect(init?.method).toBe('POST');
 expect(new Headers(init?.headers).get('Content-Type')).toBe('application/x-www-form-urlencoded');
 const form=new URLSearchParams(String(init?.body));
 expect(form.get('access_token')).toBe('vk-private-token');
 expect(form.get('v')).toBe('5.199');
 expect(form.get('q')).toBe('нужен сайт');
 expect(form.get('count')).toBe('25');
 expect(form.get('start_time')).toBe(String(now/1000-3600));
 expect(form.get('end_time')).toBe(String(now/1000));
 expect(init?.redirect).toBe('manual');
});

it('Threads preserves original timestamps, sorts newest first and leaves absent timestamps null',async()=>{
 const {collectThreads}=await collectors();
 const out=await collectThreads(source('threads'),env({THREADS_ACCESS_TOKEN:'fake'}),reply({data:[
  {id:'older',text:'Нужен сайт для магазина',timestamp:'2026-10-08T11:10:00+0000',permalink:'https://www.threads.com/@example/post/older'},
  {id:'undated',text:'Нужен лендинг',permalink:'https://www.threads.com/@example/post/undated'},
  {id:'newest',text:'Ищу разработчика сайта',timestamp:'2026-10-08T14:55:00+0300',permalink:'https://www.threads.com/@example/post/newest'},
  {id:'stale',text:'Нужен сайт',timestamp:'2026-10-07T10:00:00Z',permalink:'https://www.threads.com/@example/post/stale'},
  {id:'future',text:'Нужен сайт',timestamp:'2026-10-08T12:01:00Z',permalink:'https://www.threads.com/@example/post/future'}
 ]}),now);
 expect(out.map(x=>x.url.split('/').pop())).toEqual(['newest','older','undated']);
 expect(out.map(x=>x.publishedAt)).toEqual([now-5*60000,now-50*60000,null]);
 expect(out.every(x=>x.sourceId==='threads')).toBe(true);
});

it('VK preserves seconds-based dates and creates original wall permalinks',async()=>{
 const {collectVK}=await collectors();
 const out=await collectVK(source('vk'),env({VK_ACCESS_TOKEN:'fake'}),reply({response:{items:[
  {owner_id:-42,id:1,date:now/1000-600,text:'Нужен сайт'},
  {owner_id:17,id:2,date:now/1000-60,text:'Ищу разработчика'},
  {owner_id:-42,id:3,text:'Нужен лендинг'},
  {owner_id:17,id:4,date:now/1000-86400,text:'Нужен сайт'},
  {owner_id:17,id:5,date:now/1000+1,text:'Нужен сайт'}
 ]}}),now);
 expect(out.map(x=>x.url)).toEqual(['https://vk.com/wall17_2','https://vk.com/wall-42_1','https://vk.com/wall-42_3']);
 expect(out.map(x=>x.publishedAt)).toEqual([now-60000,now-600000,null]);
});

it('does not infer missing dates from collection time or accept malformed IDs and links',async()=>{
 const {collectThreads,collectVK}=await collectors();
 const t=await collectThreads(source('threads'),env({THREADS_ACCESS_TOKEN:'fake'}),reply({data:[
  {id:'1',text:'Нужен сайт',timestamp:'invalid',permalink:'https://www.threads.com/@example/post/ok'},
  {text:'Нужен сайт',permalink:'https://www.threads.com/@example/post/noid'},
  {id:'2',text:'Нужен сайт',permalink:'javascript:alert(1)'},
  {id:'3',text:'Нужен сайт',permalink:'https://evil.example/post/3'}
 ]}),now);
 expect(t).toHaveLength(1);expect(t[0].publishedAt).toBeNull();
 const v=await collectVK(source('vk'),env({VK_ACCESS_TOKEN:'fake'}),reply({response:{items:[
  {owner_id:-42,id:1,date:'invalid',text:'Нужен сайт'},
  {owner_id:'-42?access_token=private',id:2,text:'Нужен сайт'},
  {owner_id:0,id:3,text:'Нужен сайт'}
 ]}}),now);
 expect(v).toHaveLength(1);expect(v[0].publishedAt).toBeNull();
});

it('excludes closed requests and reposts instead of using their republish date as fresh demand',async()=>{
 const {collectThreads,collectVK}=await collectors();
 const t=await collectThreads(source('threads'),env({THREADS_ACCESS_TOKEN:'fake'}),reply({data:[
  {id:'1',text:'Нужен сайт. Исполнитель найден',timestamp:new Date(now).toISOString(),permalink:'https://www.threads.com/@example/post/1'},
  {id:'2',text:'Нужен сайт',is_quote_post:true,timestamp:new Date(now).toISOString(),permalink:'https://www.threads.com/@example/post/2'},
  {id:'3',text:'Нужен сайт',is_reply:true,timestamp:new Date(now).toISOString(),permalink:'https://www.threads.com/@example/post/3'}
 ]}),now);
 expect(t).toEqual([]);
 const v=await collectVK(source('vk'),env({VK_ACCESS_TOKEN:'fake'}),reply({response:{items:[
  {owner_id:-42,id:1,date:now/1000,text:'Нужен сайт. Заказ закрыт'},
  {owner_id:-42,id:2,date:now/1000,text:'Нужен сайт',copy_history:[{date:now/1000-86400}]}
 ]}}),now);
 expect(v).toEqual([]);
});

it.each(['threads','vk'] as const)('%s returns at most 25 records even if the provider sends more',async provider=>{
 const m=await collectors();
 const items=Array.from({length:40},(_,i)=>provider==='threads'?{id:String(i+1),text:'Нужен сайт',timestamp:new Date(now-i*1000).toISOString(),permalink:`https://www.threads.com/@example/post/${i+1}`}:{owner_id:-42,id:i+1,date:now/1000-i,text:'Нужен сайт'});
 const out=await (provider==='threads'?m.collectThreads:m.collectVK)(source(provider),env({THREADS_ACCESS_TOKEN:'fake',VK_ACCESS_TOKEN:'fake'}),reply(provider==='threads'?{data:items}:{response:{items}}),now);
 expect(out).toHaveLength(25);
});

it.each(['threads','vk'] as const)('%s exposes only a safe numeric permission-error code',async provider=>{
 const m=await collectors();const payload=provider==='threads'?{error:{code:10,message:'private-token permission account details'}}:{error:{error_code:7,error_msg:'private-token permission account details',request_params:[{key:'access_token',value:'private-token'}]}};
 const failure=await (provider==='threads'?m.collectThreads:m.collectVK)(source(provider),env({THREADS_ACCESS_TOKEN:'private-token',VK_ACCESS_TOKEN:'private-token'}),reply(payload,provider==='threads'?403:200),now).catch(e=>e);
 expect(failure).toBeInstanceOf(HttpFailure);
 expect(failure.code).toBe(`${provider}_api_error_${provider==='threads'?10:7}`);
 expect(String(failure)).not.toMatch(/private-token|account details|permission/);
});

it.each(['threads','vk'] as const)('%s sanitizes transport exceptions and malformed API errors',async provider=>{
 const m=await collectors();const run=provider==='threads'?m.collectThreads:m.collectVK;const e=env({THREADS_ACCESS_TOKEN:'private-token',VK_ACCESS_TOKEN:'private-token'});
 const fetcher=(async()=>{throw Error('private-token raw network details');}) as Fetcher;
 await expect(run(source(provider),e,fetcher,now)).rejects.toMatchObject({code:`${provider}_network_uncertain`,message:`${provider}_network_uncertain`});
 const failure=await run(source(provider),e,reply({error:{code:'private-token',error_code:'private-token',message:'private-token'}}),now).catch(x=>x);
 expect(failure.code).toBe(`${provider}_api_error_unknown`);
 expect(String(failure)).not.toContain('private-token');
});

it.each(['threads','vk'] as const)('%s bounds responses at 256 KiB and sanitizes invalid JSON',async provider=>{
 const m=await collectors();const run=provider==='threads'?m.collectThreads:m.collectVK;const e=env({THREADS_ACCESS_TOKEN:'fake',VK_ACCESS_TOKEN:'fake'});
 await expect(run(source(provider),e,(async()=>new Response('x'.repeat(262145))) as Fetcher,now)).rejects.toMatchObject({code:'response_too_large'});
 await expect(run(source(provider),e,(async()=>new Response('invalid private-token data')) as Fetcher,now)).rejects.toMatchObject({code:`${provider}_invalid_response`,message:`${provider}_invalid_response`});
});

it.each(['threads','vk'] as const)('%s never collects a disabled or policy-blocked source',async provider=>{
 const m=await collectors();let calls=0;const fetcher=(async()=>{calls++;throw Error('must not run');}) as Fetcher;
 const run=provider==='threads'?m.collectThreads:m.collectVK;
 for(const extra of [{enabled:false},{policy:'blocked' as const},{policy:'review' as const}])await expect(run(source(provider,extra),env({THREADS_ACCESS_TOKEN:'fake',VK_ACCESS_TOKEN:'fake'}),fetcher,now)).rejects.toMatchObject({code:'source_not_authorized'});
 expect(calls).toBe(0);
});
