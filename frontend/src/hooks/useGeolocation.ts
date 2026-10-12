import { useState, useEffect, useRef, useCallback } from 'react';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
}

export interface GeolocationState {
  coords: Coordinates | null;
  timestamp: number | null;
  loading: boolean;
  isTracking: boolean;
  error: string | null;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unsupported';
}

/**
 * Calculates the Haversine distance between two coordinates in meters.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats distance into a human-readable metric string.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function useGeolocation(options?: {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  onMovement?: (newCoords: Coordinates, distanceMeters: number) => void;
  movementThresholdMeters?: number;
}) {
  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 5000,
    onMovement,
    movementThresholdMeters = 50,
  } = options || {};

  const [state, setState] = useState<GeolocationState>({
    coords: null,
    timestamp: null,
    loading: false,
    isTracking: false,
    error: null,
    permissionStatus:
      typeof navigator !== 'undefined' && 'geolocation' in navigator
        ? 'prompt'
        : 'unsupported',
  });

  const watchIdRef = useRef<number | null>(null);
  const lastRecordedCoordsRef = useRef<Coordinates | null>(null);
  const lastMovementTimeRef = useRef<number>(0);

  // Check browser permission status if supported
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('permissions' in navigator)) return;

    try {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          setState((prev) => ({
            ...prev,
            permissionStatus: status.state as any,
          }));
          status.onchange = () => {
            setState((prev) => ({
              ...prev,
              permissionStatus: status.state as any,
            }));
          };
        })
        .catch(() => {
          // Permissions API query not supported for geolocation in some browsers
        });
    } catch {
      // Ignore
    }
  }, []);

  const handleSuccess = useCallback(
    (pos: GeolocationPosition) => {
      const newCoords: Coordinates = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        altitudeAccuracy: pos.coords.altitudeAccuracy,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
      };

      // Check if distance moved exceeds movement threshold
      if (lastRecordedCoordsRef.current && onMovement) {
        const dist = calculateDistanceMeters(
          lastRecordedCoordsRef.current.latitude,
          lastRecordedCoordsRef.current.longitude,
          newCoords.latitude,
          newCoords.longitude
        );

        // Filter out GPS jitter if accuracy is too poor and throttle calls to at least 12 seconds
        const isAccurate = !newCoords.accuracy || newCoords.accuracy <= 50;
        const now = Date.now();
        if (dist >= movementThresholdMeters && isAccurate && (now - lastMovementTimeRef.current >= 12000)) {
          lastMovementTimeRef.current = now;
          lastRecordedCoordsRef.current = newCoords;
          onMovement(newCoords, dist);
        }
      } else {
        lastRecordedCoordsRef.current = newCoords;
      }

      setState((prev) => ({
        ...prev,
        coords: newCoords,
        timestamp: pos.timestamp,
        loading: false,
        error: null,
        permissionStatus: 'granted',
      }));

      return newCoords;
    },
    [onMovement, movementThresholdMeters]
  );

  const handleError = useCallback((err: GeolocationPositionError) => {
    let message = 'Unable to acquire location.';
    switch (err.code) {
      case err.PERMISSION_DENIED:
        message = 'Location access was denied. Please allow location access in your browser settings to locate yourself on the map.';
        break;
      case err.POSITION_UNAVAILABLE:
        message = 'Location position unavailable. Please check your GPS signal or internet connection.';
        break;
      case err.TIMEOUT:
        message = 'Location request timed out. Please try again.';
        break;
    }

    setState((prev) => ({
      ...prev,
      loading: false,
      error: message,
      permissionStatus: err.code === err.PERMISSION_DENIED ? 'denied' : prev.permissionStatus,
    }));
  }, []);

  // Request location once upon explicit user action
  const locate = useCallback(async (): Promise<Coordinates | null> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser.',
        permissionStatus: 'unsupported',
      }));
      return null;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = handleSuccess(pos);
          resolve(coords);
        },
        (err) => {
          handleError(err);
          resolve(null);
        },
        { enableHighAccuracy, timeout, maximumAge }
      );
    });
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  // Start continuous watch tracking
  const startTracking = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser.',
        permissionStatus: 'unsupported',
      }));
      return;
    }

    if (watchIdRef.current !== null) return; // Already tracking

    setState((prev) => ({ ...prev, isTracking: true, error: null }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy, timeout, maximumAge }
    );
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  // Stop continuous watch tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((prev) => ({ ...prev, isTracking: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    locate,
    startTracking,
    stopTracking,
    clearError,
  };
}
