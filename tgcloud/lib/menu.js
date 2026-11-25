import { api } from 'sdk';

// Configure the table fields and the read-only link later.
// Never commit confidential share links to this public repository.
export const TABLE_FIELDS = [];
export const VIEW_FILE_URL = '';

export function mainMenu() {
  const viewButton = VIEW_FILE_URL.startsWith('https://')
    ? { text: '📂 Посмотреть файл', url: VIEW_FILE_URL }
    : { text: '📂 Посмотреть файл', callback_data: 'view_file' };
  return { inline_keyboard: [
    [{ text: '📝 Заполнить таблицу', callback_data: 'fill_table' }],
    [viewButton],
  ] };
}

export async function sendMenu(chatId, text = 'Выберите необходимое действие:') {
  await api.sendMessage({
    chat_id: chatId,
    text,
    reply_markup: mainMenu(),
  });
}
