import type {Fetcher} from './types';
export class HttpFailure extends Error { constructor(public code:string,public retryAfter=0){super(code);} }
export async function readLimited(r:Response,limit=262144):Promise<string>{if(Number(r.headers.get('content-length')||0)>limit){await r.body?.cancel();throw new HttpFailure('response_too_large');}if(!r.body)return '';const reader=r.body.getReader();const chunks:Uint8Array[]=[];let size=0;try{while(true){const x=await reader.read();if(x.done)break;size+=x.value.byteLength;if(size>limit)throw new HttpFailure('response_too_large');chunks.push(x.value);}}finally{await reader.cancel();}const bytes=new Uint8Array(size);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.byteLength;}return new TextDecoder().decode(bytes);}
export async function getText(url:string,fetcher:Fetcher=fetch,attempts=2):Promise<{text:string;status:number;contentType:string;url:string}>{
 for(let i=0;i<attempts;i++){
  try{const r=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{'User-Agent':'WebLeadMachine/0.1 (+https://stanislavweb.ru/)'}});
   if(r.status===429||r.status>=500){await r.body?.cancel();throw new HttpFailure('http_'+r.status,Math.max(0,Number(r.headers.get('retry-after')||0))*1000);}
   const text=await readLimited(r);return {text,status:r.status,contentType:r.headers.get('content-type')||'',url};
  }catch(e){if(e instanceof HttpFailure&&!/^http_(?:429|5\d\d)$/.test(e.code))throw e;if(i===attempts-1)throw e instanceof HttpFailure?e:new HttpFailure('network_uncertain');await new Promise(r=>setTimeout(r,150*2**i));}
 }
 throw new HttpFailure('network_uncertain');
}
