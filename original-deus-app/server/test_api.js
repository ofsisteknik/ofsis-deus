async function checkAPIs() {
  console.log('--- Fetching AFAD ---');
  try {
    const now = new Date();
    const past = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const formatUtcDate = (d) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const mm = String(d.getUTCMinutes()).padStart(2, '0');
      const ss = String(d.getUTCSeconds()).padStart(2, '0');
      return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
    };
    const startStr = formatUtcDate(past);
    const endStr = formatUtcDate(now);
    const url = `https://deprem.afad.gov.tr/apiv2/event/filter?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}&limit=5&orderby=timedesc`;
    console.log('AFAD URL:', url);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    const data = await res.json();
    console.log('AFAD response count:', data.length);
    if (data.length > 0) {
      console.log('AFAD latest 3:');
      data.slice(0, 3).forEach(eq => {
        console.log(`- Date: ${eq.date}, Location: ${eq.location}, Mag: ${eq.magnitude}`);
      });
    }
  } catch (e) {
    console.error('AFAD Error:', e.message);
  }

  console.log('\n--- Fetching Sismik Harita ---');
  try {
    const url = 'https://sismikharita.com/api.php?limit=5';
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    const data = await res.json();
    console.log('Sismik Harita count:', data.earthquakes ? data.earthquakes.length : 0);
    if (data.earthquakes && data.earthquakes.length > 0) {
      console.log('Sismik Harita latest 5:');
      data.earthquakes.slice(0, 5).forEach(eq => {
        console.log(`- Occurred At: ${eq.occurred_at}, Source: ${eq.source}, Location: ${eq.location || eq.geo_location || eq.display_location}, Mag: ${eq.magnitude}`);
        console.log(`  IDs -> event_id: ${eq.event_id}, sismik_id: ${eq.sismik_id}, id: ${eq.id}`);
      });
    }
  } catch (e) {
    console.error('Sismik Harita Error:', e.message);
  }
}

checkAPIs();
