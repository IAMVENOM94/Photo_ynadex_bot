import os
import datetime
import logging
from dotenv import load_dotenv
from telegram import Update, Bot
from telegram.ext import Application, MessageHandler, filters, CommandHandler, CallbackContext
from yadisk import YaDisk

# Загружаем переменные из .env
load_dotenv()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
YANDEX_DISK_TOKEN = os.getenv("YANDEX_DISK_TOKEN")

# Настраиваем логирование
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Инициализация бота и Яндекс.Диска
bot = Bot(token=TELEGRAM_TOKEN)
y = YaDisk(token=YANDEX_DISK_TOKEN)

async def handle_image(update: Update, context: CallbackContext):
    try:
        file = await context.bot.get_file(update.message.photo[-1].file_id)
        date_folder = datetime.datetime.now().strftime("%Y-%m-%d")
        yandex_folder = f"disk:/найдено на мх/{date_folder}"
        local_folder = f"images/{date_folder}"
        os.makedirs(local_folder, exist_ok=True)

        # Проверяем, существует ли папка на Яндекс.Диске
        if not y.is_dir(yandex_folder):
            y.mkdir(yandex_folder)

        file_path = f"{local_folder}/{file.file_id}.jpg"
        await file.download_to_drive(file_path)

        y.upload(file_path, f"{yandex_folder}/{file.file_id}.jpg")
        await update.message.reply_text("✅ Изображение успешно сохранено в Яндекс.Диск.")
        os.remove(file_path)

    except Exception as e:
        logger.error(f"Ошибка при загрузке файла: {e}")
        await update.message.reply_text(f"⚠ Ошибка при загрузке: {e}")

async def clear_chat(update: Update, context: CallbackContext):
    chat_id = update.message.chat_id
    message_id = update.message.message_id

    for i in range(10):  # Удаляем последние 10 сообщений
        try:
            await context.bot.delete_message(chat_id, message_id - i)
        except Exception:
            pass

    await update.message.reply_text("✅ Чат очищен!", quote=False)

def main():
    app = Application.builder().token(TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler("clear", clear_chat))
    app.add_handler(MessageHandler(filters.PHOTO, handle_image))

    logger.info("🚀 Бот запущен и работает!")
    app.run_polling()

if __name__ == "__main__":
    main()
