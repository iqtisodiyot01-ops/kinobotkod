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
            language = register_user(
                user_id=user.id,
                full_name=user.full_name,
                username=user.username,
            )
            data["lang"] = language
        else:
            data["lang"] = "uz"
        return await handler(event, data)
