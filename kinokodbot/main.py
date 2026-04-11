import asyncio
import logging
from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage
from config import BOT_TOKEN
import database.users as users_db
from middlewares.user import UserMiddleware
from handlers import start, movies, admin, support, payment

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def main():
    users_db.init()

    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher(storage=MemoryStorage())

    dp.update.middleware(UserMiddleware())

    dp.include_router(admin.router)
    dp.include_router(support.router)
    dp.include_router(payment.router)
    dp.include_router(start.router)
    dp.include_router(movies.router)

    logger.info("KinoKod Bot ishga tushdi!")
    await dp.start_polling(bot, skip_updates=True)


if __name__ == "__main__":
    asyncio.run(main())
