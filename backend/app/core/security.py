import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import bcrypt
import jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": now,
        "nbf": now,
    })
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except jwt.PyJWTError:
        return None


def generate_share_token() -> str:
    """Generate a cryptographically secure random token for map sharing."""
    return secrets.token_urlsafe(32)


def hash_share_token(token: str, salt: Optional[str] = None) -> str:
    """
    Hash a share token with SHA-256 and an optional configured salt.
    We store ONLY the token hash in MongoDB, never the plaintext token.
    """
    effective_salt = salt if salt is not None else settings.SHARE_TOKEN_SALT
    salted_bytes = f"{effective_salt}:{token}".encode("utf-8")
    return hashlib.sha256(salted_bytes).hexdigest()


def verify_share_token(raw_token: str, stored_hash: str, salt: Optional[str] = None) -> bool:
    """Constant-time verification of a raw share token against a stored hash."""
    computed_hash = hash_share_token(raw_token, salt)
    return hmac.compare_digest(computed_hash, stored_hash)
