export type SkillCategory = 'visual_explorer' | 'nature_tracker' | 'sound_hunter' | 'urban_explorer';
export type QuestDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'easy' | 'medium' | 'hard';
export type MapVisibility = 'private' | 'unlisted' | 'public';
export type DiscoveryVisibility = 'private' | 'shared' | 'public' | 'unlisted';

export interface User {
  id: string;
  username: string;
  display_name: string;
  interests: string[];
  preferred_quest_duration: number;
  preferred_difficulty: QuestDifficulty;
  created_at: string;
  xp?: number;
  level?: number;
}

export interface AuthResponse {
  user: User;
  token: {
    access_token: string;
    token_type: string;
    expires_in_minutes: number;
  };
}

export interface MapItem {
  id: string;
  owner_id?: string;
  user_id?: string;
  title: string;
  description?: string;
  map_visibility?: MapVisibility;
  discovered_cells_count?: number;
  total_cells_count?: number;
  region_name?: string | null;
  region_grid_cells?: number;
  exploration_percentage?: number;
  center_latitude?: number;
  center_longitude?: number;
  zoom_level?: number;
  is_public?: boolean;
  cells?: ExplorationCell[];
  created_at: string;
  updated_at?: string;
}

export type ExplorationMap = MapItem;

export interface CheckInResponse {
  map_id?: string;
  cell_id?: string;
  is_new_cell?: boolean;
  is_new_discovery?: boolean;
  total_discovered_cells?: number;
  total_cells_visited?: number;
  exploration_percentage?: number;
  cell_index?: string;
  xp_awarded?: number;
  message?: string;
  status?: string;
  cell_center?: { latitude: number; longitude: number } | null;
}

export interface ExplorationCell {
  id: string;
  map_id?: string;
  cell_id?: string;
  cell_h3_index?: string;
  first_discovered_at?: string;
  last_visited_at?: string;
  visited_at?: string;
  latitude?: number;
  longitude?: number;
  cell_center?: { latitude: number; longitude: number } | null;
  discovery_count?: number;
  visit_count?: number;
  radius_meters?: number;
}

export interface Discovery {
  id: string;
  owner_id?: string;
  user_id?: string;
  map_id?: string;
  title: string;
  description?: string;
  observation: string;
  personal_reflection?: string;
  optional_ai_reflection?: string | null;
  optional_photo_reference?: string | null;
  photo_approved_for_sharing?: boolean;
  photo_blob_id?: string;
  photo_url?: string | null;
  skill_category?: SkillCategory;
  category?: SkillCategory;
  optional_quest_id?: string | null;
  quest_id?: string | null;
  optional_location_name?: string | null;
  optional_latitude?: number | null;
  optional_longitude?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  optional_cell_id?: string | null;
  visibility?: DiscoveryVisibility;
  created_at: string;
  updated_at?: string;
}

export interface CreateDiscoveryRequest {
  title: string;
  observation: string;
  personal_reflection?: string;
  category?: SkillCategory;
  skill_category?: SkillCategory;
  latitude?: number;
  longitude?: number;
  map_id?: string;
  photo_blob_id?: string;
  visibility?: DiscoveryVisibility;
}

export interface SharedDiscoveryView {
  id: string;
  map_id: string;
  title?: string | null;
  description?: string | null;
  observation: string;
  optional_photo_reference?: string | null;
  photo_url?: string | null;
  skill_category: SkillCategory;
  category?: SkillCategory;
  optional_location_name?: string | null;
  approximate_latitude?: number | null;
  approximate_longitude?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
}

export interface SharedMapView {
  map_id: string;
  title: string;
  description: string;
  discovered_cells_count: number;
  exploration_percentage: number;
  center_latitude?: number;
  center_longitude?: number;
  zoom_level?: number;
  region_name?: string;
  owner_display_name?: string;
  notes?: string;
  cells?: ExplorationCell[];
  discoveries?: SharedDiscoveryView[];
  created_at: string;
  can_view_titles: boolean;
  can_view_descriptions: boolean;
  can_view_photos: boolean;
  can_view_locations: boolean;
}

export type SharedMapResponse = SharedMapView;

export interface ShareLink {
  id: string;
  token: string;
  permission_level: string;
  include_discoveries: boolean;
  expires_at?: string | null;
  created_at: string;
}

export interface CreateShareLinkRequest {
  permission_level: string;
  include_discoveries: boolean;
  expires_in_days?: number;
  notes?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  skill_category: SkillCategory;
  category?: SkillCategory;
  duration_minutes: number;
  difficulty: QuestDifficulty;
  instructions: string;
  reflection_questions: string[];
  completion_criteria: string;
  optional_follow_up_prompt?: string | null;
  generation_source: string;
  active: boolean;
  xp_reward?: number;
  created_at?: string;
}

export interface UserQuestProgress {
  id: string;
  user_id: string;
  quest_id: string;
  status: 'started' | 'in_progress' | 'completed';
  started_at: string;
  completed_at?: string | null;
}

export interface GenerateQuestRequest {
  category: SkillCategory;
  difficulty: QuestDifficulty;
  duration_minutes: number;
  prompt?: string;
  user_context?: string;
}

export interface QuestStartResponse {
  completion_id: string;
  quest_id: string;
  title: string;
  instructions: string;
  reflection_questions: string[];
  status: 'started' | 'completed';
  started_at: string;
}

export interface QuestCompletionResponse {
  completion_id: string;
  quest_id: string;
  status: 'completed';
  xp_awarded: number;
  reward_claimed: boolean;
  discovery_id?: string | null;
  ai_reflection?: string | null;
  follow_up_prompt?: string | null;
  skill_category: SkillCategory;
  new_skill_level: number;
  total_skill_xp: number;
}

export interface SkillNode {
  id: string;
  title: string;
  description: string;
  level_required: number;
  is_unlocked: boolean;
  is_mastered: boolean;
  icon: string;
  xp_reward: number;
}

export interface SkillBranch {
  id?: string;
  key?: string;
  title?: string;
  description?: string;
  skill_category: SkillCategory;
  xp: number;
  level: number;
  completed_quest_count: number;
  xp_for_next_level: number;
  next_level_xp?: number;
  unlocked_categories: string[];
  nodes?: SkillNode[];
  updated_at: string;
}

export interface SkillTree {
  branches: SkillBranch[];
  total_xp: number;
  overall_level?: number;
  highest_level: number;
  xp_to_next_level?: number;
}

export type SkillTreeResponse = SkillTree;

export interface AIStatus {
  ollama_reachable: boolean;
  model_available: boolean;
  active_provider: 'ollama' | 'deterministic';
  configured_model: string;
  available?: boolean;
  model?: string;
  provider?: string;
}

export interface ShareResponse {
  share_id: string;
  map_id: string;
  share_token: string;
  share_path: string;
  permission: string;
  include_discovery_titles: boolean;
  include_discovery_descriptions: boolean;
  include_approved_photos: boolean;
  include_approximate_locations: boolean;
  expires_at?: string | null;
  created_at: string;
}

export interface ShareSummary {
  share_id: string;
  map_id: string;
  permission: string;
  is_active: boolean;
  expires_at?: string | null;
  revoked_at?: string | null;
  created_at: string;
}

export interface ExplorationSummary {
  total_unique_discovered_cells: number;
  unique_cells_visited?: number;
  total_saved_discoveries: number;
  total_discoveries?: number;
  total_completed_quests: number;
  total_xp_earned: number;
  skill_breakdown: Record<string, { xp: number; level: number }>;
}

export interface TimelineEvent {
  type: 'discovery' | 'quest_completion';
  id: string;
  title?: string;
  quest_id?: string;
  skill_category?: string;
  xp_awarded?: number;
  timestamp: string;
}

export interface HeatmapPoint {
  cell_id: string;
  latitude: number;
  longitude: number;
  visit_weight: number;
  first_discovered_at: string;
  last_visited_at: string;
}
