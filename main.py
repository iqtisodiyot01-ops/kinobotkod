import asyncio
import logging
from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage
from config import BOT_TOKEN
import database.users as users_db
from middlewares.user import UserMiddleware
from handlers import start, movies, admin, support, payment, getid

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def main():
    # FIX #2: users_db.init() is a synchronous blocking Supabase call done at startup.
    # It must complete before bot starts. This is correct as-is, but we add error
    # handling so a Supabase failure at init does not silently continue.
    try:
        users_db.init()
    except Exception as e:
        logger.error(f"Database init failed: {e}")
        raise

    # FIX #3: Bot should be closed properly on shutdown. Use try/finally.
    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher(storage=MemoryStorage())

    dp.update.middleware(UserMiddleware())

    # Router order matters: admin before start/movies so admin commands are not
    # intercepted by the generic text handler in movies.router.
    dp.include_router(admin.router)
    dp.include_router(support.router)
    dp.include_router(payment.router)
    dp.include_router(getid.router)
    dp.include_router(start.router)
    dp.include_router(movies.router)

    logger.info("KinoKod Bot ishga tushdi!")
    try:
        await dp.start_polling(bot, skip_updates=True)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
