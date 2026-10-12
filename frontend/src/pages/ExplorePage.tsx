import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Sparkles, MapPin, Award, BookOpen, ArrowRight, CheckCircle2, Navigation, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LoadingState } from '../components/ui/LoadingState';
import { LeafletMap } from '../components/map/LeafletMap';
import { mapsApi } from '../services/maps-api';
import { questsApi } from '../services/quests-api';
import { discoveriesApi } from '../services/discoveries-api';
import { skillsApi } from '../services/skills-api';
import { explorationApi } from '../services/exploration-api';
import { storage } from '../lib/storage';
import { Discovery, ExplorationCell, MapItem, Quest, SkillBranch } from '../types';
import { formatDate } from '../lib/utils';

export const ExplorePage: React.FC = () => {
  const { user, guestProfile, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [signatureQuest, setSignatureQuest] = useState<Quest | null>(null);
  const [activeMap, setActiveMap] = useState<MapItem | null>(null);
  const [mapCells, setMapCells] = useState<ExplorationCell[]>([]);
  const [recentDiscoveries, setRecentDiscoveries] = useState<Discovery[]>([]);
  const [skills, setSkills] = useState<SkillBranch[]>([]);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [totalXp, setTotalXp] = useState<number>(0);

  const displayName = isAuthenticated && user ? user.display_name || user.username : guestProfile.display_name;

  useEffect(() => {
    loadDashboardData();
  }, [isAuthenticated]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Load signature quest
      try {
        const sig = await questsApi.getSignatureQuest();
        setSignatureQuest(sig);
      } catch {
        // Fallback for offline signature quest
        setSignatureQuest({
          id: 'signature-fallback',
          title: 'One Thing You Almost Missed',
          description: 'Slow down your pace and notice an ordinary detail that you would otherwise overlook.',
          skill_category: 'visual_explorer',
          duration_minutes: 15,
          difficulty: 'beginner',
          instructions: 'Look for something you would normally walk past. Spend 3-5 minutes observing it closely.',
          reflection_questions: [
            'What did you notice that you normally walk past?',
            'Why did it catch your attention once you slowed down?',
          ],
          completion_criteria: 'Find one overlooked detail in your immediate environment.',
          active: true,
          generation_source: 'seed',
        });
      }

      if (isAuthenticated) {
        // Load server data
        const [mapsRes, skillsRes, discRes, summaryRes] = await Promise.allSettled([
          mapsApi.getUserMaps(1, 1),
          skillsApi.getSkillTree(),
          discoveriesApi.getDiscoveries({ limit: 4 }),
          explorationApi.getSummary(),
        ]);

        if (mapsRes.status === 'fulfilled' && mapsRes.value.items.length > 0) {
          const map = mapsRes.value.items[0];
          setActiveMap(map);
          const cellsRes = await mapsApi.getMapCells(map.id, 1, 25);
          setMapCells(cellsRes.items);
        }

        if (skillsRes.status === 'fulfilled') {
          setSkills(skillsRes.value.branches);
          setTotalXp(skillsRes.value.total_xp);
        }

        if (discRes.status === 'fulfilled') {
          setRecentDiscoveries(discRes.value.items);
        }

        if (summaryRes.status === 'fulfilled') {
          setCompletedCount(summaryRes.value.total_completed_quests);
        }
      } else {
        // Load guest data
        const guestSkills = storage.getGuestSkills();
        setSkills(guestSkills);
        setTotalXp(guestSkills.reduce((sum, b) => sum + b.xp, 0));
        setRecentDiscoveries(storage.getGuestDiscoveries().slice(0, 4));
        setCompletedCount(guestSkills.reduce((sum, b) => sum + b.completed_quest_count, 0));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const primaryBranch = skills[0] || {
    skill_category: 'visual_explorer',
    level: 1,
    xp: 0,
    xp_for_next_level: 50,
  };

  if (isLoading) {
    return <LoadingState message="Opening field journal & orienting compass..." />;
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Explorer Greeting Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-900 via-forest-800 to-forest-950 text-parchment-50 p-6 sm:p-8 shadow-elevated border border-forest-700/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-moss-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-700/60 border border-forest-600/40 text-xs font-mono text-brass-400">
              <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '10s' }} />
              Level {primaryBranch.level} Observer {!isAuthenticated && '• Guest Mode'}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-parchment-50">
              Good day, {displayName}.
            </h1>
            <p className="text-sm sm:text-base text-parchment-200/90 font-light leading-relaxed">
              Step outside today. Slow down your pace and notice the quiet details in your surroundings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="brass"
              size="lg"
              onClick={() => navigate('/signature-quest')}
              className="gap-2 shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              Begin Expedition
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/map')}
              className="text-parchment-50 border-parchment-200/30 hover:bg-forest-700/50"
            >
              <Navigation className="w-4 h-4" />
              Open Map
            </Button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-forest-700/40">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-moss-300">Explored Cells</div>
            <div className="text-2xl font-serif font-bold text-parchment-50 mt-0.5">
              {activeMap?.discovered_cells_count || mapCells.length}
            </div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-moss-300">Discoveries</div>
            <div className="text-2xl font-serif font-bold text-parchment-50 mt-0.5">
              {recentDiscoveries.length}
            </div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-moss-300">Completed Quests</div>
            <div className="text-2xl font-serif font-bold text-parchment-50 mt-0.5">
              {completedCount}
            </div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-moss-300">Total XP</div>
            <div className="text-2xl font-serif font-bold text-brass-400 mt-0.5">
              {totalXp} XP
            </div>
          </div>
        </div>
      </section>

      {/* Featured Signature Quest Card */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-forest-950 dark:text-parchment-50 flex items-center gap-2">
            <Eye className="w-5 h-5 text-moss-600 dark:text-moss-400" />
            Signature Daily Experience
          </h2>
          <span className="text-xs font-mono text-forest-700 dark:text-moss-400">
            10-15 Min Walk
          </span>
        </div>

        <Card variant="brass" className="p-6 sm:p-7 relative overflow-hidden group">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <Badge variant="brass">Signature Quest</Badge>
                <Badge variant="difficulty" difficulty="beginner">Beginner</Badge>
                <Badge variant="skill" category="visual_explorer">Visual Explorer</Badge>
              </div>

              <h3 className="font-serif text-2xl font-bold text-forest-950 dark:text-parchment-50">
                {signatureQuest?.title || 'One Thing You Almost Missed'}
              </h3>

              <p className="text-sm sm:text-base text-forest-900/80 dark:text-parchment-200 leading-relaxed">
                {signatureQuest?.description ||
                  'Slow down your pace and notice an ordinary detail that you would otherwise overlook.'}
              </p>

              <div className="text-xs font-mono text-forest-800/70 dark:text-parchment-400 flex items-center gap-4">
                <span>⏱ ~15 Minutes</span>
                <span>🌿 10 XP Awarded</span>
                <span>📱 Zero GPS Required</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/signature-quest')}
              className="gap-2 shrink-0 group-hover:scale-105"
            >
              Start Quest
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </section>

      {/* Exploration Map Preview & Skill Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Preview (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-serif text-xl font-bold text-forest-950 dark:text-parchment-50 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-moss-600 dark:text-moss-400" />
              Exploration Field Grid
            </h2>
            <Link to="/map" className="text-xs font-semibold text-forest-800 dark:text-brass-400 hover:underline flex items-center gap-1">
              Full Map <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <Card variant="journal" className="p-2 overflow-hidden">
            <LeafletMap
              height="300px"
              cells={mapCells}
              discoveries={recentDiscoveries}
              zoom={13}
            />
            <div className="p-3 bg-parchment-100/60 dark:bg-charcoal-900 flex items-center justify-between text-xs text-forest-800 dark:text-parchment-300">
              <span>Map: {activeMap?.title || 'Default Exploration Grid'}</span>
              <span className="font-mono">{mapCells.length} cells discovered</span>
            </div>
          </Card>
        </div>

        {/* Skill Progress Snapshot (1 col) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-serif text-xl font-bold text-forest-950 dark:text-parchment-50 flex items-center gap-2">
              <Award className="w-5 h-5 text-brass-500" />
              Skill Tree
            </h2>
            <Link to="/skills" className="text-xs font-semibold text-forest-800 dark:text-brass-400 hover:underline flex items-center gap-1">
              Details <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <Card variant="journal" className="p-5 space-y-4">
            {skills.map((branch) => {
              const categoryTitle = branch.skill_category.replace('_', ' ');
              const progressPct = Math.min(100, Math.round(((branch.xp % 50) / 50) * 100));

              return (
                <div key={branch.skill_category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium capitalize text-forest-950 dark:text-parchment-100">
                      {categoryTitle}
                    </span>
                    <span className="font-mono text-forest-700 dark:text-moss-400">
                      Lvl {branch.level} • {branch.xp} XP
                    </span>
                  </div>
                  <div className="w-full bg-parchment-200 dark:bg-charcoal-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-forest-700 dark:bg-moss-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="pt-2 border-t border-parchment-200 dark:border-charcoal-800">
              <Link to="/quests">
                <Button variant="secondary" size="sm" className="w-full justify-between">
                  <span>Browse Side Quests</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Discoveries Feed */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-forest-950 dark:text-parchment-50 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-moss-600 dark:text-moss-400" />
            Recent Field Notes & Memories
          </h2>
          <Link to="/memories" className="text-xs font-semibold text-forest-800 dark:text-brass-400 hover:underline flex items-center gap-1">
            Memory Atlas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentDiscoveries.length === 0 ? (
          <Card variant="sunken" className="p-8 text-center space-y-3">
            <Compass className="w-10 h-10 text-forest-600/40 dark:text-moss-400/40 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-forest-900 dark:text-parchment-200">
              Your field journal is waiting.
            </h3>
            <p className="text-sm text-forest-800/70 dark:text-parchment-400 max-w-md mx-auto">
              Complete your first quest or add a manual observation to begin cataloging your real-world discoveries.
            </p>
            <Button variant="primary" size="sm" onClick={() => navigate('/signature-quest')}>
              Start First Quest
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentDiscoveries.map((disc) => (
              <Card
                key={disc.id}
                variant="journal"
                className="p-5 flex flex-col justify-between hover:border-forest-600/40 transition-colors cursor-pointer group"
                onClick={() => navigate('/memories')}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="skill" category={disc.skill_category || disc.category || 'visual_explorer'}>
                      {(disc.skill_category || disc.category || 'visual_explorer').replace('_', ' ')}
                    </Badge>
                    <span className="text-[10px] font-mono text-forest-700/60 dark:text-parchment-400">
                      {formatDate(disc.created_at)}
                    </span>
                  </div>

                  <h4 className="font-serif font-bold text-base text-forest-950 dark:text-parchment-100 group-hover:text-forest-800 transition-colors line-clamp-1">
                    {disc.title}
                  </h4>

                  <p className="text-xs text-forest-900/80 dark:text-parchment-300 line-clamp-3 leading-relaxed">
                    "{disc.observation}"
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-parchment-200 dark:border-charcoal-800 flex items-center justify-between text-[11px] font-mono text-forest-700 dark:text-moss-400">
                  <span>{disc.optional_location_name || 'Field entry'}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
