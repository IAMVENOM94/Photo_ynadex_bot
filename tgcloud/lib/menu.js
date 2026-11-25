import { api } from 'sdk';
export const mainMenu = () => ({inline_keyboard: [[{text:'📋 Заполнить таблицу',callback_data:'fill_table'}]]});
export async function sendMenu(chatId,text='Выберите действие:') {
  await api.sendMessage({chat_id:chatId,text,reply_markup:mainMenu()});
}
