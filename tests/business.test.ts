import {it,expect} from 'vitest';
import {businessFromMap,discoverBusinesses} from '../src/business_discovery';
it('missing map link remains unverified',()=>{const l=businessFromMap({type:'node',id:1,tags:{name:'Салон',shop:'beauty'}},1000);expect(l.priority).toBe('D');expect(l.needsReview).toBe(true);expect(l.text).not.toContain('сайта нет');});
it('known website retained as map evidence',()=>{const l=businessFromMap({type:'node',id:2,tags:{name:'Магазин',website:'https://example.com',phone:'personal-phone'}},1000);expect(l.text).toContain('https://example.com');expect(JSON.stringify(l)).not.toContain('personal-phone');});
it('large area rejected before network request',async()=>{let n=0;await expect(discoverBusinesses('1,1,80,80',async()=>{n++;return new Response('{}');})).rejects.toThrow('bbox');expect(n).toBe(0);});
