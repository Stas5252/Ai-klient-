import type {Env} from './types';
import {Store} from './storage';
export async function critical(s:Store,env:Env,code:string){console.error(JSON.stringify({level:'error',code,at:Date.now()}));try{await s.error(code);if(env.ADMIN_CHAT_ID){const day=new Date().toISOString().slice(0,10);await s.enqueue(`error:${code}:${day}`,env.ADMIN_CHAT_ID,'Ошибка Web Lead Machine: '+code+'. /health покажет состояние.');}}catch{/* No raw exception logging: SDK errors can contain credentials. */}}
