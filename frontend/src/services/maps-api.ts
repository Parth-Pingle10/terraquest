import { apiClient } from './api-client';
import { CheckInResponse, ExplorationCell, MapItem } from '../types';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export const mapsApi = {
  createMap: (payload: {
    title: string;
    description?: string;
    map_visibility?: string;
    region_name?: string;
    region_grid_cells?: number;
    center_latitude?: number;
    center_longitude?: number;
    zoom_level?: number;
  }) => {
    return apiClient<MapItem>('/api/v1/maps', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  createExplorationMap: (payload: {
    title: string;
    region_name?: string;
    center_latitude?: number;
    center_longitude?: number;
    zoom_level?: number;
  }) => {
    return mapsApi.createMap(payload);
  },

  getUserMaps: async (page = 1, limit = 20): Promise<PaginatedResult<MapItem>> => {
    return apiClient<PaginatedResult<MapItem>>(`/api/v1/maps?page=${page}&limit=${limit}`);
  },

  listExplorationMaps: async (): Promise<MapItem[]> => {
    const res = await mapsApi.getUserMaps(1, 100);
    return res.items || [];
  },

  getPublicMaps: (page = 1, limit = 20) => {
    return apiClient<PaginatedResult<MapItem>>(`/api/v1/maps/public?page=${page}&limit=${limit}`, {
      skipAuth: true,
    });
  },

  getMapById: (mapId: string) => {
    return apiClient<MapItem>(`/api/v1/maps/${mapId}`);
  },

  getExplorationMap: async (mapId: string): Promise<MapItem> => {
    const map = await mapsApi.getMapById(mapId);
    try {
      const cellsRes = await mapsApi.getMapCells(mapId, 1, 200);
      map.cells = cellsRes.items || [];
    } catch {
      map.cells = [];
    }
    return map;
  },

  updateMap: (mapId: string, payload: Partial<MapItem>) => {
    return apiClient<MapItem>(`/api/v1/maps/${mapId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteMap: (mapId: string) => {
    return apiClient<{ message: string }>(`/api/v1/maps/${mapId}`, {
      method: 'DELETE',
    });
  },

  getMapStatistics: (mapId: string) => {
    return apiClient<{
      map_id: string;
      discovered_cells_count: number;
      region_name?: string;
      region_grid_cells: number;
      exploration_percentage: number;
      total_discoveries: number;
    }>(`/api/v1/maps/${mapId}/statistics`);
  },

  getMapCells: (mapId: string, page = 1, limit = 50) => {
    return apiClient<PaginatedResult<ExplorationCell>>(
      `/api/v1/maps/${mapId}/cells?page=${page}&limit=${limit}`
    );
  },

  checkIn: (
    mapId: string,
    payload: { latitude?: number; longitude?: number; manual_cell_id?: string; notes?: string }
  ) => {
    return apiClient<CheckInResponse>(`/api/v1/maps/${mapId}/check-ins`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
