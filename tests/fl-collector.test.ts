import {describe,it,expect} from 'vitest';
import {collectFlPublic,parseFlPublic} from '../src/fl_collector';
import type {Source,Fetcher} from '../src/types';
const now=Date.parse('2026-10-08T07:50:00Z');
const source:Source={id:'fl-public-free',name:'FL free orders',url:'https://www.fl.ru/projects/',kind:'fl',intervalMinutes:15,enabled:true,policy:'monitor',freeReply:true,projectBoard:true,notes:''};
const card=(id:number,opts:{badge?:string,title?:string,text?:string,date?:string,kind?:string,url?:string}={})=>`<div data-id="qa-lenta-1" class="b-page__lenta_item b-post" id="project-item${id}"><div class="d-flex align-items-center gap-8">${opts.badge??'<span class="badge">Для всех</span>'}</div><div class="b-post__grid"><h2 class="b-post__title"><a data-disposable-project-id="${id}" href="${opts.url??`/projects/${id}/web-task.html`}">${opts.title??'Доработка сайта WordPress'}</a></h2><div class="b-post__txt text-5">${opts.text??'Нужно доработать каталог товаров и форму заявки.'}</div></div><div class="b-post__foot"><span class="b-post__bold">${opts.kind??'Заказ'}</span><span class="text-gray-opacity-4 text-7 mr-16">${opts.date??'10 минут назад'}</span></div></div>`;
const page=(body:string)=>`<!DOCTYPE html><html><body>${body}</body></html>`;
describe('FL public free orders',()=>{
 it('keeps genuine web order URL and timestamp with an explicit free badge',()=>{
  const xs=parseFlPublic(page(card(1)),source,now);
  expect(xs).toHaveLength(1);expect(xs[0]).toMatchObject({title:'Доработка сайта WordPress',url:'https://www.fl.ru/projects/1/web-task.html',publishedAt:now-600000,sourceId:'fl-public-free',isFreeReply:true});
 });
 it('excludes unmarked paid orders even when the page FAQ advertises free replies',()=>{
  expect(parseFlPublic(page(card(1,{badge:''})+'<section>Бесплатно можно откликаться на заказы с бейджем «для всех».</section>'),source,now)).toHaveLength(0);
 });
 it('does not treat text in the job description as a free badge',()=>expect(parseFlPublic(page(card(1,{badge:'',text:'Нужен сайт для всех устройств, бесплатно можно посмотреть макет.'})),source,now)).toHaveLength(0));
 it('uses the real relative hours and minutes rather than collection time',()=>expect(parseFlPublic(page(card(1,{date:'1 час 25 минут назад'})),source,now)[0].publishedAt).toBe(now-85*60000));
 it('preserves an explicit zoned absolute publication timestamp',()=>expect(parseFlPublic(page(card(1,{date:'<time datetime="2026-10-08T10:30:00+03:00">08.10.2026 в 10:30</time>'})),source,now)[0].publishedAt).toBe(Date.parse('2026-10-08T07:30:00Z')));
 it('keeps unknown publication time null',()=>expect(parseFlPublic(page(card(1,{date:'Недавно'})),source,now)[0].publishedAt).toBeNull());
 it.each(['Вакансия','Конкурс'])('excludes %s even with a free badge',kind=>expect(parseFlPublic(page(card(1,{kind})),source,now)).toHaveLength(0));
 it('excludes seller advertisements and nonweb assignments',()=>expect(parseFlPublic(page(card(1,{title:'Разработаю сайт WordPress',text:'Предлагаю услуги.'})+card(2,{title:'Монтаж видеоролика',text:'Нужен ролик для рекламы.'})),source,now)).toHaveLength(0));
 it('ignores offsite URLs and duplicate cards',()=>expect(parseFlPublic(page(card(1,{url:'https://evil.example/projects/1/web-task.html'})+card(2)+card(2)),source,now)).toHaveLength(1));
 it('rejects oversized or broken HTML instead of accepting a partial listing',()=>{
  expect(()=>parseFlPublic(page('я'.repeat(525000)),source,now)).toThrow('response_too_large');
  expect(()=>parseFlPublic('<html><body>'+card(1),source,now)).toThrow('invalid_html');
 });
 it('collects only authorized first-page listings through the bounded HTTP helper',async()=>{
  const fetcher=(async()=>new Response(page(card(1)),{headers:{'content-type':'text/html'}})) as Fetcher;
  expect(await collectFlPublic(source,fetcher,now)).toHaveLength(1);
  await expect(collectFlPublic({...source,url:'https://www.fl.ru/rss/all.xml'},fetcher,now)).rejects.toThrow('source_not_authorized');
  await expect(collectFlPublic({...source,policy:'review'},fetcher,now)).rejects.toThrow('source_not_authorized');
 });
 it('does not bypass redirects, access denials or the response size limit',async()=>{
  for(const status of [302,403])await expect(collectFlPublic(source,(async()=>new Response('',{status})) as Fetcher,now)).rejects.toThrow('http_'+status);
  await expect(collectFlPublic(source,(async()=>new Response('x'.repeat(1048577))) as Fetcher,now)).rejects.toThrow('response_too_large');
 });
 it('accepts a bounded complete public listing larger than the default RSS limit',async()=>{
  const fetcher=(async()=>new Response(page(card(1)+' '.repeat(280000)),{headers:{'content-type':'text/html'}})) as Fetcher;
  expect(await collectFlPublic(source,fetcher,now)).toHaveLength(1);
 });
});
