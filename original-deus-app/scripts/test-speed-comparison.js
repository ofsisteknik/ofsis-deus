const https = require('https');

// Helper to calculate distance in km between two lat/lon coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fetch helper using native node fetch
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

async function runHistoricalComparison() {
  console.log("=================================================");
  console.log("  TARİHSEL HIZ VE VERİ TUTARLILIĞI KARŞILAŞTIRMASI");
  console.log("=================================================");
  console.log("Feeds yükleniyor...");

  try {
    const aydogduData = await fetchJson('https://api.orhanaydogdu.com.tr/deprem?limit=100');
    const emscData = await fetchJson('https://www.seismicportal.eu/fdsnws/event/1/query?minlat=35&maxlat=43&minlon=25&maxlon=45&format=json&limit=100&orderby=time');

    if (!aydogduData.status || !Array.isArray(aydogduData.result)) {
      throw new Error("Aydogdu API geçersiz veri döndürdü.");
    }
    if (!emscData.features || !Array.isArray(emscData.features)) {
      throw new Error("EMSC API geçersiz GeoJSON döndürdü.");
    }

    const aydogduEvents = aydogduData.result;
    const emscEvents = emscData.features.map(f => f.properties);

    console.log(`\nYüklenen Aydogdu Kayıt Sayısı: ${aydogduEvents.length}`);
    console.log(`Yüklenen EMSC Kayıt Sayısı: ${emscEvents.length}`);

    let matchCount = 0;
    let emscFasterCount = 0;
    let aydogduFasterCount = 0;
    let exactTimeMatchCount = 0;

    const matchedPairs = [];

    // Pair up events
    for (const aEv of aydogduEvents) {
      const aTime = aEv.created_at * 1000;
      const aLat = aEv.geojson.coordinates[1];
      const aLon = aEv.geojson.coordinates[0];

      // Find best match in EMSC
      let bestMatch = null;
      let minDistance = Infinity;

      for (const eEv of emscEvents) {
        const eTime = new Date(eEv.time).getTime();
        const timeDiffSec = Math.abs(aTime - eTime) / 1000;

        if (timeDiffSec <= 180) { // within 3 minutes
          const dist = calculateDistance(aLat, aLon, eEv.lat, eEv.lon);
          if (dist <= 80 && dist < minDistance) { // within 80km
            const magDiff = Math.abs(aEv.mag - eEv.mag);
            if (magDiff <= 0.8) {
              minDistance = dist;
              bestMatch = eEv;
            }
          }
        }
      }

      if (bestMatch) {
        matchCount++;
        const eTime = new Date(bestMatch.time).getTime();
        const timeDiffSec = (aTime - eTime) / 1000; // Positive means EMSC origin time is earlier
        
        let emscPublishDelayMin = null;
        if (bestMatch.lastupdate) {
          const lastUpdate = new Date(bestMatch.lastupdate).getTime();
          emscPublishDelayMin = (lastUpdate - eTime) / 1000 / 60;
        }

        matchedPairs.push({
          location: aEv.title,
          mag: aEv.mag,
          emscMag: bestMatch.mag,
          timeDiffSec,
          emscPublishDelayMin,
          provider: aEv.provider,
          emscAuth: bestMatch.auth
        });

        if (timeDiffSec > 0.1) {
          emscFasterCount++;
        } else if (timeDiffSec < -0.1) {
          aydogduFasterCount++;
        } else {
          exactTimeMatchCount++;
        }
      }
    }

    console.log(`\nEşleşen Deprem Sayısı (Ortak Olaylar): ${matchCount}`);
    console.log("-------------------------------------------------");
    
    if (matchCount > 0) {
      console.log(`EMSC Oluş Zamanını Daha Önce Raporlayan: ${emscFasterCount} olay`);
      console.log(`Aydogdu (Kandilli/AFAD) Daha Önce Raporlayan: ${aydogduFasterCount} olay`);
      console.log(`Tam Eşit Raporlama Zamanı (Oluş Zamanı): ${exactTimeMatchCount} olay`);

      console.log("\n[EMSC] Yayınlanma/Güncelleme Gecikme Analizi:");
      const validDelays = matchedPairs.filter(p => p.emscPublishDelayMin !== null).map(p => p.emscPublishDelayMin);
      if (validDelays.length > 0) {
        const avgDelay = validDelays.reduce((sum, d) => sum + d, 0) / validDelays.length;
        const minDelay = Math.min(...validDelays);
        const maxDelay = Math.max(...validDelays);
        console.log(`  Ortalama Yayınlanma Gecikmesi: ${avgDelay.toFixed(2)} dakika`);
        console.log(`  En Hızlı Güncelleme: ${minDelay.toFixed(2)} dakika`);
        console.log(`  En Yavaş Güncelleme: ${maxDelay.toFixed(2)} dakika`);
      }

      console.log("\nSon 5 Ortak Deprem Örneği:");
      matchedPairs.slice(0, 5).forEach((p, idx) => {
        console.log(`  ${idx+1}. ${p.location} (Büyüklük: Aydogdu=${p.mag} vs EMSC=${p.emscMag})`);
        console.log(`     Zaman Farkı (Aydogdu - EMSC): ${p.timeDiffSec.toFixed(1)} sn`);
        if (p.emscPublishDelayMin) {
          console.log(`     EMSC Sunucu Kayıt Gecikmesi: ${p.emscPublishDelayMin.toFixed(1)} dakika`);
        }
      });
    } else {
      console.log("Eşleşen ortak olay bulunamadı.");
    }
  } catch (err) {
    console.error("Historical comparison failed:", err.message);
  }
}

async function startLiveMonitoring() {
  console.log("\n=================================================");
  console.log("  CANLI TAKİP MODU - İLK HANGİSİ YAKALIYOR?");
  console.log("  Her 5 saniyede bir sorgulanır... (Durdurmak için Ctrl+C)");
  console.log("=================================================");

  const seenAydogduIds = new Set();
  const seenEmscIds = new Set();
  const discoveryTimes = new Map(); // key: matchHash, value: { emscSeen, aydogduSeen }

  function getMatchHash(lat, lon, timeMs, mag) {
    const roundedLat = Math.round(lat * 10) / 10;
    const roundedLon = Math.round(lon * 10) / 10;
    const timeGroup = Math.round(timeMs / 120000);
    const roundedMag = Math.round(mag * 5) / 5;
    return `${roundedLat}_${roundedLon}_${timeGroup}_${roundedMag}`;
  }

  try {
    const aydogduData = await fetchJson('https://api.orhanaydogdu.com.tr/deprem?limit=30');
    const emscData = await fetchJson('https://www.seismicportal.eu/fdsnws/event/1/query?minlat=35&maxlat=43&minlon=25&maxlon=45&format=json&limit=30&orderby=time');

    if (aydogduData.result) {
      aydogduData.result.forEach(e => seenAydogduIds.add(e.earthquake_id));
    }
    if (emscData.features) {
      emscData.features.forEach(e => seenEmscIds.add(e.properties.unid || e.id));
    }
    console.log("Mevcut depremler belleğe alındı, yeni sarsıntı gözlemleniyor...");
  } catch (e) {
    console.warn("Preload warning:", e.message);
  }

  setInterval(async () => {
    const now = Date.now();
    try {
      // 1. Fetch from Aydogdu
      const aydogduData = await fetchJson('https://api.orhanaydogdu.com.tr/deprem?limit=10');
      if (aydogduData.result) {
        for (const e of aydogduData.result) {
          if (!seenAydogduIds.has(e.earthquake_id)) {
            seenAydogduIds.add(e.earthquake_id);
            const lat = e.geojson.coordinates[1];
            const lon = e.geojson.coordinates[0];
            const timeMs = e.created_at * 1000;
            const hash = getMatchHash(lat, lon, timeMs, e.mag);

            console.log(`\n[Aydogdu] Yeni Deprem Yakalandı: ${e.title} (ML ${e.mag}) @ ${new Date().toLocaleTimeString()}`);

            if (!discoveryTimes.has(hash)) {
              discoveryTimes.set(hash, { aydogduSeen: now, title: e.title, mag: e.mag });
            } else {
              const pair = discoveryTimes.get(hash);
              if (!pair.aydogduSeen) {
                pair.aydogduSeen = now;
                const diff = (now - pair.emscSeen) / 1000;
                console.log(`  => HIZ KARŞILAŞTIRMASI: EMSC bu depremi Aydogdu'dan ${diff.toFixed(1)} saniye ÖNCE yakaladı!`);
              }
            }
          }
        }
      }

      // 2. Fetch from EMSC
      const emscData = await fetchJson('https://www.seismicportal.eu/fdsnws/event/1/query?minlat=35&maxlat=43&minlon=25&maxlon=45&format=json&limit=10&orderby=time');
      if (emscData.features) {
        for (const f of emscData.features) {
          const e = f.properties;
          const id = e.unid || f.id;
          if (!seenEmscIds.has(id)) {
            seenEmscIds.add(id);
            const timeMs = new Date(e.time).getTime();
            const hash = getMatchHash(e.lat, e.lon, timeMs, e.mag);

            console.log(`\n[EMSC] Yeni Deprem Yakalandı: ${e.flynn_region} (M ${e.mag}) @ ${new Date().toLocaleTimeString()}`);

            if (!discoveryTimes.has(hash)) {
              discoveryTimes.set(hash, { emscSeen: now, title: e.flynn_region, mag: e.mag });
            } else {
              const pair = discoveryTimes.get(hash);
              if (!pair.emscSeen) {
                pair.emscSeen = now;
                const diff = (now - pair.aydogduSeen) / 1000;
                console.log(`  => HIZ KARŞILAŞTIRMASI: Aydogdu bu depremi EMSC'den ${diff.toFixed(1)} saniye ÖNCE yakaladı!`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("[Live Monitor Error]:", err.message);
    }
  }, 5000);
}

async function main() {
  await runHistoricalComparison();
  await startLiveMonitoring();
}

main();
