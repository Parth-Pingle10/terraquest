from fastapi import APIRouter, Depends, status
from app.api.dependencies import get_auth_service, get_current_user
from app.core.config import settings
from app.models.user import UserModel
from app.schemas.common import MessageResponse, ResponseEnvelope
from app.schemas.user import (
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    UserUpdateRequest,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication & User Profile"])


@router.post(
    "/register",
    response_model=ResponseEnvelope[dict],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(
    data: UserRegisterRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    user, token = await auth_service.register(data)
    user_res = UserResponse(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        interests=user.interests,
        preferred_quest_duration=user.preferred_quest_duration,
        preferred_difficulty=user.preferred_difficulty,
        created_at=user.created_at,
    )
    token_res = TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )
    return ResponseEnvelope(data={"user": user_res.model_dump(), "token": token_res.model_dump()})


@router.post(
    "/login",
    response_model=ResponseEnvelope[dict],
    summary="Authenticate with username and password",
)
async def login(
    data: UserLoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    user, token = await auth_service.login(data)
    user_res = UserResponse(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        interests=user.interests,
        preferred_quest_duration=user.preferred_quest_duration,
        preferred_difficulty=user.preferred_difficulty,
        created_at=user.created_at,
    )
    token_res = TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )
    return ResponseEnvelope(data={"user": user_res.model_dump(), "token": token_res.model_dump()})


@router.get(
    "/me",
    response_model=ResponseEnvelope[UserResponse],
    summary="Get current authenticated user profile",
)
async def get_me(current_user: UserModel = Depends(get_current_user)):
    user_res = UserResponse(
        id=current_user.id,
        username=current_user.username,
        display_name=current_user.display_name,
        interests=current_user.interests,
        preferred_quest_duration=current_user.preferred_quest_duration,
        preferred_difficulty=current_user.preferred_difficulty,
        created_at=current_user.created_at,
    )
    return ResponseEnvelope(data=user_res)


@router.patch(
    "/me",
    response_model=ResponseEnvelope[UserResponse],
    summary="Update current user exploration preferences",
)
async def update_me(
    data: UserUpdateRequest,
    current_user: UserModel = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    updated = await auth_service.update_profile(current_user.id, data)
    user_res = UserResponse(
        id=updated.id,
        username=updated.username,
        display_name=updated.display_name,
        interests=updated.interests,
        preferred_quest_duration=updated.preferred_quest_duration,
        preferred_difficulty=updated.preferred_difficulty,
        created_at=updated.created_at,
    )
    return ResponseEnvelope(data=user_res)


@router.post(
    "/logout",
    response_model=ResponseEnvelope[MessageResponse],
    summary="Logout user (signals client token revocation)",
)
async def logout(current_user: UserModel = Depends(get_current_user)):
    return ResponseEnvelope(
        data=MessageResponse(
            message="Successfully logged out. Please discard your access token on the client."
        )
    )
