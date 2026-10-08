import type {Source} from './types';
export const sources:Source[]=[
 {id:'freelance-rss',name:'Freelance.ru RSS',url:'https://freelance.ru/rss/projects.xml',kind:'rss',intervalMinutes:30,enabled:false,policy:'review',freeReply:null,projectBoard:true,notes:'Официальный RSS; условия бесплатного отклика зависят от аккаунта, ручная проверка.'},
 {id:'workspace-rss',name:'Workspace тендеры',url:'https://workspace.ru/tenders/rss/',kind:'rss',intervalMinutes:60,enabled:true,policy:'monitor',freeReply:null,projectBoard:true,notes:'Официальный RSS HTTP 200, путь разрешён robots.txt; тендер не гарантирует бесплатный доступ к участию.'},
 {id:'fl-rss',name:'FL.ru RSS',url:'https://www.fl.ru/rss/all.xml',kind:'rss',intervalMinutes:60,enabled:false,policy:'blocked',freeReply:null,projectBoard:true,notes:'HTTP 200, но robots.txt Disallow */rss/*; регулярный сбор отключён. Отклики могут требовать PRO.'},
 {id:'telegram-group',name:'Telegram разрешённые группы',url:'https://telegram.org/',kind:'telegram',intervalMinutes:0,enabled:false,policy:'review',freeReply:null,projectBoard:false,notes:'Только Bot API updates из явно добавленных групп с разрешением администратора. Бот не читает произвольные публичные каналы.'}
];
