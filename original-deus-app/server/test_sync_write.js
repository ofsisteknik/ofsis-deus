const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

function readDb() {
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function runTestSync() {
  console.log('Reading DB...');
  const db = readDb();
  let modified = false;

  console.log('Fetching Sismik Harita...');
  const res = await fetch('https://sismikharita.com/api.php?limit=100', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  const json = await res.json();
  const sismikData = json.earthquakes || [];
  console.log(`Fetched ${sismikData.length} records.`);

  const sismikEqs = sismikData.slice().reverse();
  for (const eq of sismikEqs) {
    const mag = parseFloat(eq.magnitude);
    if (isNaN(mag)) continue;
    const lat = parseFloat(eq.latitude);
    const lon = parseFloat(eq.longitude);
    if (isNaN(lat) || isNaN(lon)) continue;

    if (lat < 35.0 || lat > 43.0 || lon < 25.0 || lon > 46.0) {
      continue;
    }

    const eqTime = new Date(eq.occurred_at + 'Z').getTime();
    let rawSource = eq.source || (eq.sources && eq.sources[0] && eq.sources[0].name) || 'AFAD';
    let eqProvider = rawSource.toUpperCase();
    if (eqProvider.includes('SISMIK') || eqProvider.includes('HARITA')) {
      eqProvider = 'AFAD';
    }
    const depth = parseFloat(eq.depth_km) || 0;
    const eqLocation = eq.display_location || eq.geo_location || eq.location;
    const eqId = eq.event_id || eq.sismik_id || String(eq.id);

    // Check duplicate
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
      continue;
    }

    const exists = db.activities.some(act => act.id === eqId);
    if (exists) continue;

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
      level: level,
      description: `${eqLocation} bölgesinde ${depth} km derinlikte ${mag} büyüklüğünde gerçek sismik aktivite kaydedildi (${eqProvider}).`,
      latitude: lat,
      longitude: lon
    };

    console.log(`Inserting: ${eqLocation} (${newActivity.timestamp})`);
    db.activities.unshift(newActivity);
    modified = true;
  }

  if (modified) {
    db.activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (db.activities.length > 50) {
      db.activities = db.activities.slice(0, 50);
    }
    writeDb(db);
    console.log('DB updated on disk!');
  } else {
    console.log('No modifications needed.');
  }

  // Print top 5 activities from db
  const updatedDb = readDb();
  console.log('\nTop 5 activities in DB now:');
  updatedDb.activities.slice(0, 5).forEach((act, i) => {
    console.log(`${i+1}. ${act.location} | Mag: ${act.actualMagnitude} | Source: ${act.deviceName} | Time: ${act.timestamp}`);
  });
}

runTestSync();
