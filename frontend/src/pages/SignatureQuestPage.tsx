import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  Eye,
  SkipForward,
  Award,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { questsApi } from '../services/quests-api';
import { aiApi } from '../services/ai-api';
import { discoveriesApi } from '../services/discoveries-api';
import { mapsApi } from '../services/maps-api';
import { saveLocalPhoto } from '../lib/idb';
import { storage } from '../lib/storage';
import { Quest, QuestCompletionResponse } from '../types';

export const SignatureQuestPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUserData } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // User input states
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoId] = useState<string>(() => `photo_${Date.now()}`);
  const [observation, setObservation] = useState<string>('');
  const [attentionReason, setAttentionReason] = useState<string>('');
  const [missedDetail, setMissedDetail] = useState<string>('');

  // AI & Completion results
  const [isGeneratingReflection, setIsGeneratingReflection] = useState<boolean>(false);
  const [aiReflection, setAiReflection] = useState<string>('');
  const [aiSource, setAiSource] = useState<string>('local');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completionResult, setCompletionResult] = useState<QuestCompletionResponse | null>(null);
  const [guestXPResult, setGuestXPResult] = useState<{ level: number; totalXp: number } | null>(null);

  useEffect(() => {
    loadQuest();
  }, []);

  const loadQuest = async () => {
    setIsLoading(true);
    try {
      const q = await questsApi.getSignatureQuest();
      setQuest(q);
    } catch {
      // Default signature template fallback
      setQuest({
        id: 'one-thing-you-almost-missed',
        title: 'One Thing You Almost Missed',
        description: 'Slow down your pace and notice an ordinary detail that you would otherwise overlook.',
        skill_category: 'visual_explorer',
        duration_minutes: 15,
        difficulty: 'beginner',
        instructions:
          'Walk along your usual route, but slow your pace by half. Look for something you would normally walk past—a pattern of moss on mortar, a carved marking on a curb, or sunlight hitting an unexpected surface. Spend 3-5 minutes observing it closely.',
        reflection_questions: [
          'What did you notice that you normally walk past?',
          'Why did it catch your attention once you slowed down?',
          'What might you have missed if you had not slowed down?',
        ],
        completion_criteria: 'Find one overlooked detail and record an observation.',
        active: true,
        generation_source: 'seed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Step 4 -> 5: Fetch AI reflection
  const handleProceedToAIReflection = async () => {
    if (!observation.trim()) return;

    setStep(5);
    setIsGeneratingReflection(true);

    try {
      const res = await aiApi.generateReflection({
        observation: observation.trim(),
        personal_reflection: `${attentionReason} ${missedDetail}`.trim(),
        skill_category: 'visual_explorer',
      });
      setAiReflection(res.reflection_text);
      setAiSource(res.source);
    } catch {
      // Graceful fallback: offline reflection
      setAiReflection(
        `By pausing to notice "${observation.slice(0, 60)}...", you tuned your observation to subtle beauty that most walk right past. Every physical space has quiet stories waiting for an observant eye.`
      );
      setAiSource('deterministic');
    } finally {
      setIsGeneratingReflection(false);
    }
  };

  // Step 6: Save Discovery & Complete Quest
  const handleCompleteAndPreserve = async () => {
    setIsSubmitting(true);
    try {
      // Save photo locally in IndexedDB if present
      if (photoDataUrl) {
        try {
          await saveLocalPhoto(photoId, photoDataUrl);
        } catch {
          // Continue if IndexedDB errors
        }
      }

      const combinedReflection = [
        attentionReason && `Why it caught attention: ${attentionReason}`,
        missedDetail && `What I almost missed: ${missedDetail}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      if (isAuthenticated && quest?.id) {
        // Authenticated server-side completion
        // Find user default map
        let mapId: string | undefined = undefined;
        try {
          const maps = await mapsApi.getUserMaps(1, 1);
          if (maps.items.length > 0) {
            mapId = maps.items[0].id;
          }
        } catch {
          // ignore
        }

        const comp = await questsApi.completeQuest(quest.id, {
          observation: observation.trim(),
          reflection: combinedReflection,
          photo_reference: photoDataUrl ? photoId : undefined,
          map_id: mapId,
          create_discovery: true,
        });
        setCompletionResult(comp);
        await refreshUserData();
      } else {
        // Guest mode local completion
        const xpRes = storage.addGuestXP('visual_explorer', 10);
        setGuestXPResult(xpRes);

        storage.saveGuestDiscovery({
          id: `guest_disc_${Date.now()}`,
          map_id: 'guest_local_map',
          title: `Discovery: ${quest?.title || 'One Thing You Almost Missed'}`,
          description: `Completed quest '${quest?.title || 'One Thing You Almost Missed'}'`,
          observation: observation.trim(),
          personal_reflection: combinedReflection,
          optional_ai_reflection: aiReflection,
          optional_photo_reference: photoDataUrl ? photoId : undefined,
          photo_approved_for_sharing: false,
          skill_category: 'visual_explorer',
          visibility: 'private',
          created_at: new Date().toISOString(),
        });
      }

      // Step 7: Celebration!
      setStep(7);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#2a553c', '#d4af37', '#67a37e', '#fcfbf8'],
      });
    } catch {
      // Advance to celebration regardless of partial network issue
      setStep(7);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-forest-800">Loading signature quest...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-8 px-2 sm:px-4">
      {/* Progress Indicator */}
      <div className="mb-6 flex items-center justify-between text-xs font-mono text-forest-700/70 dark:text-moss-400">
        <span className="flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-forest-800 dark:text-brass-400" />
          One Thing You Almost Missed
        </span>
        <span>Stage {step} of 7</span>
      </div>

      <div className="w-full bg-parchment-200 dark:bg-charcoal-800 h-1.5 rounded-full mb-8 overflow-hidden">
        <div
          className="bg-forest-800 dark:bg-brass-500 h-full transition-all duration-300"
          style={{ width: `${(step / 7) * 100}%` }}
        />
      </div>

      {/* SCREEN 1: THE INVITATION */}
      {step === 1 && (
        <Card variant="journal" className="p-6 sm:p-10 space-y-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-moss-100 dark:bg-forest-900/60 border border-moss-300 dark:border-forest-700 flex items-center justify-center mx-auto text-forest-900 dark:text-brass-400">
            <Compass className="w-8 h-8" />
          </div>

          <div className="space-y-3">
            <Badge variant="brass" className="mx-auto">
              Signature Expedition
            </Badge>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-forest-950 dark:text-parchment-50 leading-tight">
              Today, look for something you would normally walk past.
            </h1>
            <p className="text-sm sm:text-base text-forest-900/80 dark:text-parchment-200 max-w-lg mx-auto leading-relaxed">
              You do not need to travel far or visit an exotic landmark. A cracked pavement, weathered brickwork, or sunlight through leaves holds a story.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-parchment-100/70 dark:bg-charcoal-900 text-xs font-mono text-forest-800/80 dark:text-parchment-300 flex items-center justify-center gap-6">
            <span>⏱ Duration: 10–15 Minutes</span>
            <span>🌿 Skill: Visual Explorer</span>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="brass" size="lg" onClick={() => setStep(2)} className="w-full sm:w-auto px-8">
              Start Quest
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="ghost" size="md" onClick={() => navigate('/')}>
              Return Home
            </Button>
          </div>
        </Card>
      )}

      {/* SCREEN 2: EXPLORE */}
      {step === 2 && (
        <Card variant="journal" className="p-6 sm:p-10 space-y-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-forest-800 text-parchment-50 flex items-center justify-center mx-auto shadow-field">
            <Eye className="w-8 h-8 text-brass-400" />
          </div>

          <div className="space-y-3">
            <h2 className="font-serif text-3xl font-bold text-forest-950 dark:text-parchment-50">
              Put your phone away.
            </h2>
            <p className="text-base text-forest-900/80 dark:text-parchment-200 max-w-lg mx-auto leading-relaxed">
              {quest?.instructions ||
                'Slow your pace by half. Look around you with curiosity. Notice patterns, colors, or textures you usually ignore.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-moss-50 dark:bg-charcoal-900/80 border border-moss-200 dark:border-charcoal-800 text-left space-y-2 text-xs sm:text-sm text-forest-900 dark:text-parchment-200">
            <div className="font-bold font-serif text-sm text-forest-950 dark:text-parchment-50">Observation Ideas:</div>
            <ul className="list-disc list-inside space-y-1 text-forest-800/80 dark:text-parchment-300">
              <li>A patch of lichen or moss colonizing mortar</li>
              <li>A faded architectural engraving or foundation date</li>
              <li>How the geometry of tree shadows hits a wall</li>
            </ul>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <Button variant="secondary" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <Button variant="primary" size="lg" onClick={() => setStep(3)}>
              I Found Something
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Card>
      )}

      {/* SCREEN 3: CAPTURE PHOTO (OPTIONAL) */}
      {step === 3 && (
        <Card variant="journal" className="p-6 sm:p-10 space-y-6 animate-in fade-in">
          <div className="text-center space-y-2">
            <Badge variant="subtle">Optional Step</Badge>
            <h2 className="font-serif text-3xl font-bold text-forest-950 dark:text-parchment-50">
              Capture or preserve a photo
            </h2>
            <p className="text-sm text-forest-800/80 dark:text-parchment-300">
              Photos stay safe on your device in IndexedDB unless you explicitly choose to share them.
            </p>
          </div>

          {photoDataUrl ? (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-parchment-300 dark:border-charcoal-800 aspect-video max-h-[300px]">
                <img src={photoDataUrl} alt="Captured observation" className="w-full h-full object-cover" />
              </div>
              <div className="flex justify-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setPhotoDataUrl(null)}>
                  Change Photo
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-moss-300 dark:border-charcoal-700 rounded-3xl p-8 text-center space-y-4 bg-moss-50/40 dark:bg-charcoal-900/40">
              <div className="w-12 h-12 rounded-full bg-moss-100 dark:bg-charcoal-800 flex items-center justify-center mx-auto text-forest-800 dark:text-parchment-200">
                <Camera className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-forest-950 dark:text-parchment-100">
                  Select a photo or snapshot of what you noticed
                </p>
                <p className="text-xs text-forest-700/70 dark:text-parchment-400">
                  You can also continue without adding a photo
                </p>
              </div>
              <div>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-parchment-50 text-sm font-medium shadow-field">
                  <ImageIcon className="w-4 h-4" />
                  Select File
                  <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                </label>
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(4)}>
                Skip photo
              </Button>
              <Button variant="primary" onClick={() => setStep(4)}>
                Next: Reflection
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* SCREEN 4: REFLECT */}
      {step === 4 && (
        <Card variant="journal" className="p-6 sm:p-10 space-y-6 animate-in fade-in">
          <div className="space-y-2">
            <Badge variant="skill" category="visual_explorer">
              Field Journal
            </Badge>
            <h2 className="font-serif text-3xl font-bold text-forest-950 dark:text-parchment-50">
              Record your observation
            </h2>
            <p className="text-sm text-forest-800/80 dark:text-parchment-300">
              Put words to what caught your eye. These notes are saved in your personal Memory Atlas.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-serif font-bold text-forest-950 dark:text-parchment-100 mb-1.5">
                1. What specific detail did you notice? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="e.g., A cluster of pale green lichen growing in rings across the corner of an old granite curb stone..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-parchment-300 dark:border-charcoal-700 bg-white/70 dark:bg-charcoal-900 text-forest-950 dark:text-parchment-50 placeholder:text-forest-700/40 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700"
              />
            </div>

            <div>
              <label className="block text-sm font-serif font-bold text-forest-950 dark:text-parchment-100 mb-1.5">
                2. Why did it catch your attention? (Optional)
              </label>
              <textarea
                value={attentionReason}
                onChange={(e) => setAttentionReason(e.target.value)}
                placeholder="e.g., The color stood out so brightly against the grey pavement once the sun shifted..."
                rows={2}
                className="w-full px-4 py-3 rounded-2xl border border-parchment-300 dark:border-charcoal-700 bg-white/70 dark:bg-charcoal-900 text-forest-950 dark:text-parchment-50 placeholder:text-forest-700/40 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700"
              />
            </div>

            <div>
              <label className="block text-sm font-serif font-bold text-forest-950 dark:text-parchment-100 mb-1.5">
                3. What might you have missed if you hadn't slowed down? (Optional)
              </label>
              <textarea
                value={missedDetail}
                onChange={(e) => setMissedDetail(e.target.value)}
                placeholder="e.g., I walk down this exact street every single day and never once noticed the date stamped on the curb..."
                rows={2}
                className="w-full px-4 py-3 rounded-2xl border border-parchment-300 dark:border-charcoal-700 bg-white/70 dark:bg-charcoal-900 text-forest-950 dark:text-parchment-50 placeholder:text-forest-700/40 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(3)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <Button
              variant="primary"
              size="lg"
              disabled={!observation.trim()}
              onClick={handleProceedToAIReflection}
            >
              Continue to AI Reflection
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Card>
      )}

      {/* SCREEN 5: AI REFLECTION */}
      {step === 5 && (
        <Card variant="journal" className="p-6 sm:p-10 space-y-6 animate-in fade-in">
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-100 dark:bg-charcoal-800 text-xs font-mono text-forest-800 dark:text-moss-400">
              <Sparkles className="w-3.5 h-3.5 text-brass-500" />
              Naturalist Reflection • {aiSource === 'ollama' ? 'Local Ollama LLM' : 'Curated Local AI'}
            </div>
            <h2 className="font-serif text-3xl font-bold text-forest-950 dark:text-parchment-50">
              Field Notes Perspective
            </h2>
          </div>

          {isGeneratingReflection ? (
            <div className="py-12 text-center space-y-3">
              <Compass className="w-10 h-10 text-forest-700 animate-spin mx-auto" />
              <p className="font-serif italic text-forest-900 dark:text-parchment-200">
                Pondering your observation...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-parchment-100/90 dark:bg-charcoal-900/90 border border-parchment-300 dark:border-charcoal-800 relative">
                <span className="font-serif text-4xl text-forest-800/20 absolute top-2 left-4">“</span>
                <p className="font-serif italic text-base sm:text-lg text-forest-950 dark:text-parchment-100 leading-relaxed pl-4">
                  {aiReflection}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-moss-50/70 dark:bg-charcoal-950 border border-moss-200/50 dark:border-charcoal-800 text-xs text-forest-900 dark:text-parchment-300 space-y-1">
                <span className="font-bold">Your Observation:</span>
                <p className="text-forest-800/80 dark:text-parchment-400">"{observation}"</p>
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(4)} disabled={isGeneratingReflection}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Edit Notes
            </Button>
            <Button
              variant="brass"
              size="lg"
              onClick={() => setStep(6)}
              disabled={isGeneratingReflection}
            >
              Preserve Discovery
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Card>
      )}

      {/* SCREEN 6: PRESERVE DISCOVERY */}
      {step === 6 && (
        <Card variant="journal" className="p-6 sm:p-10 space-y-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-forest-800 text-parchment-50 flex items-center justify-center mx-auto shadow-field">
            <BookOpen className="w-8 h-8 text-brass-400" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-3xl font-bold text-forest-950 dark:text-parchment-50">
              Seal into your Memory Atlas
            </h2>
            <p className="text-sm text-forest-800/80 dark:text-parchment-300 max-w-md mx-auto">
              This entry will be logged into your private journal. XP will be calculated and awarded to your{' '}
              <span className="font-semibold text-forest-900 dark:text-parchment-100">Visual Explorer</span> skill.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-parchment-100 dark:bg-charcoal-900 text-left space-y-2 text-xs font-mono text-forest-800 dark:text-parchment-300 max-w-md mx-auto border border-parchment-200 dark:border-charcoal-800">
            <div>
              <span className="text-forest-600 dark:text-moss-400">Title:</span> One Thing You Almost Missed
            </div>
            <div>
              <span className="text-forest-600 dark:text-moss-400">Category:</span> Visual Explorer
            </div>
            <div>
              <span className="text-forest-600 dark:text-moss-400">Privacy:</span> Private by default
            </div>
            <div>
              <span className="text-forest-600 dark:text-moss-400">Reward:</span> +10 Visual Explorer XP
            </div>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <Button variant="ghost" onClick={() => setStep(5)} disabled={isSubmitting}>
              Back
            </Button>
            <Button
              variant="brass"
              size="lg"
              isLoading={isSubmitting}
              onClick={handleCompleteAndPreserve}
              className="px-8 shadow-field"
            >
              Confirm & Save Discovery
            </Button>
          </div>
        </Card>
      )}

      {/* SCREEN 7: CELEBRATE */}
      {step === 7 && (
        <Card variant="brass" className="p-8 sm:p-12 space-y-8 text-center animate-in zoom-in-95">
          <div className="w-20 h-20 rounded-full bg-forest-900 text-brass-400 flex items-center justify-center mx-auto shadow-elevated border-2 border-brass-400">
            <Award className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-3">
            <Badge variant="brass" className="mx-auto">
              Expedition Complete
            </Badge>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-forest-950 dark:text-parchment-50 leading-tight">
              You noticed something new. That's an adventure, too.
            </h1>
            <p className="text-sm sm:text-base text-forest-900/80 dark:text-parchment-200 max-w-md mx-auto leading-relaxed">
              By slowing down, you took a step beyond the routine path. Your observation is now permanently preserved in your Memory Atlas.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
            <div className="p-4 rounded-2xl bg-parchment-50/80 dark:bg-charcoal-900 border border-parchment-200 dark:border-charcoal-800">
              <span className="text-xs font-mono uppercase text-forest-700 dark:text-moss-400">XP Awarded</span>
              <p className="text-2xl font-serif font-bold text-forest-900 dark:text-brass-400 mt-1">
                +{completionResult?.xp_awarded ?? 10} XP
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-parchment-50/80 dark:bg-charcoal-900 border border-parchment-200 dark:border-charcoal-800">
              <span className="text-xs font-mono uppercase text-forest-700 dark:text-moss-400">Skill Level</span>
              <p className="text-2xl font-serif font-bold text-forest-900 dark:text-parchment-50 mt-1">
                Lvl {completionResult?.new_skill_level ?? guestXPResult?.level ?? 1}
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/memories')}
              className="gap-2 w-full sm:w-auto"
            >
              <BookOpen className="w-4 h-4" />
              View Memory Atlas
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/skills')}
              className="gap-2 w-full sm:w-auto"
            >
              <Award className="w-4 h-4" />
              View Skill Tree
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
