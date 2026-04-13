import asyncio
import logging
from aiogram import Bot
from aiogram.exceptions import TelegramForbiddenError, TelegramRetryAfter, TelegramBadRequest
from database.users import get_all_user_ids
from database.broadcasts import create_broadcast, update_broadcast_count

logger = logging.getLogger(__name__)

BATCH_SIZE = 25
BATCH_DELAY = 1.0


async def run_broadcast(bot: Bot, message_text: str, admin_id: int) -> dict:
    # FIX #13: Synchronous Supabase calls (create_broadcast, get_all_user_ids,
    # update_broadcast_count) are called directly in an async function, blocking
    # the event loop. Wrap in executor.
    loop = asyncio.get_event_loop()

    broadcast_id = await loop.run_in_executor(None, lambda: create_broadcast(message_text))
    user_ids = await loop.run_in_executor(None, get_all_user_ids)

    total = len(user_ids)
    sent = 0
    failed = 0

    await bot.send_message(admin_id, f"📡 Broadcast boshlandi: {total} ta foydalanuvchi")

    for i, uid in enumerate(user_ids):
        try:
            await bot.send_message(uid, message_text)
            sent += 1
        except TelegramForbiddenError:
            # User blocked the bot — expected, not an error
            failed += 1
        except TelegramRetryAfter as e:
            await asyncio.sleep(e.retry_after + 1)
            try:
                await bot.send_message(uid, message_text)
                sent += 1
            except Exception:
                failed += 1
        except TelegramBadRequest:
            failed += 1
        except Exception as e:
            logger.error(f"broadcast send error to {uid}: {e}")
            failed += 1

        if (i + 1) % BATCH_SIZE == 0:
            await asyncio.sleep(BATCH_DELAY)

    if broadcast_id:
        await loop.run_in_executor(
            None,
            lambda: update_broadcast_count(broadcast_id, sent, "done")
        )

    result = {"total": total, "sent": sent, "failed": failed}
    await bot.send_message(
        admin_id,
        f"✅ Broadcast tugadi!\n"
        f"📊 Jami: {total}\n"
        f"✅ Yuborildi: {sent}\n"
        f"❌ Xato: {failed}"
    )
    return result
