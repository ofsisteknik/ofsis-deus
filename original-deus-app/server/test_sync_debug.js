const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'db.json');

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function debugSync() {
  // Let's load the database
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  console.log('--- START SYNC DEBUG ---');
  console.log('Initial activities count:', db.activities.length);
  console.log('Initial Top 3 activities:');
  db.activities.slice(0, 3).forEach((a, i) => console.log(`  ${i+1}. ${a.location} | ${a.timestamp} | ${a.deviceName}`));

  // Fetch AFAD
  const startStr = "2026-06-04 07:00:00";
  const endStr = "2026-06-05 07:00:00";
  const afadUrl = `https://deprem.afad.gov.tr/apiv2/event/filter?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}&limit=100&orderby=timedesc`;
  
  console.log('Fetching AFAD...');
  const afadRes = await fetch(afadUrl);
  const afadData = await afadRes.json();
  console.log(`Retrieved ${afadData.length} records from AFAD.`);

  let modified = false;
  const realEqs = afadData.slice().reverse();

  for (const eq of realEqs) {
    const mag = parseFloat(eq.magnitude);
    if (isNaN(mag)) continue;
    const lat = parseFloat(eq.latitude);
    const lon = parseFloat(eq.longitude);
    if (isNaN(lat) || isNaN(lon)) continue;

    const eqTime = new Date(eq.date + 'Z').getTime();
    const eqLocation = eq.location;
    const eqProvider = 'AFAD';
    const eqId = eq.eventID;

    let duplicateIndex = db.activities.findIndex(act => {
      if (act.type !== 'seismic') return false;
      const actTime = new Date(act.timestamp).getTime();
      const timeDiffSec = Math.abs(actTime - eqTime) / 1000;
      if (timeDiffSec > 180) return false;
      if (act.latitude && act.longitude) {
        const dist = calculateDistance(lat, lon, act.latitude, act.longitude);
        if (dist > 80) return false;
      }
      const magDiff = Math.abs((act.actualMagnitude || 0) - mag);
      if (magDiff > 0.8) return false;
      return true;
    });

    if (duplicateIndex !== -1) {
      const existingAct = db.activities[duplicateIndex];
      const existingProvider = (existingAct.magnitudeScale || 'AFAD').toUpperCase();

      if (eqProvider === 'AFAD' && existingProvider !== 'AFAD') {
        db.activities.splice(duplicateIndex, 1);
        console.log(`[Deduplicate AFAD] Removed: ${existingAct.location} (${existingAct.timestamp}) at index ${duplicateIndex}`);
      } else {
        continue;
      }
    } else {
      const exists = db.activities.some(act => act.id === eqId);
      if (exists) continue;
    }

    const level = mag >= 5.0 ? 'severe' : mag >= 4.0 ? 'high' : mag >= 3.0 ? 'moderate' : 'low';
    const newActivity = {
      id: eqId,
      deviceId: '',
      deviceName: eqProvider,
      type: 'seismic',
      estimatedMagnitude: parseFloat((mag - 0.2).toFixed(1)) || 0,
      actualMagnitude: mag,
      magnitudeScale: eq.type || 'ML',
      location: eqLocation,
      depth: parseFloat(eq.depth) || 0,
      timestamp: new Date(eqTime).toISOString(),
      actions: [],
      level,
      description: `${eqLocation} bölgesinde ${eq.depth} km derinlikte ${mag} büyüklüğünde gerçek sismik aktivite kaydedildi (${eqProvider}).`,
      latitude: lat,
      longitude: lon
    };

    db.activities.unshift(newActivity);
    modified = true;
  }

  console.log('After AFAD loop activities count:', db.activities.length);
  console.log('Top 3 activities after AFAD loop:');
  db.activities.slice(0, 3).forEach((a, i) => console.log(`  ${i+1}. ${a.location} | ${a.timestamp} | ${a.deviceName}`));

  // Fetch Sismik Harita
  console.log('Fetching Sismik Harita...');
  const sismikRes = await fetch('https://sismikharita.com/api.php?limit=100', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const sismikJson = await sismikRes.json();
  const sismikData = [];
  console.log(`Retrieved ${sismikData.length} records from Sismik Harita (Forced empty).`);

  const sismikEqs = sismikData.slice().reverse();
  for (const eq of sismikEqs) {
    const mag = parseFloat(eq.magnitude);
    if (isNaN(mag)) continue;
    const lat = parseFloat(eq.latitude);
    const lon = parseFloat(eq.longitude);
    if (isNaN(lat) || isNaN(lon)) continue;

    if (lat < 35.0 || lat > 43.0 || lon < 25.0 || lon > 46.0) continue;

    const eqTime = new Date(eq.occurred_at + 'Z').getTime();
    let rawSource = eq.source || (eq.sources && eq.sources[0] && eq.sources[0].name) || 'AFAD';
    let eqProvider = rawSource.toUpperCase();
    if (eqProvider.includes('SISMIK') || eqProvider.includes('HARITA')) {
      eqProvider = 'AFAD';
    }
    const depth = parseFloat(eq.depth_km) || 0;
    const eqLocation = eq.display_location || eq.geo_location || eq.location;
    let eqId = eq.event_id || eq.sismik_id || String(eq.id);
    if (eqProvider === 'KANDILLI') {
      eqId = crypto.createHash('sha1').update(eqTime + '_' + lat + '_' + lon).digest('hex');
    }

    let duplicateIndex = db.activities.findIndex(act => {
      if (act.type !== 'seismic') return false;
      const actTime = new Date(act.timestamp).getTime();
      const timeDiffSec = Math.abs(actTime - eqTime) / 1000;
      if (timeDiffSec > 180) return false;
      if (act.latitude && act.longitude) {
        const dist = calculateDistance(lat, lon, act.latitude, act.longitude);
        if (dist > 80) return false;
      }
      const magDiff = Math.abs((act.actualMagnitude || 0) - mag);
      if (magDiff > 0.8) return false;
      return true;
    });

    if (duplicateIndex !== -1) {
      const existingAct = db.activities[duplicateIndex];
      const existingProvider = (existingAct.magnitudeScale || 'AFAD').toUpperCase();

      if (eqProvider === 'AFAD' && existingProvider !== 'AFAD') {
        db.activities.splice(duplicateIndex, 1);
        console.log(`[Deduplicate Sismik] Removed: ${existingAct.location} (${existingAct.timestamp}) at index ${duplicateIndex}`);
      } else {
        continue;
      }
    } else {
      const exists = db.activities.some(act => act.id === eqId);
      if (exists) continue;
    }

    const level = mag >= 5.0 ? 'severe' : mag >= 4.0 ? 'high' : mag >= 3.0 ? 'moderate' : 'low';
    const newActivity = {
      id: eqId,
      deviceId: '',
      deviceName: eqProvider,
      type: 'seismic',
      estimatedMagnitude: parseFloat((mag - 0.2).toFixed(1)) || 0,
      actualMagnitude: mag,
      magnitudeScale: eq.magnitude_ml ? 'ML' : eq.magnitude_mw ? 'MW' : 'ML',
      location: eqLocation,
      depth: depth,
      timestamp: new Date(eqTime).toISOString(),
      actions: [],
      level,
      description: `${eqLocation} bölgesinde ${depth} km derinlikte ${mag} büyüklüğünde gerçek sismik aktivite kaydedildi (${eqProvider}).`,
      latitude: lat,
      longitude: lon
    };

    db.activities.unshift(newActivity);
    modified = true;
  }

  console.log('After Sismik loop activities count:', db.activities.length);
  console.log('Top 3 activities after Sismik loop:');
  db.activities.slice(0, 3).forEach((a, i) => console.log(`  ${i+1}. ${a.location} | ${a.timestamp} | ${a.deviceName}`));

  if (modified) {
    db.activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (db.activities.length > 50) {
      db.activities = db.activities.slice(0, 50);
    }
    console.log('Final activities count after slice:', db.activities.length);
    console.log('Final Top 5 activities:');
    db.activities.slice(0, 5).forEach((a, i) => console.log(`  ${i+1}. ${a.location} | ${a.timestamp} | ${a.deviceName}`));
  }
}

debugSync();
