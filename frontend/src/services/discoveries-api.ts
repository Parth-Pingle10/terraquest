import { apiClient } from './api-client';
import { Discovery } from '../types';
import { PaginatedResult } from './maps-api';

export const discoveriesApi = {
  createDiscovery: (payload: {
    map_id?: string;
    title: string;
    description?: string;
    observation: string;
    personal_reflection?: string;
    optional_ai_reflection?: string;
    optional_photo_reference?: string;
    photo_blob_id?: string;
    photo_approved_for_sharing?: boolean;
    skill_category?: string;
    category?: string;
    optional_quest_id?: string;
    optional_location_name?: string;
    optional_latitude?: number;
    optional_longitude?: number;
    latitude?: number;
    longitude?: number;
    visibility?: string;
  }) => {
    const bodyPayload = {
      map_id: payload.map_id || 'default',
      title: payload.title,
      description: payload.description || payload.observation.slice(0, 80),
      observation: payload.observation,
      personal_reflection: payload.personal_reflection,
      optional_ai_reflection: payload.optional_ai_reflection,
      optional_photo_reference: payload.optional_photo_reference || payload.photo_blob_id,
      photo_approved_for_sharing: payload.photo_approved_for_sharing || false,
      skill_category: payload.skill_category || payload.category || 'visual_explorer',
      optional_quest_id: payload.optional_quest_id,
      optional_latitude: payload.optional_latitude ?? payload.latitude,
      optional_longitude: payload.optional_longitude ?? payload.longitude,
      visibility: payload.visibility || 'private',
    };

    return apiClient<Discovery>('/api/v1/discoveries', {
      method: 'POST',
      body: JSON.stringify(bodyPayload),
    });
  },

  getDiscoveries: (params?: {
    map_id?: string;
    skill_category?: string;
    visibility?: string;
    quest_id?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.map_id) query.append('map_id', params.map_id);
    if (params?.skill_category) query.append('skill_category', params.skill_category);
    if (params?.visibility) query.append('visibility', params.visibility);
    if (params?.quest_id) query.append('quest_id', params.quest_id);
    query.append('page', String(params?.page || 1));
    query.append('limit', String(params?.limit || 20));

    return apiClient<PaginatedResult<Discovery>>(`/api/v1/discoveries?${query.toString()}`);
  },

  listDiscoveries: (params?: { limit?: number; page?: number }) => {
    return discoveriesApi.getDiscoveries(params);
  },

  getDiscoveryById: (id: string) => {
    return apiClient<Discovery>(`/api/v1/discoveries/${id}`);
  },

  updateDiscovery: (id: string, payload: Partial<Discovery>) => {
    return apiClient<Discovery>(`/api/v1/discoveries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteDiscovery: (id: string) => {
    return apiClient<{ message: string }>(`/api/v1/discoveries/${id}`, {
      method: 'DELETE',
    });
  },

  getMapDiscoveries: (mapId: string, page = 1, limit = 20) => {
    return apiClient<PaginatedResult<Discovery>>(
      `/api/v1/maps/${mapId}/discoveries?page=${page}&limit=${limit}`
    );
  },
};
