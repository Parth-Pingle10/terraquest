import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { questsApi } from '../services/quests-api';
import { aiApi } from '../services/ai-api';
import { storage } from '../lib/storage';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { 
  Quest, 
  SkillCategory, 
  QuestDifficulty, 
  UserQuestProgress, 
  GenerateQuestRequest 
} from '../types';
import { 
  Sparkles, 
  Compass, 
  Clock, 
  Award, 
  CheckCircle2, 
  Filter, 
  Bot, 
  BookOpen, 
  Eye, 
  TreePine, 
  Volume2, 
  Building2,
  ChevronRight,
  Flame,
  AlertCircle,
  Camera,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const QuestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, guestProfile, aiStatus } = useAuth();

  const [quests, setQuests] = useState<Quest[]>([]);
  const [activeQuests, setActiveQuests] = useState<UserQuestProgress[]>([]);
  const [completedQuests, setCompletedQuests] = useState<UserQuestProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [maxDuration, setMaxDuration] = useState<number | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'history'>('available');

  // Selected quest detail modal
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [startingQuest, setStartingQuest] = useState(false);

  // Complete quest modal
  const [completingQuest, setCompletingQuest] = useState<Quest | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);

  // AI Quest Generation modal
  const [showAIGenerateModal, setShowAIGenerateModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiCategory, setAiCategory] = useState<SkillCategory>('visual_explorer');
  const [aiDifficulty, setAiDifficulty] = useState<QuestDifficulty>('easy');
  const [aiDuration, setAiDuration] = useState<number>(15);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiGenError, setAiGenError] = useState<string | null>(null);

  // Moondream Vision Image Understanding
  const [showVisionModal, setShowVisionModal] = useState(false);
  const [visionPhotoBase64, setVisionPhotoBase64] = useState<string | null>(null);
  const [visionPhotoPreview, setVisionPhotoPreview] = useState<string | null>(null);
  const [visionCategory, setVisionCategory] = useState<SkillCategory>('visual_explorer');
  const [visionDifficulty, setVisionDifficulty] = useState<QuestDifficulty>('easy');
  const [visionAnalyzing, setVisionAnalyzing] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);
  const [visionResult, setVisionResult] = useState<{
    description: string;
    observable_details: string[];
    perceived_category: SkillCategory;
    uncertainty_note?: string;
    generated_quest?: Quest;
    source: string;
  } | null>(null);

  const handleSelectVisionPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setVisionError('Please select a valid image file (JPEG, PNG, or WEBP).');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setVisionError('Image size exceeds 4MB. Please choose a smaller photo.');
      return;
    }

    setVisionError(null);
    setVisionResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setVisionPhotoPreview(dataUrl);

      // Downscale if image is high-res to save memory and avoid payload limits
      const img = new Image();
      img.onload = () => {
        const maxDim = 1024;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const scaledBase64 = canvas.toDataURL('image/jpeg', 0.85);
          setVisionPhotoBase64(scaledBase64);
        } else {
          setVisionPhotoBase64(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzePhoto = async () => {
    if (!visionPhotoBase64) {
      setVisionError('Please select or capture a photo first.');
      return;
    }

    setVisionAnalyzing(true);
    setVisionError(null);

    try {
      const result = await aiApi.generateQuestFromImage({
        image_base64: visionPhotoBase64,
        skill_category: visionCategory,
        difficulty: visionDifficulty,
      });

      setVisionResult(result);
      if (result.generated_quest) {
        storage.saveGuestCustomQuest(result.generated_quest);
        setQuests((prev) => [result.generated_quest!, ...prev]);
      }
    } catch (err: any) {
      console.error('Vision analysis error:', err);
      setVisionError(err.message || 'Image analysis failed. Check local Ollama Moondream connection.');
    } finally {
      setVisionAnalyzing(false);
    }
  };

  // Fetch Quests
  const loadQuests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allQuests = await questsApi.listQuests();
      const customQuests = storage.getGuestCustomQuests();
      const combined = [...customQuests, ...allQuests.filter(q => !customQuests.some(cq => cq.id === q.id))];
      setQuests(combined);

      if (isAuthenticated) {
        const userProgress = await questsApi.getUserQuests();
        setActiveQuests(userProgress.filter(p => p.status === 'in_progress'));
        setCompletedQuests(userProgress.filter(p => p.status === 'completed'));
      } else {
        setActiveQuests(storage.getGuestActiveQuests());
        setCompletedQuests(storage.getGuestCompletedQuests());
      }
    } catch (err: any) {
      console.error('Failed to load quests:', err);
      setError(err.message || 'Unable to load quests.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  // Filtered Quest Catalog
  const filteredQuests = quests.filter((q) => {
    if (selectedCategory !== 'all' && q.category !== selectedCategory) return false;
    if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
    if (maxDuration !== 'all' && q.duration_minutes > maxDuration) return false;
    return true;
  });

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'visual_explorer': return <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'nature_tracker': return <TreePine className="w-4 h-4 text-moss-500" />;
      case 'sound_hunter': return <Volume2 className="w-4 h-4 text-brass-500" />;
      case 'urban_explorer': return <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      default: return <Compass className="w-4 h-4 text-forest-600" />;
    }
  };

  const getCategoryBadgeVariant = (category?: string): any => {
    switch (category) {
      case 'visual_explorer': return 'success';
      case 'nature_tracker': return 'moss';
      case 'sound_hunter': return 'brass';
      case 'urban_explorer': return 'outline';
      default: return 'default';
    }
  };

  // Start a quest
  const handleStartQuest = async (quest: Quest) => {
    // If it's the signature quest, navigate directly to signature quest runner
    if (quest.id === 'quest_almost_missed') {
      navigate('/signature-quest');
      return;
    }

    setStartingQuest(true);
    try {
      if (isAuthenticated) {
        await questsApi.startQuest(quest.id);
        await loadQuests();
        setActiveTab('active');
        setSelectedQuest(null);
      } else {
        storage.startGuestQuest(quest.id);
        await loadQuests();
        setActiveTab('active');
        setSelectedQuest(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start quest');
    } finally {
      setStartingQuest(false);
    }
  };

  // Complete a quest
  const handleConfirmCompletion = async () => {
    if (!completingQuest) return;
    setIsSubmittingCompletion(true);
    try {
      if (isAuthenticated) {
        await questsApi.completeQuest(completingQuest.id, {
          reflection: completionNotes
        });
        await loadQuests();
      } else {
        storage.completeGuestQuest(
          completingQuest.id,
          completionNotes,
          completingQuest.xp_reward || 50,
          completingQuest.skill_category || completingQuest.category || 'visual_explorer'
        );
        await loadQuests();
      }

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });

      setCompletingQuest(null);
      setCompletionNotes('');
      setActiveTab('history');
    } catch (err: any) {
      alert(err.message || 'Could not complete quest');
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  // Generate quest via AI
  const handleGenerateAIQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiGenerating(true);
    setAiGenError(null);

    try {
      const payload: GenerateQuestRequest = {
        category: aiCategory,
        difficulty: aiDifficulty,
        duration_minutes: aiDuration,
        prompt: aiPrompt || undefined,
        user_context: `Explorer with focus in observation and natural history.`
      };

      const newQuest = await aiApi.generateQuest(payload);
      storage.saveGuestCustomQuest(newQuest);
      setQuests(prev => [newQuest, ...prev]);
      setShowAIGenerateModal(false);
      setAiPrompt('');
      setSelectedQuest(newQuest);
    } catch (err: any) {
      console.error(err);
      setAiGenError(err.message || 'AI expedition generation failed. Check backend Ollama connection.');
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-parchment-200 dark:border-charcoal-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-widest text-forest-700 dark:text-moss-400 font-bold">
              Expedition Field Orders
            </span>
          </div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-charcoal-900 dark:text-parchment-50">
            Observation Quests
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 dark:text-parchment-300 mt-1 max-w-xl">
            Choose guided expeditions crafted to cultivate deep noticing, natural tracking, architectural study, and sonic awareness.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Moondream Vision AI Button */}
          <Button
            variant="outline"
            size="md"
            onClick={() => setShowVisionModal(true)}
            className="shadow-sm border-forest-600/40 text-forest-800 dark:text-parchment-100 hover:bg-forest-50 dark:hover:bg-forest-900/40"
          >
            <Camera className="w-4 h-4 mr-2 text-moss-600 dark:text-moss-400" />
            <span>Vision AI (Moondream)</span>
          </Button>

          {/* AI Generator Button */}
          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowAIGenerateModal(true)}
            className="shadow-sm"
          >
            <Sparkles className="w-4 h-4 mr-2 text-brass-500" />
            <span>Generate AI Quest</span>
          </Button>

          {/* Signature Quest Shortcut */}
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/signature-quest')}
            className="shadow-sm"
          >
            <Compass className="w-4 h-4 mr-2 text-moss-300" />
            <span>Signature Quest</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-parchment-200 dark:border-charcoal-800">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('available')}
            className={`pb-3 text-sm font-serif font-semibold border-b-2 transition-colors ${
              activeTab === 'available'
                ? 'border-forest-700 dark:border-moss-400 text-forest-900 dark:text-parchment-100'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800 dark:text-parchment-400'
            }`}
          >
            Available Quests ({quests.length})
          </button>

          {isAuthenticated && (
            <>
              <button
                onClick={() => setActiveTab('active')}
                className={`pb-3 text-sm font-serif font-semibold border-b-2 transition-colors ${
                  activeTab === 'active'
                    ? 'border-forest-700 dark:border-moss-400 text-forest-900 dark:text-parchment-100'
                    : 'border-transparent text-charcoal-500 hover:text-charcoal-800 dark:text-parchment-400'
                }`}
              >
                In Progress ({activeQuests.length})
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`pb-3 text-sm font-serif font-semibold border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-forest-700 dark:border-moss-400 text-forest-900 dark:text-parchment-100'
                    : 'border-transparent text-charcoal-500 hover:text-charcoal-800 dark:text-parchment-400'
                }`}
              >
                Completed History ({completedQuests.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters (Only for Available tab) */}
      {activeTab === 'available' && (
        <div className="bg-parchment-100/70 dark:bg-charcoal-900/60 p-4 rounded-2xl border border-parchment-200 dark:border-charcoal-800 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-charcoal-700 dark:text-parchment-300 font-semibold">
            <Filter className="w-3.5 h-3.5 text-forest-700 dark:text-moss-400" />
            <span>Filter By:</span>
          </div>

          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-800 dark:text-parchment-100"
          >
            <option value="all">All Disciplines</option>
            <option value="visual_explorer">Visual Explorer</option>
            <option value="nature_tracker">Nature Tracker</option>
            <option value="sound_hunter">Sound Hunter</option>
            <option value="urban_explorer">Urban Explorer</option>
          </select>

          {/* Difficulty */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-800 dark:text-parchment-100"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          {/* Duration */}
          <select
            value={maxDuration}
            onChange={(e) => setMaxDuration(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-800 dark:text-parchment-100"
          >
            <option value="all">Any Duration</option>
            <option value={10}>Under 10 mins</option>
            <option value={15}>Under 15 mins</option>
            <option value={30}>Under 30 mins</option>
          </select>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <LoadingState message="Summoning field quests and expedition directives..." />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/40 p-4 rounded-xl border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* TAB 1: AVAILABLE QUESTS */}
          {activeTab === 'available' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
              {filteredQuests.map((quest) => (
                <Card
                  key={quest.id}
                  className="flex flex-col justify-between hover:shadow-md transition-shadow group cursor-pointer border border-parchment-200 dark:border-charcoal-800"
                  onClick={() => setSelectedQuest(quest)}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {getCategoryIcon(quest.category || quest.skill_category)}
                        <Badge variant={getCategoryBadgeVariant(quest.category || quest.skill_category)} size="sm">
                          {(quest.category || quest.skill_category || 'visual_explorer').replace('_', ' ')}
                        </Badge>
                      </div>
                      <Badge variant="outline" size="sm" className="capitalize">
                        {quest.difficulty}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-serif font-bold text-base text-charcoal-900 dark:text-parchment-100 group-hover:text-forest-700 dark:group-hover:text-moss-400 transition-colors">
                        {quest.title}
                      </h3>
                      <p className="text-xs text-charcoal-600 dark:text-parchment-300 line-clamp-3 mt-1.5 leading-relaxed">
                        {quest.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-parchment-200/80 dark:border-charcoal-800 flex items-center justify-between text-xs text-charcoal-500 dark:text-parchment-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {quest.duration_minutes} min
                    </span>

                    <span className="flex items-center gap-1 font-semibold text-brass-700 dark:text-brass-400">
                      <Award className="w-3.5 h-3.5" />
                      +{quest.xp_reward} XP
                    </span>

                    <span className="text-forest-700 dark:text-moss-400 font-medium group-hover:translate-x-0.5 transition-transform flex items-center">
                      View <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* TAB 2: ACTIVE QUESTS */}
          {activeTab === 'active' && (
            <div className="space-y-4">
              {activeQuests.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-charcoal-900 rounded-2xl border border-dashed border-parchment-300 dark:border-charcoal-800">
                  <Compass className="w-10 h-10 mx-auto text-charcoal-400 mb-2" />
                  <p className="text-sm font-serif font-semibold text-charcoal-700 dark:text-parchment-200">
                    No Expeditions Currently Active
                  </p>
                  <p className="text-xs text-charcoal-500 mt-1">
                    Select a quest from the Available tab to embark.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {activeQuests.map((prog) => {
                    const questDetails = quests.find(q => q.id === prog.quest_id);
                    return (
                      <Card key={prog.id} className="p-4 border border-forest-200 dark:border-forest-900/60 bg-forest-50/20 dark:bg-forest-950/20">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="moss" size="sm">In Progress</Badge>
                          <span className="text-xs text-charcoal-400">
                            Started {prog.started_at ? new Date(prog.started_at).toLocaleDateString() : 'recently'}
                          </span>
                        </div>
                        <h3 className="font-serif font-bold text-base text-charcoal-900 dark:text-parchment-100">
                          {questDetails?.title || 'Active Quest'}
                        </h3>
                        <p className="text-xs text-charcoal-600 dark:text-parchment-300 mt-1 mb-4">
                          {questDetails?.description}
                        </p>

                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              if (questDetails) setCompletingQuest(questDetails);
                            }}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            Record Completion
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMPLETED QUESTS HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {completedQuests.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-charcoal-900 rounded-2xl border border-dashed border-parchment-300 dark:border-charcoal-800">
                  <Award className="w-10 h-10 mx-auto text-charcoal-400 mb-2" />
                  <p className="text-sm font-serif font-semibold text-charcoal-700 dark:text-parchment-200">
                    No Completed Expeditions Yet
                  </p>
                  <p className="text-xs text-charcoal-500 mt-1">
                    Your accomplished field quests will be honored here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedQuests.map((prog) => {
                    const questDetails = quests.find(q => q.id === prog.quest_id);
                    return (
                      <div
                        key={prog.id}
                        className="p-4 bg-white dark:bg-charcoal-900 border border-parchment-200 dark:border-charcoal-800 rounded-2xl flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-forest-100 dark:bg-forest-900/50 text-forest-700 dark:text-moss-400 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-serif font-bold text-sm text-charcoal-900 dark:text-parchment-100">
                              {questDetails?.title || 'Completed Expedition'}
                            </h4>
                            <span className="text-[11px] text-charcoal-500 dark:text-parchment-400">
                              Completed {prog.completed_at ? new Date(prog.completed_at).toLocaleDateString() : ''}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-brass-700 dark:text-brass-400">
                            +{questDetails?.xp_reward || 50} XP
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL 1: QUEST DETAILS */}
      <Modal
        isOpen={selectedQuest !== null}
        onClose={() => setSelectedQuest(null)}
        title={selectedQuest?.title || 'Quest Details'}
      >
        {selectedQuest && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-parchment-200 dark:border-charcoal-800 pb-3">
              <div className="flex items-center gap-2">
                <Badge variant={getCategoryBadgeVariant(selectedQuest.category || selectedQuest.skill_category)} size="sm">
                  {(selectedQuest.category || selectedQuest.skill_category || 'visual_explorer').replace('_', ' ')}
                </Badge>
                <Badge variant="outline" size="sm" className="capitalize">
                  {selectedQuest.difficulty}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-xs text-charcoal-600 dark:text-parchment-300 font-semibold">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {selectedQuest.duration_minutes} min
                </span>
                <span className="flex items-center gap-1 text-brass-600 dark:text-brass-400">
                  <Award className="w-3.5 h-3.5" />
                  +{selectedQuest.xp_reward} XP
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500 dark:text-parchment-400 block mb-1">
                Field Briefing
              </span>
              <p className="text-xs text-charcoal-700 dark:text-parchment-200 leading-relaxed">
                {selectedQuest.description}
              </p>
            </div>

            {selectedQuest.instructions && (
              <div className="bg-parchment-100 dark:bg-charcoal-800 p-3 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500 dark:text-parchment-400 block">
                  Expedition Instructions
                </span>
                <p className="text-xs text-charcoal-800 dark:text-parchment-200 whitespace-pre-line leading-relaxed">
                  {selectedQuest.instructions}
                </p>
              </div>
            )}

            {selectedQuest.completion_criteria && (
              <div className="bg-moss-50 dark:bg-forest-950/40 p-3 rounded-xl border border-moss-200/50 dark:border-forest-800/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest-700 dark:text-moss-400 block mb-1">
                  Completion Criteria
                </span>
                <p className="text-xs text-charcoal-700 dark:text-parchment-200">
                  {selectedQuest.completion_criteria}
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedQuest(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={startingQuest}
                onClick={() => handleStartQuest(selectedQuest)}
              >
                Start Expedition
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: RECORD COMPLETION */}
      <Modal
        isOpen={completingQuest !== null}
        onClose={() => setCompletingQuest(null)}
        title="Complete Field Expedition"
      >
        {completingQuest && (
          <div className="space-y-4">
            <p className="text-xs text-charcoal-600 dark:text-parchment-400">
              Summarize your observations or reflections before marking "{completingQuest.title}" as complete.
            </p>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
                Expedition Reflection Note
              </label>
              <textarea
                rows={3}
                required
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="What did you observe? What stood out in the terrain?"
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCompletingQuest(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={isSubmittingCompletion}
                onClick={handleConfirmCompletion}
              >
                Submit & Claim +{completingQuest.xp_reward} XP
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: AI QUEST GENERATOR */}
      <Modal
        isOpen={showAIGenerateModal}
        onClose={() => setShowAIGenerateModal(false)}
        title="Generate AI Field Quest"
      >
        <form onSubmit={handleGenerateAIQuest} className="space-y-4">
          <p className="text-xs text-charcoal-600 dark:text-parchment-400">
            Harness your local Ollama AI to generate a custom observation quest tuned to your environment and exploration goals.
          </p>

          {aiGenError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl text-xs border border-red-200">
              {aiGenError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
              Exploration Discipline
            </label>
            <select
              value={aiCategory}
              onChange={(e) => setAiCategory(e.target.value as SkillCategory)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
            >
              <option value="visual_explorer">Visual Explorer (Shadows, Patterns, Hidden Details)</option>
              <option value="nature_tracker">Nature Tracker (Flora, Fauna, Weathering)</option>
              <option value="sound_hunter">Sound Hunter (Acoustics, Ambient Resonance)</option>
              <option value="urban_explorer">Urban Explorer (Architecture, History, Geometry)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
                Difficulty
              </label>
              <select
                value={aiDifficulty}
                onChange={(e) => setAiDifficulty(e.target.value as QuestDifficulty)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
              >
                <option value="easy">Easy (50 XP)</option>
                <option value="medium">Medium (100 XP)</option>
                <option value="hard">Hard (200 XP)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
                Duration (minutes)
              </label>
              <select
                value={aiDuration}
                onChange={(e) => setAiDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
              >
                <option value={5}>5 Minutes</option>
                <option value={10}>10 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
              Custom Prompt or Specific Focus (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Victorian ironwork, lichen on granite, dusk bird songs..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAIGenerateModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={aiGenerating}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-brass-400" />
              Generate Quest
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: MOONDREAM VISION AI */}
      <Modal
        isOpen={showVisionModal}
        onClose={() => {
          setShowVisionModal(false);
          setVisionResult(null);
          setVisionError(null);
        }}
        title="Moondream Vision AI — Outdoor Photo Understanding"
      >
        <div className="space-y-4">
          <p className="text-xs text-charcoal-600 dark:text-parchment-300">
            Upload or capture a field photo. TerraQuest uses the lightweight <strong>Moondream</strong> vision model to analyze physical textures, patterns, and natural vs built contours to craft an observation quest.
          </p>

          {visionError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl text-xs border border-red-200 dark:border-red-900 flex items-center justify-between">
              <span>{visionError}</span>
              <Button variant="ghost" size="sm" onClick={() => setVisionError(null)} className="text-xs">
                Dismiss
              </Button>
            </div>
          )}

          {/* Photo Uploader / Preview */}
          {!visionPhotoPreview ? (
            <label className="border-2 border-dashed border-parchment-300 dark:border-charcoal-700 hover:border-forest-600 dark:hover:border-moss-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-parchment-100/40 dark:bg-charcoal-900/40">
              <Camera className="w-8 h-8 text-forest-700 dark:text-moss-400 mb-2" />
              <span className="text-xs font-semibold text-charcoal-800 dark:text-parchment-100">
                Click to capture or select observation photo
              </span>
              <span className="text-[11px] text-charcoal-500 mt-1">
                JPEG, PNG, or WEBP up to 4MB (automatically optimized for inference)
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleSelectVisionPhoto}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-parchment-200 dark:border-charcoal-800 max-h-56 bg-charcoal-950 flex items-center justify-center">
                <img
                  src={visionPhotoPreview}
                  alt="Field Observation Preview"
                  className="w-full h-full object-contain max-h-56"
                />
                <button
                  type="button"
                  onClick={() => {
                    setVisionPhotoPreview(null);
                    setVisionPhotoBase64(null);
                    setVisionResult(null);
                  }}
                  className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-1 text-xs px-2 shadow-md transition-colors"
                >
                  Change Photo
                </button>
              </div>

              {/* Discipline and Difficulty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
                    Discipline
                  </label>
                  <select
                    value={visionCategory}
                    onChange={(e) => setVisionCategory(e.target.value as SkillCategory)}
                    className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
                  >
                    <option value="visual_explorer">Visual Explorer</option>
                    <option value="nature_tracker">Nature Tracker</option>
                    <option value="urban_explorer">Urban Explorer</option>
                    <option value="sound_hunter">Sound Hunter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={visionDifficulty}
                    onChange={(e) => setVisionDifficulty(e.target.value as QuestDifficulty)}
                    className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
                  >
                    <option value="easy">Easy (50 XP)</option>
                    <option value="medium">Medium (100 XP)</option>
                    <option value="hard">Hard (200 XP)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowVisionModal(false);
                    setVisionResult(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  loading={visionAnalyzing}
                  onClick={handleAnalyzePhoto}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-brass-400" />
                  Analyze Photo with Moondream
                </Button>
              </div>
            </div>
          )}

          {/* Analysis Results Display */}
          {visionResult && (
            <div className="mt-4 p-4 rounded-2xl bg-forest-50/50 dark:bg-forest-950/40 border border-forest-200 dark:border-forest-900/60 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <Badge variant="moss" size="sm">
                  Model: {visionResult.source === 'moondream' ? 'Moondream Vision' : 'Deterministic Fallback'}
                </Badge>
                <Badge variant="outline" size="sm">
                  Category: {visionResult.perceived_category.replace('_', ' ')}
                </Badge>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest-800 dark:text-moss-400 block mb-1">
                  Observable Field Details
                </span>
                <p className="text-xs text-charcoal-800 dark:text-parchment-100 leading-relaxed">
                  "{visionResult.description}"
                </p>
              </div>

              {visionResult.observable_details?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {visionResult.observable_details.map((detail, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-lg bg-white dark:bg-charcoal-800 border border-parchment-200 dark:border-charcoal-700 text-[11px] text-charcoal-700 dark:text-parchment-200"
                    >
                      • {detail}
                    </span>
                  ))}
                </div>
              )}

              {visionResult.uncertainty_note && (
                <p className="text-[10px] text-charcoal-500 italic">
                  Note: {visionResult.uncertainty_note}
                </p>
              )}

              {visionResult.generated_quest && (
                <div className="pt-2 border-t border-forest-200 dark:border-forest-900/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brass-700 dark:text-brass-400 block mb-1">
                    Generated Observation Quest
                  </span>
                  <div className="p-3 bg-white dark:bg-charcoal-900 rounded-xl border border-parchment-200 dark:border-charcoal-800 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-serif font-bold text-sm text-charcoal-900 dark:text-parchment-100">
                        {visionResult.generated_quest.title}
                      </h4>
                      <p className="text-xs text-charcoal-600 dark:text-parchment-300 line-clamp-1">
                        {visionResult.generated_quest.description}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedQuest(visionResult.generated_quest!);
                        setShowVisionModal(false);
                      }}
                    >
                      Start Quest
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
