export type Priority = 'A+'|'A'|'B'|'C'|'D';
export type Category = 'order'|'partner'|'business'|'inbound';
export interface Source { id:string; name:string; url:string; kind:'rss'|'telegram'; intervalMinutes:number; enabled:boolean; policy:'monitor'|'blocked'|'review'; freeReply:boolean|null; projectBoard:boolean; notes:string; }
export interface RawItem { title:string; text:string; url:string; sourceId:string; publishedAt:number|null; author?:string; region?:string; }
export interface Lead extends RawItem { id:string; contentKey:string; budget:number|null; budgetMax?:number|null; budgetKind?:'exact'|'up_to'|'from'|'range'|null; currency:'RUB'|null; discoveredAt:number; checkedAt:number; category:Category; priority:Priority; score:number; confidence:'high'|'medium'|'low'; needsReview:boolean; status:string; message:string; doNotContact:boolean; contact:string|null; problems:Problem[]; reasons:string[]; }
export interface Problem { type:string; severity:'high'|'medium'|'low'; evidence:string; checkedAt:number; solution:string; costHint:string; confirmed:boolean; }
export interface Env { DB:D1Database; TELEGRAM_BOT_TOKEN?:string; TELEGRAM_WEBHOOK_SECRET?:string; ADMIN_IDS?:string; ADMIN_CHAT_ID?:string; ADMIN_API_KEY?:string; SUPPRESSION_SALT?:string; MAX_SOURCE_REQUESTS_DAY?:string; RETENTION_DAYS?:string; TELEGRAM_GROUP_IDS?:string; BUSINESS_BBOX?:string; }
export interface Permission { approved:boolean; consent:boolean; platformAllows:boolean; recipientVerified:boolean; adapter:string; }
export type Fetcher = typeof fetch;
