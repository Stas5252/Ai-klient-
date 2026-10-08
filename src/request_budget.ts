import type {Env,Fetcher} from './types';
import {Store} from './storage';
import {HttpFailure} from './http';
export function budgetedFetch(s:Store,env:Env,fetcher:Fetcher=fetch):Fetcher{return async(input,init)=>{const day=new Date().toISOString().slice(0,10);const max=Math.min(500,Math.max(0,Number(env.MAX_SOURCE_REQUESTS_DAY??200)||0));if(!await s.consume('http:'+day,max))throw new HttpFailure('daily_http_quota');return fetcher(input,init);};}
