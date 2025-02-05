import os
import datetime
import logging
from dotenv import load_dotenv
from telegram import Update, Bot
from telegram.ext import (
    Application, MessageHandler, filters, CommandHandler, CallbackContext, ConversationHandler
)
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

# Состояния для хранения данных в ConversationHandler
WAITING_FOR_FILENAME = 1
user_files = {}  # Словарь для хранения фото, ожидающих названия


async def handle_image(update: Update, context: CallbackContext):
    """Обрабатывает изображение и запрашивает у пользователя имя файла"""
    file = await context.bot.get_file(update.message.photo[-1].file_id)
    user_files[update.message.chat_id] = file
    await update.message.reply_text("📂 Введите название файла для сохранения:")
    return WAITING_FOR_FILENAME


async def save_image(update: Update, context: CallbackContext):
    """Сохраняет изображение с пользовательским названием"""
    chat_id = update.message.chat_id
    if chat_id not in user_files:
        await update.message.reply_text("⚠ Ошибка: нет загруженного изображения.")
        return ConversationHandler.END

    file = user_files.pop(chat_id)
    filename = update.message.text.strip() + ".jpg"

    # Создание папки с датой
    date_folder = datetime.datetime.now().strftime("%Y-%m-%d")
    yandex_folder = f"disk:/найдено на мх/{date_folder}"
    local_folder = f"images/{date_folder}"
    os.makedirs(local_folder, exist_ok=True)

    # Проверяем, существует ли папка на Яндекс.Диске
    if not y.is_dir(yandex_folder):
        y.mkdir(yandex_folder)

    # Формируем полный путь
    file_path = f"{local_folder}/{filename}"

    # Скачиваем файл
    await file.download_to_drive(file_path)

    # Загружаем на Яндекс.Диск
    y.upload(file_path, f"{yandex_folder}/{filename}")

    await update.message.reply_text(f"✅ Изображение сохранено как **{filename}** в папку `{date_folder}`.")

    # Удаляем локальный файл
    os.remove(file_path)
    return ConversationHandler.END


async def cancel(update: Update, context: CallbackContext):
    """Отмена операции"""
    await update.message.reply_text("❌ Операция отменена.")
    return ConversationHandler.END


def main():
    app = Application.builder().token(TELEGRAM_TOKEN).build()

    # Обработчик загрузки фото с вводом имени файла
    conv_handler = ConversationHandler(
        entry_points=[MessageHandler(filters.PHOTO, handle_image)],
        states={WAITING_FOR_FILENAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, save_image)]},
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    app.add_handler(conv_handler)
    app.add_handler(CommandHandler("clear", cancel))

    logger.info("🚀 Бот запущен и работает!")
    app.run_polling()


if __name__ == "__main__":
    main()
