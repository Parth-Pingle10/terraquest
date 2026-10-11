import logging
import re
import sys
from typing import Any, Dict

from app.core.config import settings

# Sensitive keys to sanitize in structured logs
SENSITIVE_KEYS = {"password", "token", "authorization", "secret", "personal_reflection", "jwt"}
SENSITIVE_PATTERN = re.compile(
    r"(password|token|secret|authorization|bearer)\s*[:=]\s*['\"]?([^'\"\s,]+)['\"]?",
    re.IGNORECASE,
)


class SanitizingFormatter(logging.Formatter):
    """Custom log formatter that strips out sensitive credentials and tokens."""

    def format(self, record: logging.LogRecord) -> str:
        orig = super().format(record)
        # Redact credentials/tokens from log string
        sanitized = SENSITIVE_PATTERN.sub(r"\1: [REDACTED]", orig)
        return sanitized


def configure_logging() -> logging.Logger:
    """Configure application logging with safe, non-leaking formatting."""
    log_level = logging.DEBUG if settings.APP_DEBUG else logging.INFO

    handler = logging.StreamHandler(sys.stdout)
    formatter = SanitizingFormatter(
        fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    logger = logging.getLogger("terraquest")
    logger.setLevel(log_level)
    logger.handlers.clear()
    logger.addHandler(handler)
    logger.propagate = False

    # Silence verbose third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("pymongo").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    return logger


logger = configure_logging()
