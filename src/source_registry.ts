import type {Source} from './types';
export const sources:Source[]=[
 {id:'freelance-rss',name:'Freelance.ru',url:'https://freelance.ru/task',kind:'rss',intervalMinutes:30,enabled:false,policy:'review',freeReply:false,projectBoard:true,notes:'Рабочий RSS не найден; правила §9.1 требуют покупки пакета откликов даже для базового аккаунта.'},
 {id:'workspace-rss',name:'Workspace тендеры',url:'https://workspace.ru/tenders/rss/',kind:'rss',intervalMinutes:60,enabled:false,policy:'review',freeReply:null,projectBoard:true,notes:'Отключён: бесплатный отклик не подтверждён, проверенные веб-заказы старше одного часа.'},
 {id:'fl-rss',name:'FL.ru RSS',url:'https://www.fl.ru/rss/all.xml',kind:'rss',intervalMinutes:60,enabled:false,policy:'blocked',freeReply:null,projectBoard:true,notes:'Robots.txt Disallow */rss/*; RSS не используется. Бесплатны только заказы с собственным бейджем «для всех».'},
 {id:'fl-public-free',name:'FL.ru бесплатные веб-заказы',url:'https://www.fl.ru/projects/',kind:'fl',intervalMinutes:15,enabled:true,policy:'monitor',freeReply:true,projectBoard:true,notes:'Публичная первая страница, только тип «Заказ» с собственным подтверждённым бейджем «Для всех». Живая проверка: 0 подходящих карточек; новых заказов не обещаем. Без авторизации и пагинации.'},
 {id:'telegram-group',name:'Telegram группы',url:'https://telegram.org/',kind:'telegram',intervalMinutes:0,enabled:false,policy:'review',freeReply:null,projectBoard:false,notes:'Сбор из групп выключен: одного разрешения администратора недостаточно для обработки чужого контента. Работают добровольные личные входящие через бота.'}
];
const queries=['нужен сайт','нужен лендинг','ищу разработчика сайта','доработка сайта','сверстать сайт','создать интернет-магазин','ищем веб-разработчика','разработка сайта'];
for(const [index,query] of queries.entries()){
 const intervalMinutes=index===0?15:60;
 sources.push({id:`threads-${index+1}`,name:`Threads: ${query}`,url:'https://graph.threads.com/v1.0/keyword_search',kind:'threads',query,intervalMinutes,enabled:true,policy:'monitor',freeReply:true,projectBoard:false,notes:'Официальный API; нужен токен, approved threads_keyword_search/threads_basic и реальный тест чужого публичного поста перед THREADS_PUBLIC_SEARCH_VERIFIED=1. Без допуска 0 запросов. Подключение не подтверждено.'});
 sources.push({id:`vk-${index+1}`,name:`VK: ${query}`,url:'https://api.vk.com/method/newsfeed.search',kind:'vk',query,intervalMinutes,enabled:true,policy:'monitor',freeReply:true,projectBoard:false,notes:'Настроен официальный API newsfeed.search, подключение не подтверждено. Нужен пользовательский токен с доступом к методу; без токена 0 запросов. Ответ на явный запрос вручную.'});
}
