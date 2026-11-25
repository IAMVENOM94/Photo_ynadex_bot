import { api } from 'sdk';
import { allowed, startForm } from '../lib/bot.js';
export default async function(q){
  const ok=q.message?.chat?.type==='private'&&allowed(q.from.id)&&q.data==='fill_table';
  await api.answerCallbackQuery({callback_query_id:q.id,...(ok?{}:{text:'Действие недоступно. Используйте /start.'})});
  if(ok) await startForm(q.from.id);
}
