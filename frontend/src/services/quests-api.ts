import { apiClient } from './api-client';
import { Quest, QuestCompletionResponse, QuestStartResponse, UserQuestProgress } from '../types';

export const questsApi = {
  getQuests: (category?: string, difficulty?: string) => {
    const query = new URLSearchParams();
    if (category) query.append('skill_category', category);
    if (difficulty) query.append('difficulty', difficulty);
    return apiClient<Quest[]>(`/api/v1/quests?${query.toString()}`);
  },

  listQuests: (category?: string, difficulty?: string) => {
    return questsApi.getQuests(category, difficulty);
  },

  getUserQuests: async (): Promise<UserQuestProgress[]> => {
    try {
      return await apiClient<UserQuestProgress[]>('/api/v1/quests/progress');
    } catch {
      return [];
    }
  },

  getSignatureQuest: () => {
    return apiClient<Quest>('/api/v1/quests/signature');
  },

  getQuestById: (questId: string) => {
    return apiClient<Quest>(`/api/v1/quests/${questId}`);
  },

  startQuest: (questId: string) => {
    return apiClient<QuestStartResponse>(`/api/v1/quests/${questId}/start`, {
      method: 'POST',
    });
  },

  completeQuest: (
    questId: string,
    payload: {
      observation?: string;
      reflection?: string;
      notes?: string;
      photo_reference?: string;
      map_id?: string;
      latitude?: number;
      longitude?: number;
      create_discovery?: boolean;
    }
  ) => {
    const body = {
      observation: payload.observation || payload.reflection || payload.notes || 'Mindful observation recorded.',
      reflection: payload.reflection || payload.notes,
      photo_reference: payload.photo_reference,
      map_id: payload.map_id,
      latitude: payload.latitude,
      longitude: payload.longitude,
      create_discovery: payload.create_discovery ?? true,
    };

    return apiClient<QuestCompletionResponse>(`/api/v1/quests/${questId}/complete`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  getCompletionStatus: (questId: string) => {
    return apiClient<{
      quest_id: string;
      status?: string | null;
      completed_at?: string | null;
      reward_claimed: boolean;
      xp_awarded: number;
    }>(`/api/v1/quests/${questId}/completion-status`);
  },
};
