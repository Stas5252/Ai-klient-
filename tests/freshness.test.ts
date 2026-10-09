import {it,expect} from 'vitest';
import {freshWindowMs,isFresh,isFreshFreeLead,ageLabel} from '../src/freshness';
const now=Date.parse('2026-10-08T08:00:00Z');
const lead=(extra={})=>({publishedAt:now-10*60000,category:'order',isFreeReply:true,...extra}) as any;
it('defaults to original publication within one hour',()=>{expect(freshWindowMs({} as any)).toBe(3600000);expect(isFresh(lead(),now,{} as any)).toBe(true);expect(isFresh(lead({publishedAt:now-2*3600000}),now,{} as any)).toBe(false);});
it('unknown, future and malformed dates are never fresh',()=>{for(const date of [null,undefined,NaN,now+1000])expect(isFresh(lead({publishedAt:date}),now,{} as any)).toBe(false);});
it('free reply is mandatory for discovered orders and partners',()=>{expect(isFreshFreeLead(lead(),now,{} as any)).toBe(true);expect(isFreshFreeLead(lead({isFreeReply:undefined}),now,{} as any)).toBe(false);expect(isFreshFreeLead(lead({isFreeReply:false}),now,{} as any)).toBe(false);});
it('window settings are bounded and invalid values use default',()=>{expect(freshWindowMs({FRESH_WINDOW_MINUTES:'0'} as any)).toBe(3600000);expect(freshWindowMs({FRESH_WINDOW_MINUTES:'99999'} as any)).toBe(86400000);expect(freshWindowMs({FRESH_WINDOW_MINUTES:'5'} as any)).toBe(300000);});
it('age label uses publication, not discovery',()=>{expect(ageLabel(lead(),now)).toBe('10 минут назад');expect(ageLabel(lead({publishedAt:null}),now)).toBe('дата не подтверждена');});
