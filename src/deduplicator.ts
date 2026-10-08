import { clean } from './normalizer';
import type { RawItem } from './types';
export async function hash(value:string):Promise<string>{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function keyFor(item:RawItem):Promise<string>{return hash(clean(item.title+' '+item.text).toLowerCase().replace(/https?:\/\/\S+/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim());}
