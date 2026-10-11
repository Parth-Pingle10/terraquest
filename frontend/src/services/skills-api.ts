import { apiClient } from './api-client';
import { SkillBranch, SkillCategory, SkillTree } from '../types';

export const skillsApi = {
  getSkillTree: () => {
    return apiClient<SkillTree>('/api/v1/skills');
  },

  getSkillBranch: (category: SkillCategory) => {
    return apiClient<SkillBranch>(`/api/v1/skills/${category}`);
  },

  getSkillHistory: (category: SkillCategory, page = 1, limit = 20) => {
    return apiClient<
      {
        quest_id: string;
        quest_title: string;
        difficulty: string;
        completed_at: string;
        xp_awarded: number;
      }[]
    >(`/api/v1/skills/${category}/history?page=${page}&limit=${limit}`);
  },
};
