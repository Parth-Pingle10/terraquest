import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { skillsApi } from '../services/skills-api';
import { storage } from '../lib/storage';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { SkillCategory } from '../types';
import { 
  Eye, 
  TreePine, 
  Volume2, 
  Building2, 
  Lock, 
  CheckCircle2, 
  Sparkles, 
  Award, 
  Compass, 
  ChevronRight,
  TrendingUp,
  Layers
} from 'lucide-react';

interface SkillNode {
  id: string;
  title: string;
  description: string;
  level_required: number;
  is_unlocked: boolean;
  is_mastered: boolean;
  icon: string;
  xp_reward: number;
}

interface UISkillBranch {
  id: string;
  key: string;
  title: string;
  description: string;
  level: number;
  xp: number;
  next_level_xp: number;
  nodes: SkillNode[];
}

interface UISkillTree {
  total_xp: number;
  overall_level: number;
  xp_to_next_level: number;
  branches: UISkillBranch[];
}

const DEFAULT_BRANCH_META: Record<string, { title: string; description: string; nodes: SkillNode[] }> = {
  visual_explorer: {
    title: 'Visual Explorer',
    description: 'Attunement to shadows, miniature geometries, subtle chromatic shifts, and hidden textures.',
    nodes: [
      {
        id: 'vis-1',
        title: 'Micro-Observation',
        description: 'Notice details smaller than an acorn within arm\'s reach.',
        level_required: 1,
        is_unlocked: true,
        is_mastered: false,
        icon: 'eye',
        xp_reward: 50
      },
      {
        id: 'vis-2',
        title: 'Chiaroscuro Vision',
        description: 'Track how moving shadows alter architectural surfaces throughout the day.',
        level_required: 2,
        is_unlocked: false,
        is_mastered: false,
        icon: 'sun',
        xp_reward: 100
      },
      {
        id: 'vis-3',
        title: 'Forgotten Palettes',
        description: 'Identify 5 distinct natural pigment shades in an urban concrete environment.',
        level_required: 3,
        is_unlocked: false,
        is_mastered: false,
        icon: 'palette',
        xp_reward: 200
      }
    ]
  },
  nature_tracker: {
    title: 'Nature Tracker',
    description: 'Reading biological clues: lichen growth, moss direction, bird flight paths, and micro-ecosystems.',
    nodes: [
      {
        id: 'nat-1',
        title: 'Sidewalk Flora',
        description: 'Spot resilient plant species flourishing in pavement fissures.',
        level_required: 1,
        is_unlocked: true,
        is_mastered: false,
        icon: 'leaf',
        xp_reward: 50
      },
      {
        id: 'nat-2',
        title: 'Bark & Lichen Atlas',
        description: 'Distinguish crustose vs. foliose lichen on native trees.',
        level_required: 2,
        is_unlocked: false,
        is_mastered: false,
        icon: 'tree',
        xp_reward: 120
      },
      {
        id: 'nat-3',
        title: 'Avian Wayfinding',
        description: 'Observe bird roosting patterns before twilight.',
        level_required: 3,
        is_unlocked: false,
        is_mastered: false,
        icon: 'feather',
        xp_reward: 220
      }
    ]
  },
  sound_hunter: {
    title: 'Sound Hunter',
    description: 'Sonic geography: ambient wind acoustics, water resonance, echoes, and natural soundscapes.',
    nodes: [
      {
        id: 'snd-1',
        title: 'Quiet Interval',
        description: 'Stand still for 2 minutes and isolate three distinct distant acoustic sources.',
        level_required: 1,
        is_unlocked: true,
        is_mastered: false,
        icon: 'ear',
        xp_reward: 50
      },
      {
        id: 'snd-2',
        title: 'Wind Architecture',
        description: 'Detect how wind frequency changes through foliage vs. wire fences.',
        level_required: 2,
        is_unlocked: false,
        is_mastered: false,
        icon: 'wind',
        xp_reward: 110
      }
    ]
  },
  urban_explorer: {
    title: 'Urban Explorer',
    description: 'Deciphering the human layer: brick stamps, historic markers, ghost signs, and architectural keystones.',
    nodes: [
      {
        id: 'urb-1',
        title: 'Ghost Signs & Masonry',
        description: 'Discover an architectural insignia or brick stamp over 40 years old.',
        level_required: 1,
        is_unlocked: true,
        is_mastered: false,
        icon: 'building',
        xp_reward: 60
      },
      {
        id: 'urb-2',
        title: 'Infrastructure Archaeology',
        description: 'Identify cast-iron manhole foundry marks or historic curbside markers.',
        level_required: 2,
        is_unlocked: false,
        is_mastered: false,
        icon: 'compass',
        xp_reward: 130
      }
    ]
  }
};

export const SkillsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [skillTree, setSkillTree] = useState<UISkillTree | null>(null);
  const [selectedBranchKey, setSelectedBranchKey] = useState<string>('visual_explorer');
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load Skill Tree Data
  const loadSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAuthenticated) {
        const data = await skillsApi.getSkillTree();
        const mappedBranches: UISkillBranch[] = data.branches.map((b) => {
          const catKey = b.skill_category;
          const meta = DEFAULT_BRANCH_META[catKey] || DEFAULT_BRANCH_META.visual_explorer;
          return {
            id: b.id || `branch-${catKey}`,
            key: catKey,
            title: meta.title,
            description: meta.description,
            level: b.level,
            xp: b.xp,
            next_level_xp: b.xp_for_next_level || 200,
            nodes: meta.nodes.map((n) => ({
              ...n,
              is_unlocked: b.level >= n.level_required,
              is_mastered: b.level > n.level_required,
            })),
          };
        });

        setSkillTree({
          total_xp: data.total_xp,
          overall_level: data.highest_level || 1,
          xp_to_next_level: 200 - (data.total_xp % 200),
          branches: mappedBranches,
        });
      } else {
        // Fallback synthetic guest skill tree
        const guestXP = storage.getGuestXP();
        const guestLevel = storage.getGuestLevel();
        const nextXP = guestLevel * 200;

        const guestBranches: UISkillBranch[] = Object.entries(DEFAULT_BRANCH_META).map(([key, meta]) => {
          const branchXP = Math.floor(guestXP * 0.25);
          const branchLevel = Math.max(1, Math.floor(guestLevel / 2));
          return {
            id: `branch-${key}`,
            key,
            title: meta.title,
            description: meta.description,
            level: branchLevel,
            xp: branchXP,
            next_level_xp: 200,
            nodes: meta.nodes.map((n) => ({
              ...n,
              is_unlocked: branchLevel >= n.level_required,
              is_mastered: branchLevel > n.level_required,
            })),
          };
        });

        setSkillTree({
          total_xp: guestXP,
          overall_level: guestLevel,
          xp_to_next_level: Math.max(0, nextXP - guestXP),
          branches: guestBranches,
        });
      }
    } catch (err: any) {
      console.error('Failed to load skill tree:', err);
      setError(err.message || 'Could not fetch skill tree progress.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const getBranchIcon = (key: string) => {
    switch (key) {
      case 'visual_explorer':
        return <Eye className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'nature_tracker':
        return <TreePine className="w-5 h-5 text-moss-500" />;
      case 'sound_hunter':
        return <Volume2 className="w-5 h-5 text-brass-500" />;
      case 'urban_explorer':
        return <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      default:
        return <Layers className="w-5 h-5 text-forest-600" />;
    }
  };

  const selectedBranch = skillTree?.branches.find((b) => b.key === selectedBranchKey) || skillTree?.branches[0];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header Banner */}
      <div className="border-b border-parchment-200 dark:border-charcoal-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-forest-700 dark:text-moss-400 font-bold">
            Expedition Mastery
          </span>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-charcoal-900 dark:text-parchment-50 mt-1">
            Discovery Skill Tree
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 dark:text-parchment-300 mt-1 max-w-xl">
            Cultivate your observational senses across 4 distinct disciplines. Complete quests and preserve discoveries to unlock higher perception tiers.
          </p>
        </div>

        {/* Level & XP Overview Card */}
        {skillTree && (
          <div className="bg-white dark:bg-charcoal-900 border border-parchment-200 dark:border-charcoal-800 rounded-2xl p-4 shadow-sm flex items-center gap-5 min-w-[280px]">
            <div className="w-14 h-14 rounded-2xl bg-forest-900 dark:bg-forest-800 text-parchment-100 flex flex-col items-center justify-center border border-moss-500/30 shrink-0">
              <span className="text-[10px] uppercase font-mono tracking-wider text-moss-300">Level</span>
              <span className="text-xl font-serif font-bold leading-none">{skillTree.overall_level}</span>
            </div>

            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-charcoal-800 dark:text-parchment-100">
                  {skillTree.total_xp} Total XP
                </span>
                <span className="text-charcoal-400 text-[11px]">
                  {skillTree.xp_to_next_level} to next lvl
                </span>
              </div>
              <div className="h-2 w-full bg-parchment-200 dark:bg-charcoal-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-forest-700 to-moss-400 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(10, ((skillTree.total_xp % 200) / 200) * 100))}%`
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingState message="Mapping perceptual discipline constellations..." />
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl border border-red-200">
          {error}
        </div>
      ) : skillTree ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 4 Skill Branches Selector (Left/Top) */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-charcoal-500 dark:text-parchment-400 font-bold mb-2">
              Perceptual Disciplines
            </h2>

            {skillTree.branches.map((branch) => {
              const isSelected = branch.key === selectedBranchKey;
              return (
                <div
                  key={branch.key}
                  onClick={() => {
                    setSelectedBranchKey(branch.key);
                    setSelectedNode(null);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-charcoal-900 border-forest-600 dark:border-moss-500 shadow-md ring-1 ring-forest-500/20'
                      : 'bg-white/60 dark:bg-charcoal-900/60 border-parchment-200 dark:border-charcoal-800 hover:border-parchment-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-parchment-100 dark:bg-charcoal-800">
                        {getBranchIcon(branch.key)}
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-sm text-charcoal-900 dark:text-parchment-100">
                          {branch.title}
                        </h3>
                        <span className="text-[11px] text-charcoal-500 dark:text-parchment-400">
                          Tier {branch.level} • {branch.xp} XP
                        </span>
                      </div>
                    </div>

                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-forest-700 dark:text-moss-400 translate-x-1' : 'text-charcoal-300'}`} />
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-parchment-200 dark:bg-charcoal-800 rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-forest-700 dark:bg-moss-400 rounded-full"
                      style={{
                        width: `${Math.min(100, (branch.xp / Math.max(1, branch.next_level_xp)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Branch Details & Node Graph (Right) */}
          <div className="lg:col-span-8 space-y-5">
            {selectedBranch && (
              <Card className="border border-parchment-200 dark:border-charcoal-800 p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="moss" size="sm">Tier {selectedBranch.level}</Badge>
                    <span className="text-xs font-mono text-charcoal-500 dark:text-parchment-400">
                      {selectedBranch.xp} / {selectedBranch.next_level_xp} XP to Next Tier
                    </span>
                  </div>
                  <h2 className="font-serif font-bold text-xl text-charcoal-900 dark:text-parchment-50">
                    {selectedBranch.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-charcoal-600 dark:text-parchment-300 mt-1 leading-relaxed">
                    {selectedBranch.description}
                  </p>
                </div>

                {/* Progression Nodes Constellation */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-charcoal-500 dark:text-parchment-400 font-bold">
                    Perceptual Nodes
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(selectedBranch.nodes || []).map((node, idx) => {
                      const isNodeSelected = selectedNode?.id === node.id;
                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNode(node)}
                          className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[170px] ${
                            isNodeSelected
                              ? 'bg-parchment-100 dark:bg-charcoal-800 border-brass-500 shadow-md ring-2 ring-brass-500/20'
                              : node.is_mastered
                              ? 'bg-forest-50/50 dark:bg-forest-950/30 border-forest-300 dark:border-forest-800'
                              : node.is_unlocked
                              ? 'bg-white dark:bg-charcoal-900 border-parchment-200 dark:border-charcoal-800 hover:border-parchment-300'
                              : 'bg-parchment-50 dark:bg-charcoal-950/60 border-dashed border-parchment-300 dark:border-charcoal-800 opacity-60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-mono text-charcoal-400">
                                0{idx + 1}
                              </span>
                              {node.is_mastered ? (
                                <Badge variant="success" size="sm">Mastered</Badge>
                              ) : node.is_unlocked ? (
                                <Badge variant="outline" size="sm">Unlocked</Badge>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] text-charcoal-400">
                                  <Lock className="w-3 h-3" /> Tier {node.level_required}
                                </span>
                              )}
                            </div>

                            <h4 className="font-serif font-bold text-sm text-charcoal-900 dark:text-parchment-100 mb-1 leading-snug">
                              {node.title}
                            </h4>
                            <p className="text-[11px] text-charcoal-600 dark:text-parchment-300 line-clamp-3">
                              {node.description}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-parchment-200/60 dark:border-charcoal-800 flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-brass-700 dark:text-brass-400">
                              +{node.xp_reward} XP
                            </span>
                            {node.is_mastered ? (
                              <CheckCircle2 className="w-4 h-4 text-forest-600 dark:text-moss-400" />
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Node Details or Recommendation */}
                {selectedNode && (
                  <div className="p-4 bg-parchment-100/70 dark:bg-charcoal-800/80 rounded-2xl border border-parchment-200 dark:border-charcoal-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif font-bold text-base text-charcoal-900 dark:text-parchment-50">
                        {selectedNode.title}
                      </h4>
                      <Badge variant={selectedNode.is_mastered ? 'success' : selectedNode.is_unlocked ? 'outline' : 'default'} size="sm">
                        {selectedNode.is_mastered ? 'Mastered' : selectedNode.is_unlocked ? 'Active Node' : 'Locked'}
                      </Badge>
                    </div>
                    <p className="text-xs text-charcoal-700 dark:text-parchment-200 leading-relaxed">
                      {selectedNode.description}
                    </p>
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs text-brass-700 dark:text-brass-400 font-semibold">
                        Expedition Value: +{selectedNode.xp_reward} XP
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate('/quests')}
                      >
                        Explore Relevant Quests
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
