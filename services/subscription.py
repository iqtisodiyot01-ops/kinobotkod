import logging
from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from database.channels import get_required_channels

logger = logging.getLogger(__name__)


async def check_subscription(bot: Bot, user_id: int) -> list:
    """
    Returns list of channels the user has NOT subscribed to.
    Empty list means user is subscribed to all required channels.
    """
    # FIX #10: get_required_channels() is a synchronous Supabase call inside an
    # async function. Wrap in executor to avoid blocking the event loop.
    import asyncio
    loop = asyncio.get_event_loop()
    channels = await loop.run_in_executor(None, get_required_channels)

    not_subscribed = []
    for ch in channels:
        try:
            member = await bot.get_chat_member(chat_id=ch["channel_id"], user_id=user_id)
            if member.status in ("left", "kicked", "banned"):
                not_subscribed.append(ch)
        except Exception as e:
            logger.warning(f"check_subscription error for {ch['channel_id']}: {e}")
            # FIX #11: If get_chat_member raises (e.g. bot not in channel), original
            # code adds the channel to not_subscribed, which blocks ALL users if the
            # bot is misconfigured. Instead, log the error and skip (treat as subscribed)
            # to avoid false-blocking users when channel config is wrong.
            # Comment out the line below if you want strict behavior (original):
            # not_subscribed.append(ch)
    return not_subscribed


def get_subscription_keyboard(channels: list, lang: str = "uz") -> InlineKeyboardMarkup:
    buttons = []
    for ch in channels:
        label = ch.get("title", "Kanal")
        username = ch.get("username", "")
        # FIX #12: channel_id may be a numeric string like "-1001234567890".
        # The replace("-100", "") approach strips only the first occurrence and
        # only works for supergroups. For @username channels it should just use
        # the username. Use proper logic:
        if username:
            link = f"https://t.me/{username.lstrip('@')}"
        else:
            cid = str(ch.get("channel_id", ""))
            # For private supergroups, numeric IDs like -100xxxxxxxxxx
            if cid.startswith("-100"):
                numeric = cid[4:]
                link = f"https://t.me/c/{numeric}"
            elif cid.startswith("@"):
                link = f"https://t.me/{cid.lstrip('@')}"
            else:
                link = f"https://t.me/{cid}"
        buttons.append([InlineKeyboardButton(text=f"📢 {label}", url=link)])

    check_labels = {"uz": "✅ Tekshirish", "ru": "✅ Проверить", "en": "✅ Check"}
    buttons.append([InlineKeyboardButton(text=check_labels.get(lang, "✅ Tekshirish"), callback_data="check_sub")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)
