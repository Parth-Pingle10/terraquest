import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { sharingApi } from '../services/sharing-api';
import { SharedMapResponse, Discovery } from '../types';
import { LeafletMap } from '../components/map/LeafletMap';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { 
  Compass, 
  Share2, 
  Eye, 
  MapPin, 
  Calendar, 
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export const SharedMapViewPage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();

  const [sharedData, setSharedData] = useState<SharedMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Discovery Modal
  const [selectedDiscovery, setSelectedDiscovery] = useState<Discovery | null>(null);

  useEffect(() => {
    const fetchSharedMap = async () => {
      if (!shareToken) {
        setError('No share token provided in the URL.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await sharingApi.getSharedMap(shareToken);
        setSharedData(data);
      } catch (err: any) {
        console.error('Failed to load shared map:', err);
        setError(
          err.message || 'This shared exploration map link is either invalid, revoked, or expired.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSharedMap();
  }, [shareToken]);

  // Convert SharedDiscoveryView to Discovery shape for LeafletMap markers
  const mappedDiscoveries: Discovery[] = (sharedData?.discoveries || []).map((sd: any) => ({
    id: sd.id,
    user_id: 'shared',
    title: sd.title || 'Shared Observation',
    category: sd.category || sd.skill_category || 'visual_explorer',
    skill_category: sd.skill_category || sd.category || 'visual_explorer',
    latitude: sd.latitude ?? sd.approximate_latitude,
    longitude: sd.longitude ?? sd.approximate_longitude,
    observation: sd.observation || '',
    photo_url: sd.photo_url || null,
    created_at: sd.created_at || new Date().toISOString(),
    visibility: 'public'
  }));

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col bg-parchment-50 dark:bg-charcoal-950">
      {/* Top Banner */}
      <div className="bg-white/95 dark:bg-charcoal-900/95 backdrop-blur-md border-b border-parchment-200 dark:border-charcoal-800 px-4 py-3 sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-moss-900 text-parchment-100 flex items-center justify-center">
            <Compass className="w-5 h-5 text-moss-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-bold text-base sm:text-lg text-charcoal-900 dark:text-parchment-50">
                {sharedData ? sharedData.title : 'Shared Exploration Atlas'}
              </h1>
              <Badge variant="moss" size="sm">
                Shared Field View
              </Badge>
            </div>
            {sharedData && (
              <p className="text-xs text-charcoal-500 dark:text-parchment-400">
                Discovered by {sharedData.owner_display_name || 'an Explorer'} • {sharedData.cells?.length || 0} cells uncovered
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-50 dark:bg-forest-950 text-forest-800 dark:text-moss-300 text-xs border border-forest-200/50">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Read-Only Guest View</span>
          </div>
          <Link to="/">
            <Button variant="primary" size="sm">
              Start Your Own Atlas
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Map or Error Area */}
      <div className="flex-1 relative w-full h-[calc(100vh-8.5rem)] min-h-[420px]">
        {loading ? (
          <div className="h-full flex items-center justify-center bg-parchment-100 dark:bg-charcoal-900">
            <LoadingState message="Decrypting shared field cartography and terrain..." />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-charcoal-900 rounded-2xl border border-red-200 dark:border-red-900/60 p-6 shadow-md text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="font-serif font-bold text-lg text-charcoal-900 dark:text-parchment-50">
                Shared Map Unavailable
              </h2>
              <p className="text-xs text-charcoal-600 dark:text-parchment-300">
                {error}
              </p>
              <Link to="/" className="inline-block pt-2">
                <Button variant="primary" size="sm">
                  Go to TerraQuest Home
                </Button>
              </Link>
            </div>
          </div>
        ) : sharedData ? (
          <>
            <LeafletMap
              center={
                sharedData.center_latitude != null && sharedData.center_longitude != null
                  ? [sharedData.center_latitude, sharedData.center_longitude]
                  : [37.7749, -122.4194]
              }
              zoom={sharedData.zoom_level || 13}
              cells={sharedData.cells || []}
              discoveries={mappedDiscoveries}
              onMarkerClick={(d) => setSelectedDiscovery(d)}
              className="w-full h-full"
            />

            {/* Sharing Info Overlay */}
            <div className="absolute bottom-4 left-4 z-20">
              <div className="bg-white/95 dark:bg-charcoal-900/95 backdrop-blur-md border border-parchment-200 dark:border-charcoal-800 rounded-xl p-3 shadow-md text-xs space-y-1.5 max-w-[240px]">
                <span className="font-serif font-bold text-charcoal-800 dark:text-parchment-200 block border-b border-parchment-200 dark:border-charcoal-800 pb-1">
                  Atlas Summary
                </span>
                <p className="text-[11px] text-charcoal-600 dark:text-parchment-300">
                  Region: {sharedData.region_name || 'Exploration Sector'}
                </p>
                <p className="text-[11px] text-charcoal-600 dark:text-parchment-300">
                  Visible Discoveries: {sharedData.discoveries?.length || 0}
                </p>
                {sharedData.notes && (
                  <p className="text-[11px] text-charcoal-500 italic pt-1 border-t border-parchment-200 dark:border-charcoal-800">
                    "{sharedData.notes}"
                  </p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Discovery Details Modal */}
      <Modal
        isOpen={selectedDiscovery !== null}
        onClose={() => setSelectedDiscovery(null)}
        title={selectedDiscovery?.title || 'Shared Observation'}
      >
        {selectedDiscovery && (
          <div className="space-y-4">
            {selectedDiscovery.photo_url && (
              <div className="rounded-xl overflow-hidden max-h-56 bg-charcoal-950 flex items-center justify-center">
                <img
                  src={selectedDiscovery.photo_url}
                  alt={selectedDiscovery.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Badge variant="moss" size="sm">
                {(selectedDiscovery.category || selectedDiscovery.skill_category || 'visual_explorer').replace('_', ' ')}
              </Badge>
              <span className="text-xs text-charcoal-400">
                {new Date(selectedDiscovery.created_at).toLocaleDateString()}
              </span>
            </div>

            <div className="bg-parchment-100 dark:bg-charcoal-800 p-3 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500 dark:text-parchment-400 block mb-1">
                Field Observation
              </span>
              <p className="text-xs text-charcoal-800 dark:text-parchment-200 italic leading-relaxed">
                "{selectedDiscovery.observation}"
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDiscovery(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
