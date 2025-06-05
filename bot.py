import os
import datetime
import logging
from dotenv import load_dotenv
from telegram import (
    Update, Bot, InlineKeyboardMarkup, InlineKeyboardButton
)
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler, MessageHandler,
    ConversationHandler, CallbackContext, filters
)
from yadisk import YaDisk

# Загрузка переменных окружения
load_dotenv()
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
YANDEX_DISK_TOKEN = os.getenv("YANDEX_DISK_TOKEN")

# Логирование
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Инициализация бота и Яндекс.Диска
bot = Bot(token=TELEGRAM_TOKEN)
y = YaDisk(token=YANDEX_DISK_TOKEN)

# Состояния
MODE_SELECT, WAITING_FOR_FILENAME, WAITING_FOR_QUERY = range(3)

# Состояния пользователя
user_state = {}

# Inline-кнопки
menu_buttons = InlineKeyboardMarkup([
    [InlineKeyboardButton("📤 Оставлено на МХ", callback_data="save_mh")],
    [InlineKeyboardButton("📤 НВ", callback_data="save_nv")],
    [InlineKeyboardButton("📁 Посмотреть МХ", callback_data="view_mh")],
    [InlineKeyboardButton("📁 Посмотреть НВ", callback_data="view_nv")]
])


async def start(update: Update, context: CallbackContext):
    await update.message.reply_text("Выберите действие:", reply_markup=menu_buttons)
    return MODE_SELECT


async def handle_menu_button(update: Update, context: CallbackContext):
    query = update.callback_query
    await query.answer()
    chat_id = query.message.chat_id
    data = query.data

    if data == "save_mh":
        user_state[chat_id] = "найдено на мх"
        await query.edit_message_text("📷 Отправьте фото для сохранения в 'Оставлено на МХ'")
        return WAITING_FOR_FILENAME

    elif data == "save_nv":
        user_state[chat_id] = "нв"
        await query.edit_message_text("📷 Отправьте фото для сохранения в 'НВ'")
        return WAITING_FOR_FILENAME

    elif data == "view_mh":
        user_state[chat_id] = {"search_folder": "найдено на мх"}
        await query.edit_message_text("🔍 Введите часть названия файла для поиска в 'Оставлено на МХ':")
        return WAITING_FOR_QUERY

    elif data == "view_nv":
        user_state[chat_id] = {"search_folder": "нв"}
        await query.edit_message_text("🔍 Введите часть названия файла для поиска в 'НВ':")
        return WAITING_FOR_QUERY

    else:
        await query.edit_message_text("❓ Неизвестное действие.")
        return MODE_SELECT


async def handle_image(update: Update, context: CallbackContext):
    chat_id = update.effective_chat.id
    if chat_id not in user_state or not isinstance(user_state[chat_id], str):
        await update.message.reply_text("⚠ Сначала выберите действие с помощью /start.")
        return MODE_SELECT

    file = await context.bot.get_file(update.message.photo[-1].file_id)
    context.user_data["file"] = file
    await update.message.reply_text("📂 Введите бейдж для сохранения:")
    return WAITING_FOR_FILENAME


async def save_image(update: Update, context: CallbackContext):
    chat_id = update.effective_chat.id
    if "file" not in context.user_data or chat_id not in user_state:
        await update.message.reply_text("⚠ Ошибка: нет загруженного изображения.")
        return MODE_SELECT

    file = context.user_data.pop("file")
    folder_type = user_state.pop(chat_id)
    filename = update.message.text.strip() + ".jpg"
    date_folder = datetime.datetime.now().strftime("%Y-%m-%d")
    yandex_folder = f"disk:/{folder_type}/{date_folder}"
    local_folder = f"images/{date_folder}"
    os.makedirs(local_folder, exist_ok=True)

    if not y.is_dir(yandex_folder):
        y.mkdir(yandex_folder)

    file_path = f"{local_folder}/{filename}"

    try:
        await file.download_to_drive(file_path)
        y.upload(file_path, f"{yandex_folder}/{filename}")

        await update.message.reply_text(
            f"✅ Сохранено как **{filename}** в `{folder_type}/{date_folder}`.",
            reply_markup=menu_buttons
        )
    except Exception as e:
        logger.error(f"Ошибка при загрузке: {e}")
        await update.message.reply_text("⚠ Ошибка при сохранении.")

    if os.path.exists(file_path):
        os.remove(file_path)

    return MODE_SELECT


async def search_files(update: Update, context: CallbackContext):
    chat_id = update.effective_chat.id
    if chat_id not in user_state or "search_folder" not in user_state[chat_id]:
        await update.message.reply_text("⚠ Ошибка: неизвестная папка для поиска.")
        return MODE_SELECT

    search_folder = user_state[chat_id]["search_folder"]
    query = update.message.text.strip().lower()
    results = []

    def walk(path):
        try:
            for item in y.listdir(path):
                if item["type"] == "dir":
                    walk(item["path"])
                elif item["type"] == "file" and query in item["name"].lower():
                    results.append(item["path"])
        except Exception as e:
            logger.error(f"Ошибка обхода {path}: {e}")

    walk(f"disk:/{search_folder}")

    if not results:
        await update.message.reply_text("❌ Файлы не найдены.", reply_markup=menu_buttons)
        user_state.pop(chat_id, None)
        return MODE_SELECT

    if len(results) > 10:
        # Если слишком много файлов, просто список
        response = f"🔎 Найдено {len(results)} файлов с '{query}' в '{search_folder}':\n\n"
        for path in results:
            filename = os.path.basename(path)
            parts = path.strip("/").split("/")
            date = parts[-2] if len(parts) >= 2 else "?"
            response += f"📅 `{date}` — 📄 {filename}\n"
        await update.message.reply_text(response, reply_markup=menu_buttons)
    else:
        # Показываем изображения по одному
        await update.message.reply_text(
            f"🔎 Найдено {len(results)} файлов. Отправляю превью с датой…"
        )
        for path in results:
            filename = os.path.basename(path)
            parts = path.strip("/").split("/")
            date = parts[-2] if len(parts) >= 2 else "?"
            local_path = f"temp_{chat_id}.jpg"

            try:
                y.download(path, local_path)
                with open(local_path, "rb") as photo:
                    caption = f"📄 {filename}\n📅 `{date}`"
                    await update.message.reply_photo(photo=photo, caption=caption)
                os.remove(local_path)
            except Exception as e:
                logger.error(f"Ошибка при загрузке превью: {e}")
                await update.message.reply_text(f"⚠ Не удалось отправить {filename}")

    user_state.pop(chat_id, None)
    await update.message.reply_text("📋 Меню:", reply_markup=menu_buttons)
    return MODE_SELECT



async def cancel(update: Update, context: CallbackContext):
    chat_id = update.effective_chat.id
    user_state.pop(chat_id, None)
    context.user_data.clear()
    await update.message.reply_text("❌ Операция отменена.", reply_markup=menu_buttons)
    return MODE_SELECT


def main():
    app = Application.builder().token(TELEGRAM_TOKEN).build()

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            MODE_SELECT: [CallbackQueryHandler(handle_menu_button)],
            WAITING_FOR_FILENAME: [
                MessageHandler(filters.PHOTO, handle_image),
                MessageHandler(filters.TEXT & ~filters.COMMAND, save_image),
            ],
            WAITING_FOR_QUERY: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, search_files),
            ],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    app.add_handler(conv_handler)
    app.add_handler(MessageHandler(filters.ALL, lambda u, c: u.message.reply_text("🔘 Используйте /start для меню.")))

    logger.info("🚀 Бот с меню и поиском запущен!")
    app.run_polling()


if __name__ == "__main__":
    main()
