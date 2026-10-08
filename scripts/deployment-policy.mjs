export function freeDeploymentAllowed(state,now=Date.now()){
 if(Array.isArray(state.subscriptions)){
  const plans=state.subscriptions.filter(s=>/worker|developer platform/i.test((s.rate_plan?.id||'')+' '+(s.rate_plan?.public_name||'')));
  return !plans.some(s=>!/(?:free|zero)/i.test((s.rate_plan?.id||'')+' '+(s.rate_plan?.public_name||''))||Number(s.price??0)>0);
 }
 // Initial setup only: newly created empty account, no paid feature entitlements.
 // Existing accounts with unreadable billing never qualify for this fallback.
 return Array.isArray(state.entitlements)&&state.entitlements.length===0&&Array.isArray(state.scripts)&&state.scripts.length===0&&Array.isArray(state.databases)&&state.databases.length===0&&Number.isFinite(state.accountCreatedAt)&&now-state.accountCreatedAt>=0&&now-state.accountCreatedAt<86400000;
}
