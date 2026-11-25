import { api } from 'sdk';
import config from './config.js';
import { sendMenu } from './menu.js';
import { validName, validBadge } from './logic.js';
import { getDraft, clearDraft, begin, setBadge, setFirst, setLast, setPhoto, setUrl, acquire, release } from './session.js';
import { uploadPhoto, writeRow } from './services.js';
export const send=(id,text)=>api.sendMessage({chat_id:id,text});
export const allowed=id=>config.allowedUserIds.map(String).includes(String(id));
export const prompts={badge:'Введите номер бейджа:',first:'Введите имя:',last:'Введите фамилию:',photo:'Отправьте одну фотографию. Ссылка будет доступна всем, у кого она есть.',retry:'Фото принято. Для повторной попытки отправьте /retry.'};
export async function startForm(id){const d=await begin(id); await send(id,prompts[d.stage]);}
async function save(id,messageId){
  const owner=String(id)+':'+String(messageId)+':'+String(Date.now());
  if(!await acquire(owner)){await send(id,'Сейчас сохраняется другая запись. Повторите /retry.');return;}
  let success=false;
  try{
    const d=await getDraft(id);
    if(!d||d.stage!=='retry') return;
    const url=d.public_url||await uploadPhoto(d.file_id,d.badge);
    if(!d.public_url) await setUrl(id,url);
    await writeRow(d,url);
    await clearDraft(id);
    success=true;
  }catch(e){
    // Never log request URLs, tokens, names or file identifiers.
    console.error('Save failed; retry is available');
    await send(id,'Не удалось завершить сохранение. Данные сохранены в черновике. Отправьте /retry.');
  }finally{await release(owner);}
  if(success) await sendMenu(id,'✅ Данные и ссылка на фотографию записаны в таблицу.');
}
export async function handleMessage(m){
  if(m.chat?.type!=='private'||!m.from) return;
  const id=m.from.id, text=(m.text??'').trim();
  if(text==='/id'){await send(id,'Ваш Telegram ID: '+id);return;}
  if(!allowed(id)){await send(id,'Доступ не разрешён. Отправьте /id администратору.');return;}
  if(text==='/start'){await sendMenu(id);return;}
  const d=await getDraft(id);
  if(text==='/cancel'){
    if(d?.stage==='retry'){await send(id,'Есть незавершённое сохранение. Используйте /retry.');return;}
    await clearDraft(id);await sendMenu(id,'Заполнение отменено.');return;
  }
  if(!d){await sendMenu(id);return;}
  if(d.stage==='retry'){if(text==='/retry') await save(id,m.message_id);else await send(id,prompts.retry);return;}
  if(text.startsWith('/')){await send(id,prompts[d.stage]);return;}
  if(d.stage==='badge'){
    if(!validBadge(text)){await send(id,'Введите корректный бейдж (до 40 символов).');return;}
    if((await setBadge(id,text)).rowsAffected) await send(id,prompts.first);return;
  }
  if(d.stage==='first'||d.stage==='last'){
    if(!validName(text)){await send(id,'Введите имя или фамилию буквами (до 80 символов).');return;}
    const first=d.stage==='first';
    if((await (first?setFirst(id,text):setLast(id,text))).rowsAffected) await send(id,prompts[first?'last':'photo']);return;
  }
  if(d.stage==='photo'){
    if(!m.photo?.length||m.media_group_id){await send(id,'Отправьте одно фото, не альбом и не файл.');return;}
    const file=m.photo[m.photo.length-1];
    if(file.file_size>20*1024*1024){await send(id,'Фото слишком большое (максимум 20 МБ).');return;}
    if((await setPhoto(id,file.file_id)).rowsAffected) await save(id,m.message_id);
  }
}
