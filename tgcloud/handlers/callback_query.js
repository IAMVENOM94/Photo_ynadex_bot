import { api } from 'sdk';
import { sendMenu, TABLE_FIELDS } from '../lib/menu.js';

export default async function (query) {
  const chat = query.message?.chat;
  if (!chat || chat.type !== 'private') {
    await api.answerCallbackQuery({ callback_query_id: query.id });
    return;
  }

  const notices = {
    fill_table: TABLE_FIELDS.length === 0
      ? 'Поля таблицы пока не настроены.'
      : 'Заполнение таблицы пока не подключено.',
    view_file: 'Ссылка для просмотра файла пока не настроена.',
  };

  if (!Object.prototype.hasOwnProperty.call(notices, query.data)) {
    await api.answerCallbackQuery({
      callback_query_id: query.id,
      text: 'Это меню устарело. Отправьте /start.',
    });
    return;
  }

  await api.answerCallbackQuery({ callback_query_id: query.id });
  await sendMenu(chat.id, notices[query.data]);
}
