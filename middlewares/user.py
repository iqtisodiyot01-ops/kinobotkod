from typing import Callable, Dict, Any, Awaitable
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, User
from database.users import register_user


class UserMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        user: User = data.get("event_from_user")
        if user and not user.is_bot:
            # FIX #9: register_user() makes a synchronous Supabase call inside an
            # async middleware. The supabase-py v2 client uses httpx under the hood
            # which is synchronous by default. This blocks the event loop.
            # Proper fix: run the sync call in a thread executor.
            import asyncio
            loop = asyncio.get_event_loop()
            language = await loop.run_in_executor(
                None,
                lambda: register_user(
                    user_id=user.id,
                    full_name=user.full_name,
                    username=user.username,
                    telegram_lang=user.language_code,
                )
            )
            data["lang"] = language
        else:
            data["lang"] = "uz"
        return await handler(event, data)
