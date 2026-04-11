import logging
from aiogram import Bot
from aiogram.exceptions import TelegramBadRequest
from config import CHANNELS, BOT_TOKEN

bot = Bot(token=BOT_TOKEN)


async def check_subscription(user_id: int) -> bool:
    for channel in CHANNELS:
        try:
            chat_member = await bot.get_chat_member(chat_id=channel, user_id=user_id)
            if chat_member.status not in ["member", "administrator", "creator"]:
                return False
        except TelegramBadRequest:
            logging.warning(f"Channel {channel} mavjud emas yoki bot admin emas!")
            return False
    return True
