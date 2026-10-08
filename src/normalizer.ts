export function clean(text:string):string { return text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&#(\d+);/g,(_,n)=>{const x=Number(n);return x<=0x10ffff?String.fromCodePoint(x):'';}).replace(/&(?:nbsp|amp|quot|lt|gt);/g,m=>({'&nbsp;':' ','&amp;':'&','&quot;':'"','&lt;':'<','&gt;':'>'}[m]!)).replace(/\s+/g,' ').trim().slice(0,6000); }
export function canonicalUrl(value:string):string|null { try { const u=new URL(value); if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return null;u.hash='';for(const k of [...u.searchParams.keys()])if(k.startsWith('utm_')||['ref','from','yclid'].includes(k))u.searchParams.delete(k);return u.toString(); }catch{return null;} }
export function budgetRange(text:string):{budget:number|null;budgetMax:number|null;budgetKind:'exact'|'up_to'|'from'|'range'|null} {
 const range=text.match(/(?:от\s*)?(\d[\d \u00a0]{0,12})\s*(?:до|[-–—])\s*(\d[\d \u00a0]{0,12})\s*(?:₽|руб(?:лей|ля|ль|\.)?|р\.|RUB)/i);
 if(range)return {budget:Number(range[1].replace(/\s/g,'')),budgetMax:Number(range[2].replace(/\s/g,'')),budgetKind:'range'};
 const m=text.match(/(от|до)?\s*(\d[\d \u00a0]{0,12})\s*(?:₽|руб(?:лей|ля|ль|\.)?|р\.|RUB)/i);
 if(!m)return {budget:null,budgetMax:null,budgetKind:null};const n=Number(m[2].replace(/\s/g,''));return {budget:Number.isFinite(n)&&n>=0?n:null,budgetMax:null,budgetKind:m[1]?.toLowerCase()==='до'?'up_to':m[1]?.toLowerCase()==='от'?'from':'exact'};
}
export function budgetOf(text:string):number|null{return budgetRange(text).budget;}
