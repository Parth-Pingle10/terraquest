import { apiClient } from './api-client';

export const syncApi = {
  syncDiscoveries: (discoveries: any[]) => {
    return apiClient<{
      synced_count: number;
      conflicts_resolved: number;
      synced_ids: string[];
    }>('/api/v1/sync/discoveries', {
      method: 'POST',
      body: JSON.stringify({ discoveries }),
    });
  },

  syncExploration: (cells: any[]) => {
    return apiClient<{
      synced_cells_count: number;
      new_cells_count: number;
    }>('/api/v1/sync/exploration', {
      method: 'POST',
      body: JSON.stringify({ cells }),
    });
  },

  syncBatch: async (payload: { discoveries?: any[]; cells?: any[] }) => {
    let syncedDiscoveries = 0;
    let syncedCells = 0;

    if (payload.discoveries && payload.discoveries.length > 0) {
      const res = await syncApi.syncDiscoveries(payload.discoveries);
      syncedDiscoveries = res.synced_count;
    }

    if (payload.cells && payload.cells.length > 0) {
      const res = await syncApi.syncExploration(payload.cells);
      syncedCells = res.synced_cells_count;
    }

    return {
      synced_discoveries_count: syncedDiscoveries,
      synced_cells_count: syncedCells,
    };
  },
};
