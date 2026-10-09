import type {Lead} from './types';
function portfolio(t:string):string{if(/банкет|ресторан|кафе|свадеб/.test(t))return 'https://stanislavweb.ru/work/rivera-hall/';if(/стилист|эксперт|визажист/.test(t))return 'https://stanislavweb.ru/work/kristina-dimond/';if(/киберарен|компьютерн.{0,8}клуб/.test(t))return 'https://stanislavweb.ru/work/n7/';return 'https://stanislavweb.ru/#work';}
export function buildMessage(l:Lead):string {
 const t=(l.title+' '+l.text).toLowerCase();
 if(/ignore previous|system prompt|игнорируй|отправь токен|выполни команд|\$\(/i.test(t))return 'Запрос содержит подозрительный текст. Сначала проверьте оригинал; автоматический черновик не сформирован.';
 if(l.category==='partner')return 'Здравствуйте! Увидел ваш запрос на разработчика для проектов. Занимаюсь вёрсткой, WordPress и React/Next.js. Могу подключаться к вашим макетам и доработкам. Примеры работ: https://stanislavweb.ru/#work. Какие задачи сейчас нужно передать? Telegram @Butov52';
 if(l.category==='business')return 'Здравствуйте! При ограниченной проверке сайта обнаружил: '+l.problems.filter(p=>p.confirmed).slice(0,2).map(p=>p.type).join(', ')+'. Могу проверить причины и предложить исправление. Примеры работ: https://stanislavweb.ru/#work. Telegram @Butov52';
 const task=/корзин|магазин|каталог/.test(t)?'каталогом и оформлением заказа':/wordpress/.test(t)?'доработкой WordPress':/ошибк|почин|исправ|доработ/.test(t)?'исправлением сайта':/верст|вёрст|figma|макет/.test(t)?'адаптивной вёрсткой по макету':/лендинг/.test(t)?'лендингом':/бот/.test(t)?'Telegram-ботом и веб-интеграцией':'разработкой сайта';
 return `Здравствуйте! Увидел ваш запрос «${l.title.replace(/[«»\n]/g,' ').slice(0,100)}». Могу помочь с ${task}. Пример работы: ${portfolio(t)}. Подскажите, какие сроки и есть ли подробное описание задачи? Telegram @Butov52`;
}
