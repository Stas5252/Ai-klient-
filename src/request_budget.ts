import type {Env,Fetcher} from './types';
import {Store} from './storage';
import {HttpFailure} from './http';
export function sourceRequestLimit(env:Env):number{return Math.min(2000,Math.max(0,Number(env.MAX_SOURCE_REQUESTS_DAY??1000)||0));}
export function budgetedFetch(s:Store,env:Env,fetcher:Fetcher=fetch):Fetcher{return async(input,init)=>{const day=new Date().toISOString().slice(0,10),max=sourceRequestLimit(env);let telegram=false;try{const url=new URL(input instanceof Request?input.url:String(input));telegram=url.origin==='https://api.telegram.org';}catch{}const limit=telegram?max:max-Math.floor(max*0.1);if(!await s.consume('http:'+day,limit))throw new HttpFailure('daily_http_quota');return fetcher(input,init);};}
