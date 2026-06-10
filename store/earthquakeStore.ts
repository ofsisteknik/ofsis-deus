import { create } from 'zustand';
import { Earthquake, EarthquakeStats } from '../types';

interface EarthquakeState {
  earthquakes: Earthquake[];
  selectedEarthquakeId: string | null;
  isLoading: boolean;
  error: string | null;
  stats: EarthquakeStats;
  isLocalServerMode: boolean;

  fetchEarthquakes: (showLoading?: boolean) => Promise<void>;
  selectEarthquake: (id: string | null) => void;
  setLocalServerMode: (mode: boolean) => void;
}

// Haversine formula to compute distance between coordinates in km
function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Deduplicate and clean up earthquake records, favoring AFAD
function deduplicateEarthquakes(list: Earthquake[]): Earthquake[] {
  const result: Earthquake[] = [];
  for (let i = 0; i < list.length; i++) {
    const eq = list[i];
    const eqTime = new Date(eq.timestamp).getTime();
    
    const dupIndex = result.findIndex(existing => {
      const existingTime = new Date(existing.timestamp).getTime();
      const timeDiffSec = Math.abs(existingTime - eqTime) / 1000;
      if (timeDiffSec > 180) return false; // within 3 mins

      const dist = calcDistance(existing.latitude, existing.longitude, eq.latitude, eq.longitude);
      if (dist > 80) return false; // within 80km

      const magDiff = Math.abs(existing.magnitude - eq.magnitude);
      if (magDiff > 0.8) return false; // within 0.8 magnitude

      return true;
    });

    if (dupIndex !== -1) {
      const existing = result[dupIndex];
      // Prefer AFAD over other providers
      if (eq.provider === 'AFAD' && existing.provider !== 'AFAD') {
        result[dupIndex] = eq;
      }
      // If same provider, keep the one with actual magnitude
      continue;
    } else {
      result.push(eq);
    }
  }
  return result;
}

// Map magnitude to level
function getMagnitudeLevel(mag: number): Earthquake['level'] {
  if (mag >= 5.0) return 'severe';
  if (mag >= 4.0) return 'high';
  if (mag >= 3.0) return 'moderate';
  return 'low';
}

// Generate descriptive text
function getDescription(loc: string, depth: number, mag: number, provider: string): string {
  return `${loc} bölgesinde, ${depth} km derinlikte ${mag} büyüklüğünde sismik aktivite (${provider} tarafından raporlanmıştır).`;
}

// Cache for keeping track of the latest data state to prevent redundant console logs
let lastFetchedDigest = '';

export const useEarthquakeStore = create<EarthquakeState>((set, get) => ({
  earthquakes: [],
  selectedEarthquakeId: null,
  isLoading: false,
  error: null,
  isLocalServerMode: false,
  stats: {
    totalCountToday: 0,
    maxMagnitudeToday: 0,
    lastEventLocation: 'Bilinmiyor',
    lastEventTime: 'Bilinmiyor',
  },

  selectEarthquake: (id) => set({ selectedEarthquakeId: id }),
  setLocalServerMode: (mode) => set({ isLocalServerMode: mode }),

  fetchEarthquakes: async (showLoading = false) => {
    if (showLoading) set({ isLoading: true, error: null });

    let rawEvents: Earthquake[] = [];
    let sismikFresh = false;

    try {
      // Fetch from local Next.js proxy route to bypass browser CORS constraints
      const res = await fetch('/api/earthquakes', { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error('API route failed to fetch');

      const data = await res.json();
      if (Array.isArray(data.rawEvents)) {
        // Map severity levels and description helpers on the client
        rawEvents = data.rawEvents.map((eq: any) => ({
          ...eq,
          level: getMagnitudeLevel(eq.magnitude || 0),
          description: getDescription(eq.location || 'Bilinmeyen Konum', eq.depth || 0, eq.magnitude || 0, eq.provider || 'AFAD'),
        }));
        sismikFresh = data.sismikFresh;
        const digest = `${data.sourcesFetched?.join(',') || ''}-${rawEvents[0]?.id || ''}-${rawEvents.length}`;
        if (digest !== lastFetchedDigest) {
          lastFetchedDigest = digest;
          if (data.sourcesFetched && Array.isArray(data.sourcesFetched)) {
            console.log(`[OFSİS] Sismik veriler güncellendi. Kaynaklar: ${data.sourcesFetched.join(', ')} | Kayıt sayısı: ${rawEvents.length}`);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching via Next API Proxy:', e);
      set({ 
        isLoading: false, 
        error: 'Sismik veriler çekilemedi. Sunucu bağlantısını kontrol edin.' 
      });
      return;
    }

    if (rawEvents.length === 0) {
      set({ 
        isLoading: false, 
        error: 'Sismik veriler yüklenemedi. İnternet bağlantınızı kontrol edin.' 
      });
      return;
    }

    // Deduplicate the combined records
    const deduped = deduplicateEarthquakes(rawEvents);
    const sorted = deduped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Filter for Turkey boundaries (Lat: 34-44, Lon: 25-46) and within last 24 hours
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const turkeyEvents = sorted.filter(eq => 
      eq.latitude >= 34.0 && eq.latitude <= 44.0 && 
      eq.longitude >= 25.0 && eq.longitude <= 46.0 &&
      new Date(eq.timestamp).getTime() >= oneDayAgo
    ).slice(0, 100);

    // Calculate statistics
    const maxMag = turkeyEvents.length > 0 ? Math.max(...turkeyEvents.map(e => e.magnitude)) : 0;
    const lastEvent = turkeyEvents[0];

    set({
      earthquakes: turkeyEvents,
      isLocalServerMode: sismikFresh,
      isLoading: false,
      stats: {
        totalCountToday: turkeyEvents.length,
        maxMagnitudeToday: parseFloat(maxMag.toFixed(1)),
        lastEventLocation: lastEvent?.location || 'Bilinmiyor',
        lastEventTime: lastEvent?.timestamp ? new Date(lastEvent.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Bilinmiyor',
      }
    });
  }
}));
