/**
 * LocalStorage wrapper for client-side persistence of guest profiles,
 * discoveries, journal memories, active/completed quests, skills, XP, and fog-of-war cells.
 * Provides resilient fallbacks for missing, malformed, or outdated stored data.
 */

import { Discovery, Quest, SkillBranch, SkillCategory, UserQuestProgress } from '../types';

const TOKEN_KEY = 'terraquest_token';
const GUEST_PROFILE_KEY = 'terraquest_guest_profile';
const GUEST_DISCOVERIES_KEY = 'terraquest_guest_discoveries';
const GUEST_SKILLS_KEY = 'terraquest_guest_skills';
const ONBOARDING_KEY = 'terraquest_onboarded';
const THEME_KEY = 'terraquest_theme';
const GUEST_XP_KEY = 'terraquest_guest_xp';
const GUEST_CELLS_KEY = 'terraquest_guest_cells';
const GUEST_ACTIVE_QUESTS_KEY = 'terraquest_guest_active_quests';
const GUEST_COMPLETED_QUESTS_KEY = 'terraquest_guest_completed_quests';
const GUEST_CUSTOM_QUESTS_KEY = 'terraquest_guest_custom_quests';

export interface GuestProfile {
  display_name?: string;
  displayName?: string;
  interests: string[];
  preferred_quest_duration?: number;
  preferredDuration?: number;
  preferred_difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'easy' | 'medium' | 'hard';
  preferredDifficulty?: 'beginner' | 'intermediate' | 'advanced' | 'easy' | 'medium' | 'hard';
}

const DEFAULT_GUEST_PROFILE: GuestProfile = {
  display_name: 'Wayfarer',
  displayName: 'Wayfarer',
  interests: ['mindful observation', 'trees', 'architecture'],
  preferred_quest_duration: 15,
  preferredDuration: 15,
  preferred_difficulty: 'easy',
  preferredDifficulty: 'easy',
};

const DEFAULT_GUEST_SKILLS: SkillBranch[] = [
  { skill_category: 'visual_explorer', xp: 0, level: 1, completed_quest_count: 0, xp_for_next_level: 50, unlocked_categories: ['visual_explorer'], updated_at: new Date().toISOString() },
  { skill_category: 'nature_tracker', xp: 0, level: 1, completed_quest_count: 0, xp_for_next_level: 50, unlocked_categories: [], updated_at: new Date().toISOString() },
  { skill_category: 'sound_hunter', xp: 0, level: 1, completed_quest_count: 0, xp_for_next_level: 50, unlocked_categories: [], updated_at: new Date().toISOString() },
  { skill_category: 'urban_explorer', xp: 0, level: 1, completed_quest_count: 0, xp_for_next_level: 50, unlocked_categories: [], updated_at: new Date().toISOString() },
];

export const storage = {
  // Authentication & session tokens
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  removeToken: () => localStorage.removeItem(TOKEN_KEY),

  // UI state & preferences
  isOnboarded: (): boolean => localStorage.getItem(ONBOARDING_KEY) === 'true',
  setOnboarded: (val: boolean) => localStorage.setItem(ONBOARDING_KEY, val ? 'true' : 'false'),

  getTheme: (): 'light' | 'dark' => (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light',
  setTheme: (theme: 'light' | 'dark') => localStorage.setItem(THEME_KEY, theme),

  // Guest Explorer Profile
  getGuestProfile: (): GuestProfile => {
    try {
      const data = localStorage.getItem(GUEST_PROFILE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...DEFAULT_GUEST_PROFILE,
          ...parsed,
          displayName: parsed.displayName || parsed.display_name || DEFAULT_GUEST_PROFILE.displayName,
          display_name: parsed.display_name || parsed.displayName || DEFAULT_GUEST_PROFILE.display_name,
          preferredDuration: parsed.preferredDuration || parsed.preferred_quest_duration || 15,
          preferred_quest_duration: parsed.preferred_quest_duration || parsed.preferredDuration || 15,
          preferredDifficulty: parsed.preferredDifficulty || parsed.preferred_difficulty || 'easy',
          preferred_difficulty: parsed.preferred_difficulty || parsed.preferredDifficulty || 'easy',
        };
      }
      return DEFAULT_GUEST_PROFILE;
    } catch {
      return DEFAULT_GUEST_PROFILE;
    }
  },
  setGuestProfile: (p: GuestProfile) => {
    const normalized: GuestProfile = {
      ...p,
      displayName: p.displayName || p.display_name,
      display_name: p.display_name || p.displayName,
      preferredDuration: p.preferredDuration || p.preferred_quest_duration || 15,
      preferred_quest_duration: p.preferred_quest_duration || p.preferredDuration || 15,
      preferredDifficulty: p.preferredDifficulty || p.preferred_difficulty || 'easy',
      preferred_difficulty: p.preferred_difficulty || p.preferredDifficulty || 'easy',
    };
    localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(normalized));
  },

  // Discoveries & Field Journal Memories
  getGuestDiscoveries: (): Discovery[] => {
    try {
      const data = localStorage.getItem(GUEST_DISCOVERIES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  saveGuestDiscovery: (d: Discovery) => {
    const list = storage.getGuestDiscoveries();
    const filtered = list.filter((x) => x.id !== d.id);
    filtered.unshift(d);
    localStorage.setItem(GUEST_DISCOVERIES_KEY, JSON.stringify(filtered));
  },
  deleteGuestDiscovery: (id: string) => {
    const list = storage.getGuestDiscoveries().filter((x) => x.id !== id);
    localStorage.setItem(GUEST_DISCOVERIES_KEY, JSON.stringify(list));
  },

  // Skills & XP
  getGuestSkills: (): SkillBranch[] => {
    try {
      const data = localStorage.getItem(GUEST_SKILLS_KEY);
      return data ? JSON.parse(data) : DEFAULT_GUEST_SKILLS;
    } catch {
      return DEFAULT_GUEST_SKILLS;
    }
  },

  getGuestXP: (): number => {
    try {
      const raw = localStorage.getItem(GUEST_XP_KEY);
      return raw ? parseInt(raw, 10) : 0;
    } catch {
      return 0;
    }
  },

  getGuestLevel: (): number => {
    const xp = storage.getGuestXP();
    return Math.max(1, 1 + Math.floor(xp / 100));
  },

  addGuestXP: (
    categoryOrAmount: SkillCategory | number,
    maybeXp?: number
  ): { level: number; totalXp: number } => {
    let amount = 0;
    let cat: SkillCategory = 'visual_explorer';

    if (typeof categoryOrAmount === 'number') {
      amount = categoryOrAmount;
    } else {
      cat = categoryOrAmount;
      amount = maybeXp || 0;
    }

    const currentXP = storage.getGuestXP() + amount;
    localStorage.setItem(GUEST_XP_KEY, currentXP.toString());

    const skills = storage.getGuestSkills();
    const branch = skills.find((b) => b.skill_category === cat);
    if (branch) {
      branch.xp += amount;
      branch.completed_quest_count += 1;
      branch.level = 1 + Math.floor(branch.xp / 50);
      branch.xp_for_next_level = Math.max(0, branch.level * 50 - branch.xp);
      branch.updated_at = new Date().toISOString();
      localStorage.setItem(GUEST_SKILLS_KEY, JSON.stringify(skills));
    }

    const level = Math.max(1, 1 + Math.floor(currentXP / 100));
    return { level, totalXp: currentXP };
  },

  // Map Fog-of-War Explored Cells
  getGuestCells: (): any[] => {
    try {
      const data = localStorage.getItem(GUEST_CELLS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveGuestCell: (cell: any) => {
    const list = storage.getGuestCells();
    const existing = list.find((c) => c.id === cell.id || (c.latitude === cell.latitude && c.longitude === cell.longitude));
    if (!existing) {
      list.push(cell);
      localStorage.setItem(GUEST_CELLS_KEY, JSON.stringify(list));
    }
  },

  clearGuestCells: () => {
    localStorage.removeItem(GUEST_CELLS_KEY);
  },

  // Active & Completed Quests Persistence
  getGuestActiveQuests: (): UserQuestProgress[] => {
    try {
      const data = localStorage.getItem(GUEST_ACTIVE_QUESTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getGuestCompletedQuests: (): UserQuestProgress[] => {
    try {
      const data = localStorage.getItem(GUEST_COMPLETED_QUESTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  startGuestQuest: (questId: string): UserQuestProgress => {
    const active = storage.getGuestActiveQuests().filter((q) => q.quest_id !== questId);
    const progress: UserQuestProgress = {
      id: `local-progress-${Date.now()}`,
      user_id: 'guest',
      quest_id: questId,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    };
    active.unshift(progress);
    localStorage.setItem(GUEST_ACTIVE_QUESTS_KEY, JSON.stringify(active));
    return progress;
  },

  completeGuestQuest: (
    questId: string,
    reflection?: string,
    xpReward = 50,
    category: SkillCategory = 'visual_explorer'
  ): UserQuestProgress => {
    // Remove from active
    const active = storage.getGuestActiveQuests().filter((q) => q.quest_id !== questId);
    localStorage.setItem(GUEST_ACTIVE_QUESTS_KEY, JSON.stringify(active));

    // Add to completed
    const completed = storage.getGuestCompletedQuests().filter((q) => q.quest_id !== questId);
    const item: UserQuestProgress = {
      id: `local-completion-${Date.now()}`,
      user_id: 'guest',
      quest_id: questId,
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };
    completed.unshift(item);
    localStorage.setItem(GUEST_COMPLETED_QUESTS_KEY, JSON.stringify(completed));

    // Award XP and increment skill branch
    storage.addGuestXP(category, xpReward);

    return item;
  },

  // AI-Generated and Custom Quests
  getGuestCustomQuests: (): Quest[] => {
    try {
      const data = localStorage.getItem(GUEST_CUSTOM_QUESTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveGuestCustomQuest: (quest: Quest) => {
    const custom = storage.getGuestCustomQuests().filter((q) => q.id !== quest.id);
    custom.unshift(quest);
    localStorage.setItem(GUEST_CUSTOM_QUESTS_KEY, JSON.stringify(custom));
  },

  // Full reset
  clearAllGuestData: () => {
    localStorage.removeItem(GUEST_PROFILE_KEY);
    localStorage.removeItem(GUEST_DISCOVERIES_KEY);
    localStorage.removeItem(GUEST_SKILLS_KEY);
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(GUEST_XP_KEY);
    localStorage.removeItem(GUEST_CELLS_KEY);
    localStorage.removeItem(GUEST_ACTIVE_QUESTS_KEY);
    localStorage.removeItem(GUEST_COMPLETED_QUESTS_KEY);
    localStorage.removeItem(GUEST_CUSTOM_QUESTS_KEY);
  },

  clear: () => {
    storage.clearAllGuestData();
  },
};
