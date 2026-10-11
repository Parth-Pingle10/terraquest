import { apiClient } from './api-client';
import { ExplorationSummary, HeatmapPoint, TimelineEvent } from '../types';

export const explorationApi = {
  getSummary: () => {
    return apiClient<ExplorationSummary>('/api/v1/exploration/summary');
  },

  getExplorationStats: async () => {
    try {
      const summary = await explorationApi.getSummary();
      return {
        unique_cells_visited: summary.total_unique_discovered_cells || summary.unique_cells_visited || 0,
        total_discoveries: summary.total_saved_discoveries || summary.total_discoveries || 0,
        total_quests: summary.total_completed_quests || 0,
        total_xp: summary.total_xp_earned || 0,
      };
    } catch {
      return {
        unique_cells_visited: 0,
        total_discoveries: 0,
        total_quests: 0,
        total_xp: 0,
      };
    }
  },

  getTimeline: (limit = 20) => {
    return apiClient<TimelineEvent[]>(`/api/v1/exploration/timeline?limit=${limit}`);
  },

  getHeatmap: (mapId?: string, limit = 100) => {
    const query = new URLSearchParams();
    if (mapId) query.append('map_id', mapId);
    query.append('limit', String(limit));
    return apiClient<HeatmapPoint[]>(`/api/v1/exploration/heatmap?${query.toString()}`);
  },
};
