import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { 
  Compass, 
  MapPin, 
  Sparkles, 
  Camera, 
  TreePine, 
  Volume2, 
  Building2, 
  History, 
  Eye, 
  Clock, 
  ChevronRight,
  ShieldCheck,
  Check
} from 'lucide-react';

interface InterestOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  desc: string;
}

const INTERESTS: InterestOption[] = [
  { id: 'photography', label: 'Photography', icon: <Camera className="w-4 h-4" />, desc: 'Framing light, texture, and fleeting compositions' },
  { id: 'nature', label: 'Nature & Flora', icon: <TreePine className="w-4 h-4" />, desc: 'Micro-botany, lichens, birds, and weather signs' },
  { id: 'sounds', label: 'Sound & Acoustics', icon: <Volume2 className="w-4 h-4" />, desc: 'Echoes, wind in wires, bird song, ambient quiet' },
  { id: 'architecture', label: 'Architecture', icon: <Building2 className="w-4 h-4" />, desc: 'Brickwork patterns, keystones, and facades' },
  { id: 'history', label: 'Local History', icon: <History className="w-4 h-4" />, desc: 'Ghost signs, foundry stamps, forgotten paths' },
  { id: 'mindful', label: 'Mindful Noticing', icon: <Eye className="w-4 h-4" />, desc: 'Slowing down to see what you normally walk past' },
];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { updateGuestProfile } = useAuth();

  const [step, setStep] = useState<number>(1);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['mindful', 'nature']);
  const [preferredDuration, setPreferredDuration] = useState<number>(15);
  const [preferredDifficulty, setPreferredDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [locationPermGranted, setLocationPermGranted] = useState<boolean | null>(null);

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setLocationPermGranted(true),
        () => setLocationPermGranted(false)
      );
    } else {
      setLocationPermGranted(false);
    }
  };

  const handleFinishOnboarding = (asGuest: boolean = true) => {
    updateGuestProfile({
      displayName: displayName.trim() || 'Wayfarer',
      interests: selectedInterests,
      preferredDuration,
      preferredDifficulty
    });

    if (asGuest) {
      navigate('/');
    } else {
      navigate('/auth?mode=register');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-parchment-100/50 dark:bg-charcoal-950">
      <Card className="max-w-xl w-full p-6 sm:p-8 border border-parchment-200 dark:border-charcoal-800 shadow-lg relative overflow-hidden">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-parchment-200 dark:border-charcoal-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-forest-900 text-parchment-100 flex items-center justify-center">
              <Compass className="w-4 h-4 text-moss-300" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-forest-700 dark:text-moss-400 font-bold block">
                Expedition Setup
              </span>
              <span className="text-xs text-charcoal-500">
                Step {step} of 3
              </span>
            </div>
          </div>

          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-6 bg-forest-700 dark:bg-moss-400'
                    : s < step
                    ? 'w-3 bg-forest-900 dark:bg-moss-700'
                    : 'w-3 bg-parchment-300 dark:bg-charcoal-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: IDENTITY & INTERESTS */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div>
              <h2 className="font-serif font-bold text-2xl text-charcoal-900 dark:text-parchment-50">
                Welcome to TerraQuest
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-600 dark:text-parchment-300 mt-1">
                Explore the world. Notice the little things. Build your own personal atlas of real-world discovery.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1.5">
                Explorer Codename or Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Rowan, FernSeeker, MossWalker..."
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100 focus:ring-2 focus:ring-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-2">
                What catches your attention outdoors?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {INTERESTS.map((item) => {
                  const isChecked = selectedInterests.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleInterest(item.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                        isChecked
                          ? 'bg-forest-50/70 dark:bg-forest-950/40 border-forest-600 dark:border-moss-500 ring-1 ring-forest-500/30'
                          : 'bg-white dark:bg-charcoal-800/80 border-parchment-200 dark:border-charcoal-700 hover:border-parchment-300'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg mt-0.5 ${isChecked ? 'bg-forest-700 text-parchment-100' : 'bg-parchment-200 dark:bg-charcoal-700 text-charcoal-600'}`}>
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-serif font-bold text-charcoal-900 dark:text-parchment-100 block">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-charcoal-500 dark:text-parchment-400 line-clamp-2">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                onClick={() => setStep(2)}
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: EXPEDITION PACE & DIFFICULTY */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="font-serif font-bold text-2xl text-charcoal-900 dark:text-parchment-50">
                Pace of Discovery
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-600 dark:text-parchment-300 mt-1">
                Customize how long you typically want each mindful expedition to last.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-2">
                Preferred Quest Duration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 30].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setPreferredDuration(mins)}
                    className={`py-3 px-2 rounded-xl border text-center transition-all ${
                      preferredDuration === mins
                        ? 'bg-forest-900 text-parchment-100 border-forest-900 font-bold shadow-sm'
                        : 'bg-white dark:bg-charcoal-800 border-parchment-300 dark:border-charcoal-700 text-charcoal-800 dark:text-parchment-200 hover:bg-parchment-100'
                    }`}
                  >
                    <span className="text-base font-serif block">{mins}</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-75">mins</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-2">
                Exploration Intensity
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'easy', label: 'Gentle Stroll', desc: 'Notice obvious nearby details' },
                  { id: 'medium', label: 'Keen Eye', desc: 'Balanced observation tasks' },
                  { id: 'hard', label: 'Deep Tracker', desc: 'Rare textures & intricate clues' },
                ].map((diff) => (
                  <button
                    key={diff.id}
                    type="button"
                    onClick={() => setPreferredDifficulty(diff.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      preferredDifficulty === diff.id
                        ? 'bg-forest-50 dark:bg-forest-950/60 border-forest-600 dark:border-moss-500 ring-1 ring-forest-500/30'
                        : 'bg-white dark:bg-charcoal-800 border-parchment-200 dark:border-charcoal-700 text-charcoal-800'
                    }`}
                  >
                    <span className="text-xs font-serif font-bold text-charcoal-900 dark:text-parchment-100 block mb-1">
                      {diff.label}
                    </span>
                    <span className="text-[10px] text-charcoal-500 dark:text-parchment-400 block leading-tight">
                      {diff.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep(3)}>
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: LOCATION & ACCOUNT SELECTION */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="font-serif font-bold text-2xl text-charcoal-900 dark:text-parchment-50">
                Cartography & Privacy
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-600 dark:text-parchment-300 mt-1">
                TerraQuest puts privacy first. Coordinates and photos remain local on your device until you choose otherwise.
              </p>
            </div>

            <div className="bg-parchment-100 dark:bg-charcoal-800/80 p-4 rounded-2xl border border-parchment-200 dark:border-charcoal-700 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-forest-700 dark:text-moss-400" />
                <span className="text-xs font-serif font-bold text-charcoal-900 dark:text-parchment-100">
                  Real-World Geolocation
                </span>
              </div>
              <p className="text-xs text-charcoal-600 dark:text-parchment-300">
                Enable GPS to automatically uncover fog of war on your local map. You can also explore completely without GPS using manual check-ins.
              </p>

              {locationPermGranted === null ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestLocation}
                  fullWidth
                >
                  Enable Location Access (Optional)
                </Button>
              ) : locationPermGranted ? (
                <div className="flex items-center gap-2 text-xs text-forest-700 dark:text-moss-400 font-semibold">
                  <Check className="w-4 h-4" /> Location permission granted!
                </div>
              ) : (
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  Location declined or unavailable. Manual check-ins will be used.
                </div>
              )}
            </div>

            {/* Choose account mode */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-charcoal-700 dark:text-parchment-300 block">
                How would you like to explore?
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => handleFinishOnboarding(true)}
                  className="p-4 rounded-2xl border border-parchment-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800/60 hover:border-forest-600 cursor-pointer transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-charcoal-900 dark:text-parchment-100">
                      Guest Wayfarer
                    </span>
                    <Badge variant="outline" size="sm">Local-Only</Badge>
                  </div>
                  <p className="text-[11px] text-charcoal-500 leading-snug">
                    Explore immediately without an account. All data safely saved in IndexedDB on this device.
                  </p>
                </div>

                <div
                  onClick={() => handleFinishOnboarding(false)}
                  className="p-4 rounded-2xl border border-forest-600 dark:border-moss-500 bg-forest-50/50 dark:bg-forest-950/40 hover:bg-forest-50 cursor-pointer transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-forest-900 dark:text-parchment-100">
                      Cloud Account
                    </span>
                    <Badge variant="moss" size="sm">Multi-Device</Badge>
                  </div>
                  <p className="text-[11px] text-charcoal-600 dark:text-parchment-300 leading-snug">
                    Register with username/password to synchronize across devices, access server-backed XP, and share maps.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => handleFinishOnboarding(true)}>
                Begin Exploration as Guest
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
