from typing import Optional, Tuple
from app.core.exceptions import ConflictError, NotFoundError, UnauthorizedError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import UserModel
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserLoginRequest, UserRegisterRequest, UserUpdateRequest


class AuthService:
    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    async def register(self, data: UserRegisterRequest) -> Tuple[UserModel, str]:
        # Check if username exists
        existing = await self.user_repo.get_by_username(data.username)
        if existing:
            raise ConflictError(f"Username '{data.username}' is already taken.", code="USERNAME_TAKEN")

        pwd_hash = hash_password(data.password)
        new_user = UserModel(
            username=data.username,
            password_hash=pwd_hash,
            display_name=data.display_name or data.username,
            interests=data.interests,
            preferred_quest_duration=data.preferred_quest_duration,
            preferred_difficulty=data.preferred_difficulty,
        )
        created = await self.user_repo.create(new_user)
        token = create_access_token({"sub": created.id, "username": created.username})
        return created, token

    async def login(self, data: UserLoginRequest) -> Tuple[UserModel, str]:
        user = await self.user_repo.get_by_username(data.username)
        if not user or not verify_password(data.password, user.password_hash):
            raise UnauthorizedError("Invalid username or password.")

        token = create_access_token({"sub": user.id, "username": user.username})
        return user, token

    async def get_user_by_id(self, user_id: str) -> UserModel:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User", user_id)
        return user

    async def update_profile(self, user_id: str, data: UserUpdateRequest) -> UserModel:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        if not update_dict:
            return await self.get_user_by_id(user_id)
        
        updated = await self.user_repo.update(user_id, update_dict)
        if not updated:
            raise NotFoundError("User", user_id)
        return updated
