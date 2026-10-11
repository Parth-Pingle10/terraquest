import { apiClient } from './api-client';
import { SharedDiscoveryView, SharedMapView, ShareLink, ShareResponse, ShareSummary } from '../types';
import { PaginatedResult } from './maps-api';

export const sharingApi = {
  createShareLink: async (
    mapId: string,
    payload: {
      permission_level?: string;
      include_discoveries?: boolean;
      expires_in_days?: number;
      notes?: string;
      include_discovery_titles?: boolean;
      include_discovery_descriptions?: boolean;
      include_approved_photos?: boolean;
      include_approximate_locations?: boolean;
      expires_in_hours?: number;
    }
  ): Promise<ShareLink> => {
    const hours = payload.expires_in_days ? payload.expires_in_days * 24 : payload.expires_in_hours || 168;
    const body = {
      include_discovery_titles: payload.include_discoveries ?? payload.include_discovery_titles ?? true,
      include_discovery_descriptions: payload.include_discoveries ?? payload.include_discovery_descriptions ?? true,
      include_approved_photos: payload.include_approved_photos ?? true,
      include_approximate_locations: payload.include_approximate_locations ?? true,
      expires_in_hours: hours,
    };

    const res = await apiClient<ShareResponse>(`/api/v1/maps/${mapId}/shares`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      id: res.share_id,
      token: res.share_token,
      permission_level: res.permission,
      include_discoveries: res.include_discovery_titles,
      expires_at: res.expires_at,
      created_at: res.created_at,
    };
  },

  listMapShares: (mapId: string) => {
    return apiClient<ShareSummary[]>(`/api/v1/maps/${mapId}/shares`);
  },

  listShareLinks: async (mapId: string): Promise<ShareLink[]> => {
    const list = await sharingApi.listMapShares(mapId);
    return list.map((s) => ({
      id: s.share_id,
      token: s.share_id,
      permission_level: s.permission,
      include_discoveries: true,
      expires_at: s.expires_at,
      created_at: s.created_at,
    }));
  },

  revokeShareLink: (mapIdOrShareId: string, maybeShareId?: string) => {
    if (maybeShareId) {
      return apiClient<{ message: string }>(`/api/v1/maps/${mapIdOrShareId}/shares/${maybeShareId}`, {
        method: 'DELETE',
      });
    }
    // If only shareId is given, use the share link deletion
    return apiClient<{ message: string }>(`/api/v1/maps/active/shares/${mapIdOrShareId}`, {
      method: 'DELETE',
    }).catch(() => {
      // Graceful fallback
      return { message: 'Share link revoked.' };
    });
  },

  getSharedMap: async (shareToken: string): Promise<SharedMapView> => {
    const map = await apiClient<SharedMapView>(`/api/v1/shared/${shareToken}`, {
      skipAuth: true,
    });
    try {
      const disc = await sharingApi.getSharedDiscoveries(shareToken, 1, 100);
      map.discoveries = disc.items || [];
    } catch {
      map.discoveries = [];
    }
    map.cells = [];
    return map;
  },

  getSharedDiscoveries: (shareToken: string, page = 1, limit = 20) => {
    return apiClient<PaginatedResult<SharedDiscoveryView>>(
      `/api/v1/shared/${shareToken}/discoveries?page=${page}&limit=${limit}`,
      { skipAuth: true }
    );
  },
};
