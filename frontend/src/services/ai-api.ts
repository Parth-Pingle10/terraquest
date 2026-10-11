import { apiClient } from './api-client';
import { AIStatus, GenerateQuestRequest, Quest, SkillCategory } from '../types';

export const aiApi = {
  getStatus: async (): Promise<AIStatus> => {
    const res = await apiClient<AIStatus>('/api/v1/ai/status', { skipAuth: true });
    return {
      ...res,
      available: res.ollama_reachable && res.model_available,
      model: res.configured_model,
      provider: res.active_provider,
    };
  },

  generateQuest: (payload: {
    category?: SkillCategory;
    skill_category?: SkillCategory;
    difficulty?: string;
    duration_minutes?: number;
    prompt?: string;
    user_context?: string;
    user_interests?: string[];
  }) => {
    const body = {
      skill_category: payload.skill_category || payload.category || 'visual_explorer',
      difficulty: payload.difficulty || 'easy',
      duration_minutes: payload.duration_minutes || 15,
      prompt: payload.prompt,
      user_context: payload.user_context,
      user_interests: payload.user_interests,
    };

    return apiClient<Quest>('/api/v1/ai/quests/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  recommendQuest: (payload: { user_interests?: string[] }) => {
    return apiClient<{
      recommended_branch: string;
      reason: string;
      quest: Quest;
    }>('/api/v1/ai/quests/recommend', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  generateReflection: (payload: {
    observation: string;
    personal_reflection?: string;
    skill_category?: string;
  }) => {
    return apiClient<{ reflection_text: string; source: string }>('/api/v1/ai/reflections', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  generateFollowUp: (payload: { quest_id: string; observation: string }) => {
    return apiClient<{
      follow_up_prompt: string;
      suggested_skill: SkillCategory;
      source: string;
    }>('/api/v1/ai/quests/follow-up', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
