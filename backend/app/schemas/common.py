from typing import Any, Dict, Generic, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class MessageResponse(BaseModel):
    message: str
    details: Optional[Dict[str, Any]] = None


class ResponseEnvelope(BaseModel, Generic[T]):
    success: bool = True
    data: T
