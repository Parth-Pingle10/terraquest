from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse


class TerraQuestException(Exception):
    """Base exception for TerraQuest backend."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}


class NotFoundError(TerraQuestException):
    def __init__(self, resource: str, identifier: Optional[str] = None):
        msg = f"{resource} not found" if not identifier else f"{resource} with id '{identifier}' not found"
        super().__init__(
            message=msg,
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class UnauthorizedError(TerraQuestException):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message=message,
            code="UNAUTHORIZED",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ForbiddenError(TerraQuestException):
    def __init__(self, message: str = "Access forbidden"):
        super().__init__(
            message=message,
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN,
        )


class ConflictError(TerraQuestException):
    def __init__(self, message: str, code: str = "CONFLICT"):
        super().__init__(
            message=message,
            code=code,
            status_code=status.HTTP_409_CONFLICT,
        )


class BadRequestError(TerraQuestException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="BAD_REQUEST",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class RateLimitExceededError(TerraQuestException):
    def __init__(self, message: str = "Rate limit exceeded. Please try again later."):
        super().__init__(
            message=message,
            code="RATE_LIMIT_EXCEEDED",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        )


class AIUnavailableError(TerraQuestException):
    def __init__(self, message: str = "Local AI service is currently unavailable"):
        super().__init__(
            message=message,
            code="AI_UNAVAILABLE",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


async def terraquest_exception_handler(request: Request, exc: TerraQuestException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Do not expose internal traceback to clients
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred. Please try again later.",
                "details": {},
            },
        },
    )
