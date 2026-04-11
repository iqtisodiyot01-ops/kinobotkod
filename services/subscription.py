import logging
from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from database.channels import get_required_channels

logger = logging.getLogger(__name__)


async def check_subscription(bot: Bot, user_id: int) -> list[dict]:
    channels = get_required_channels()
    not_subscribed = []
    for ch in channels:
        try:
            member = await bot.get_chat_member(chat_id=ch["channel_id"], user_id=user_id)
            if member.status in ("left", "kicked", "banned"):
                not_subscribed.append(ch)
        except Exception as e:
            logger.warning(f"check_subscription error for {ch['channel_id']}: {e}")
            not_subscribed.append(ch)
    return not_subscribed


def get_subscription_keyboard(channels: list[dict], lang: str = "uz") -> InlineKeyboardMarkup:
    buttons = []
    for ch in channels:
        label = ch.get("title", "Kanal")
        username = ch.get("username", "")
        link = f"https://t.me/{username}" if username else f"https://t.me/c/{str(ch['channel_id']).replace('-100', '')}"
        buttons.append([InlineKeyboardButton(text=f"📢 {label}", url=link)])

    check_labels = {"uz": "✅ Tekshirish", "ru": "✅ Проверить", "en": "✅ Check"}
    buttons.append([InlineKeyboardButton(text=check_labels.get(lang, "✅ Tekshirish"), callback_data="check_sub")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)
