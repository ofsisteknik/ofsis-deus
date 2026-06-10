import { NextResponse } from 'next/server';

let cachedSismikData: any = null;
let lastSismikFetchTime = 0;

// Cache for the last known "good" full dataset from primary sources
let lastGoodPrimaryEvents: any[] = [];
let lastGoodPrimaryTime = 0;

// Helper: Haversine distance between two coordinates (km)
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Check if a fallback event is consistent with the last known primary event
// (same region within 200km and within 30 minutes)
function isFallbackConsistentWithPrimary(fallbackLatest: any, primaryLatest: any): boolean {
  if (!fallbackLatest || !primaryLatest) return false;

  const dist = haversineKm(
    fallbackLatest.latitude, fallbackLatest.longitude,
    primaryLatest.latitude, primaryLatest.longitude
  );
  const timeDiffMs = Math.abs(
    new Date(fallbackLatest.timestamp).getTime() - new Date(primaryLatest.timestamp).getTime()
  );

  // Allow up to 200km distance and 30 minutes time difference for the most recent event
  return dist <= 200 && timeDiffMs <= 30 * 60 * 1000;
}

export async function GET(request: Request) {
  const now = Date.now();
  const nowStr = new Date(now).toISOString().split('.')[0].replace('T', ' ');
  const oneDayAgoStr = new Date(now - 24 * 60 * 60 * 1000).toISOString().split('.')[0].replace('T', ' ');

  let rawEvents: any[] = [];
  let sismikFresh = false;
  let primarySuccess = false;
  let sourcesFetched: string[] = [];

  // 1. Fetch from Sismik Harita (with 15 min throttle to respect 100 requests/day limit)
  try {
    // 15 minutes = 900,000 ms
    if (now - lastSismikFetchTime >= 900000 || !cachedSismikData) {
      const sismikRes = await fetch('https://sismikharita.com/api.php?limit=60', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(4000)
      });
      if (sismikRes.ok) {
        const json = await sismikRes.json();
        if (json.status === 'success' && Array.isArray(json.earthquakes)) {
          const mappedSismik = json.earthquakes.map((eq: any) => ({
            id: eq.event_id || `sismik-${eq.id}-${Math.random()}`,
            latitude: parseFloat(eq.latitude) || 39.0,
            longitude: parseFloat(eq.longitude) || 35.0,
            magnitude: parseFloat(eq.magnitude) || 0,
            magnitudeScale: 'ML',
            depth: parseFloat(eq.depth_km) || 0,
            location: eq.location || 'Bilinmeyen Konum',
            timestamp: new Date(eq.occurred_at.replace(' ', 'T') + 'Z').toISOString(),
            provider: (eq.source || 'SismikHarita').toUpperCase(),
          }));
          
          cachedSismikData = mappedSismik;
          lastSismikFetchTime = now;
          rawEvents.push(...mappedSismik);
          sismikFresh = true;
          primarySuccess = true;
          sourcesFetched.push('SismikHarita (API)');
        }
      }
    } else if (cachedSismikData) {
      rawEvents.push(...cachedSismikData);
      primarySuccess = true;
      sourcesFetched.push('SismikHarita (Cache)');
    }
  } catch (e) {
    console.error('Error fetching Sismik Harita server-side:', e);
    if (cachedSismikData) {
      rawEvents.push(...cachedSismikData);
      sourcesFetched.push('SismikHarita (Cache Fallback)');
    }
  }

  // 2. Fetch from Official AFAD API directly (Primary AFAD source)
  try {
    const afadUrl = `https://deprem.afad.gov.tr/apiv2/event/filter?start=${encodeURIComponent(oneDayAgoStr)}&end=${encodeURIComponent(nowStr)}&limit=80&orderby=timedesc`;
    const afadRes = await fetch(afadUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(4000)
    });

    if (afadRes.ok) {
      const json = await afadRes.json();
      if (Array.isArray(json)) {
        const mappedAfad = json.map((eq: any) => ({
          id: eq.eventID || `afad-${eq.date}-${Math.random()}`,
          latitude: parseFloat(eq.latitude) || 39.0,
          longitude: parseFloat(eq.longitude) || 35.0,
          magnitude: parseFloat(eq.magnitude) || 0,
          magnitudeScale: eq.type || 'ML',
          depth: parseFloat(eq.depth) || 0,
          location: eq.location || `${eq.district || ''} (${eq.province || ''})`.trim() || 'Bilinmeyen Konum',
          timestamp: new Date(eq.date.replace(' ', 'T') + 'Z').toISOString(),
          provider: 'AFAD',
        }));
        rawEvents.push(...mappedAfad);
        primarySuccess = true;
        sourcesFetched.push('AFAD (API)');
      }
    }
  } catch (e) {
    console.error('Error fetching direct AFAD event-service server-side:', e);
  }

  // Update the last-good primary cache whenever primary sources succeed
  if (primarySuccess && rawEvents.length > 0) {
    lastGoodPrimaryEvents = [...rawEvents];
    lastGoodPrimaryTime = now;
  }

  // 3. Fallback to api.orhanaydogdu.com.tr ONLY if both primary sources failed to fetch any data
  if (!primarySuccess || rawEvents.length === 0) {
    try {
      console.warn('Primary earthquake servers failed server-side. Triggering Orhan Aydogdu fallback...');
      const fallbackRes = await fetch('https://api.orhanaydogdu.com.tr/deprem/afad/live?limit=60', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(4000)
      });
      if (fallbackRes.ok) {
        const json = await fallbackRes.json();
        if (json.status && Array.isArray(json.result)) {
          const mappedFallback = json.result.map((eq: any) => ({
            id: eq.earthquake_id || `fallback-${eq.created_at}-${Math.random()}`,
            latitude: eq.geojson?.coordinates?.[1] || 39.0,
            longitude: eq.geojson?.coordinates?.[0] || 35.0,
            magnitude: eq.mag || 0,
            magnitudeScale: 'ML',
            depth: eq.depth || 0,
            location: eq.title || 'Bilinmeyen Konum',
            timestamp: new Date(eq.created_at * 1000).toISOString(),
            provider: 'AFAD (FALLBACK)',
          }));

          // --- SMART FALLBACK: Consistency check with last known primary data ---
          // If we have a recent good primary dataset (within last 2 hours), use it as base
          // and only merge in genuinely new events from the fallback source.
          const hasFreshPrimaryCache =
            lastGoodPrimaryEvents.length > 0 &&
            now - lastGoodPrimaryTime < 2 * 60 * 60 * 1000; // within 2 hours

          if (hasFreshPrimaryCache && mappedFallback.length > 0) {
            // Sort fallback events newest first
            const sortedFallback = [...mappedFallback].sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            const sortedPrimary = [...lastGoodPrimaryEvents].sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            const fallbackLatest = sortedFallback[0];
            const primaryLatest = sortedPrimary[0];

            const consistent = isFallbackConsistentWithPrimary(fallbackLatest, primaryLatest);

            if (consistent) {
              // Fallback data is consistent with primary — keep the large primary cache
              // and only append genuinely newer events from fallback (not already in primary)
              const primaryNewestTime = new Date(primaryLatest.timestamp).getTime();
              const newFromFallback = sortedFallback.filter(
                (fb) => new Date(fb.timestamp).getTime() > primaryNewestTime
              );

              rawEvents = [...lastGoodPrimaryEvents, ...newFromFallback];
              sourcesFetched.push(
                newFromFallback.length > 0
                  ? `Orhan Aydogdu (Fallback + ${newFromFallback.length} yeni kayıt)`
                  : 'Orhan Aydogdu (Tutarlı — Birincil Önbellek Korundu)'
              );
              console.warn(
                `[OFSİS] Yedek API tutarlı bulundu. Birincil önbellekteki ${lastGoodPrimaryEvents.length} kayıt korundu, ${newFromFallback.length} yeni kayıt eklendi.`
              );
            } else {
              // Fallback data inconsistent or primary cache is stale — use fallback as-is
              rawEvents.push(...mappedFallback);
              sourcesFetched.push('Orhan Aydogdu (Fallback API — Tutarsız/Eski Önbellek)');
              console.warn('[OFSİS] Yedek API verisi birincil önbellekle tutarsız veya önbellek çok eski. Yedek veri kullanılıyor.');
            }
          } else {
            // No recent primary cache available — use fallback data directly
            rawEvents.push(...mappedFallback);
            sourcesFetched.push('Orhan Aydogdu (Fallback API)');
          }
        }
      }
    } catch (fallbackErr) {
      console.error('Fallback API also failed server-side:', fallbackErr);

      // Last resort: if fallback also fails but we have a primary cache, use it
      if (lastGoodPrimaryEvents.length > 0) {
        rawEvents = [...lastGoodPrimaryEvents];
        sourcesFetched.push('Birincil Önbellek (Tüm API\'ler Başarısız)');
        console.warn('[OFSİS] Tüm API\'ler başarısız. Son iyi birincil veri önbelleği kullanılıyor.');
      }
    }
  }

  return NextResponse.json({
    rawEvents,
    sismikFresh,
    sourcesFetched,
  });
}
