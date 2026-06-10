const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

function readDb() {
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw);
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

async function debugSync() {
  console.log('Starting sync diagnostic...');
  const db = readDb();
  
  // Fetch Sismik Harita
  console.log('Fetching Sismik Harita data...');
  const res = await fetch('https://sismikharita.com/api.php?limit=100', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  const json = await res.json();
  const sismikData = json.earthquakes || [];
  console.log(`Fetched ${sismikData.length} earthquakes.`);

  const sismikEqs = sismikData.slice().reverse();
  for (const eq of sismikEqs) {
    const mag = parseFloat(eq.magnitude);
    const lat = parseFloat(eq.latitude);
    const lon = parseFloat(eq.longitude);
    const eqLocation = eq.display_location || eq.geo_location || eq.location;
    const eqId = eq.event_id || eq.sismik_id || String(eq.id);

    // Is it recent?
    const eqTime = new Date(eq.occurred_at + 'Z').getTime();
    const ageMin = (Date.now() - eqTime) / (60 * 1000);
    
    // Only log earthquakes in the last 4 hours for debugging
    if (ageMin > 240) continue;

    console.log(`\nProcessing: ${eqLocation} | Mag: ${mag} | Time: ${eq.occurred_at} (${ageMin.toFixed(1)} mins ago) | ID: ${eqId}`);

    if (isNaN(mag)) {
      console.log('-> Skipped: Magnitude NaN');
      continue;
    }
    if (isNaN(lat) || isNaN(lon)) {
      console.log('-> Skipped: Coordinates NaN');
      continue;
    }

    if (lat < 35.0 || lat > 43.0 || lon < 25.0 || lon > 46.0) {
      console.log(`-> Skipped: Out of Turkey bounds (${lat}, ${lon})`);
      continue;
    }

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
      const existing = db.activities[duplicateIndex];
      console.log(`-> Found duplicate at index ${duplicateIndex}: ${existing.location} (${existing.timestamp})`);
      continue;
    }

    const exists = db.activities.some(act => act.id === eqId);
    if (exists) {
      console.log(`-> Skipped: Already exists in db (id: ${eqId})`);
      continue;
    }

    console.log('-> WOULD INSERT INTO DB!');
  }
}

debugSync();
