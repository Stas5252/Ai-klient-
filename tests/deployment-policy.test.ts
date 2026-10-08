import {it,expect} from 'vitest';
import {freeDeploymentAllowed} from '../scripts/deployment-policy.mjs';
it('paid Worker subscription always rejected',()=>expect(freeDeploymentAllowed({subscriptions:[{rate_plan:{id:'workers_paid'},price:5}]})).toBe(false));
it('explicit free subscription accepted',()=>expect(freeDeploymentAllowed({subscriptions:[{rate_plan:{id:'workers_free'},price:0}]})).toBe(true));
it('fresh empty account with zero entitlements permits initial Free deployment',()=>expect(freeDeploymentAllowed({subscriptions:null,entitlements:[],scripts:[],databases:[],accountCreatedAt:Date.now()-60000},Date.now())).toBe(true));
it('unknown or old account without billing access rejected',()=>expect(freeDeploymentAllowed({subscriptions:null,entitlements:[],scripts:[],databases:[],accountCreatedAt:Date.now()-3*86400000},Date.now())).toBe(false));
it('any existing entitlement blocks bootstrap fallback',()=>expect(freeDeploymentAllowed({subscriptions:null,entitlements:[{id:'paid'}],scripts:[],databases:[],accountCreatedAt:Date.now()},Date.now())).toBe(false));
