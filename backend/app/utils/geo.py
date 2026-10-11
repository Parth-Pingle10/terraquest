"""Geospatial utilities for TerraQuest exploration cells and coordinate validation.

NOTE ON PHYSICAL PRESENCE & GPS LIMITATIONS:
Client-reported coordinates (GPS/Network) originate from untrusted mobile or browser clients.
While the backend validates coordinate boundaries, plausible precision, and calculates deterministic
exploration cells, client-reported coordinates CANNOT be treated as cryptographic proof of physical
presence. TerraQuest is built around intentional, playful exploration rather than adversarial proof-of-location.
"""

import math
from typing import Dict, Optional, Tuple
from app.core.exceptions import BadRequestError

# Approximate grid resolution in degrees: 0.001 degrees is ~111 meters at the equator.
# This represents a comfortable walking neighborhood cell.
DEFAULT_CELL_PRECISION = 3  # 3 decimal places (~100m)


def validate_coordinates(latitude: Optional[float], longitude: Optional[float]) -> None:
    """
    Validate that latitude and longitude fall within real-world geographic bounds.
    Latitude: [-90.0, 90.0]
    Longitude: [-180.0, 180.0]
    """
    if latitude is not None:
        if not (-90.0 <= latitude <= 90.0):
            raise BadRequestError(f"Invalid latitude {latitude}. Must be between -90.0 and 90.0.")
    if longitude is not None:
        if not (-180.0 <= longitude <= 180.0):
            raise BadRequestError(f"Invalid longitude {longitude}. Must be between -180.0 and 180.0.")


def compute_cell_id(latitude: float, longitude: float, precision: int = DEFAULT_CELL_PRECISION) -> str:
    """
    Compute a deterministic geospatial cell identifier for a coordinate pair.
    Uses quantized fixed-decimal rounding to create uniform exploration grid cells.
    Example: (37.77492, -122.41941) -> "cell_37.775_-122.419"
    """
    validate_coordinates(latitude, longitude)
    lat_q = round(latitude, precision)
    lon_q = round(longitude, precision)
    # Format with explicit sign and precision to ensure uniqueness
    return f"cell_{lat_q:.{precision}f}_{lon_q:.{precision}f}"


def get_cell_center(cell_id: str) -> Optional[Dict[str, float]]:
    """
    Extract the approximate center coordinate of a cell from its identifier.
    Returns {"latitude": lat, "longitude": lon} or None if cell_id is not formatted.
    """
    if not cell_id.startswith("cell_"):
        return None
    try:
        parts = cell_id[5:].split("_")
        if len(parts) == 2:
            return {"latitude": float(parts[0]), "longitude": float(parts[1])}
    except (ValueError, IndexError):
        return None
    return None


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on Earth in meters.
    """
    validate_coordinates(lat1, lon1)
    validate_coordinates(lat2, lon2)

    r = 6371000.0  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c
