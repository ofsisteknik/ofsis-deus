import { NextResponse } from 'next/server';

let cachedSismikData: any = null;
let lastSismikFetchTime = 0;

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
          rawEvents.push(...mappedFallback);
          sourcesFetched.push('Orhan Aydogdu (Fallback API)');
        }
      }
    } catch (fallbackErr) {
      console.error('Fallback API also failed server-side:', fallbackErr);
    }
  }

  return NextResponse.json({
    rawEvents,
    sismikFresh,
    sourcesFetched,
  });
}
