import { sendMenu } from '../lib/menu.js';

export default async function (message) {
  if (message.chat?.type !== 'private') return;
  await sendMenu(message.chat.id);
}
