const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

// --- RATE LIMITING MIDDLEWARE ---
const rateLimits = new Map(); // IP -> { count, resetTime }

const rateLimiter = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  
  // Check if IP is bypassed
  const bypassIpsStr = process.env.BYPASS_IPS || '';
  const bypassIps = bypassIpsStr.split(',').map(s => s.trim()).filter(Boolean);
  
  if (bypassIps.includes(ip)) {
    return next();
  }
  
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 40;
  
  let limit = rateLimits.get(ip);
  
  if (!limit) {
    limit = {
      count: 1,
      resetTime: now + windowMs
    };
    rateLimits.set(ip, limit);
  } else {
    if (now > limit.resetTime) {
      // Reset rate limit window
      limit.count = 1;
      limit.resetTime = now + windowMs;
    } else {
      // Increment request count
      limit.count += 1;
    }
  }
  
  // Prune map if it gets too large to prevent memory leak
  if (rateLimits.size > 1000) {
    for (const [key, val] of rateLimits.entries()) {
      if (now > val.resetTime) {
        rateLimits.delete(key);
      }
    }
  }
  
  if (limit.count > maxRequests) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Sürdürülebilirlik limitleri kapsamında dakikada maksimum 40 istek sınırını aştınız.',
      retryAfterSeconds: Math.ceil((limit.resetTime - now) / 1000)
    });
  }
  
  // Append standard rate-limiting headers
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - limit.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(limit.resetTime / 1000));
  
  next();
};

app.use(rateLimiter);

// Initial database payload matching mockData.ts with latest OFSİS brand styling & Admin2026! password
const DEFAULT_DB = {
  users: [
    {
      id: 'user-admin-1',
      name: 'Sistem Yöneticisi',
      email: 'admin@ofsis.io',
      passwordHash: 'Admin2026!',
      role: 'admin',
      createdAt: '2024-01-15T08:00:00Z',
      createdBy: 'system',
      assignedDeviceIds: ['dev-1', 'dev-2', 'dev-3', 'dev-4', 'dev-5', 'dev-6'],
      isActive: true,
    }
  ],
  devices: [
    {
      id: 'dev-1',
      name: 'Master-8',
      location: 'İzmir, Bornova',
      latitude: 38.4682,
      longitude: 27.2178,
      status: 'online',
      firmwareVersion: 'v2.4.1',
      batteryPercent: 100,
      lastSeenAt: new Date().toISOString(),
      todayActivityCount: 0,
      ownerId: 'user-admin-1',
      ipAddress: '10.157.169.205',
      port: 8080,
      isPhysical: true,
      automations: [
        { id: 'auto-1', name: 'Asansör Sistemi', triggerMagnitude: 3.5, action: 'Asansör zemin kata indirildi', isActive: true },
        { id: 'auto-2', name: 'Doğalgaz Vanası', triggerMagnitude: 4.0, action: 'Doğalgaz vanası kapatıldı', isActive: true },
        { id: 'auto-3', name: 'Alarm Bildirimi', triggerMagnitude: 5.0, action: 'Tüm kullanıcılara alarm gönderildi', isActive: true },
      ],
    },
    {
      id: 'dev-2',
      name: 'Master-10',
      location: 'Manisa, Salihli',
      latitude: 38.4804,
      longitude: 28.1348,
      status: 'online',
      firmwareVersion: 'v2.4.0',
      batteryPercent: 100,
      lastSeenAt: new Date().toISOString(),
      todayActivityCount: 0,
      ownerId: 'user-admin-1',
      isPhysical: false,
      automations: [
        { id: 'auto-4', name: 'Asansör Sistemi', triggerMagnitude: 3.5, action: 'Asansör zemin kata indirildi', isActive: true },
        { id: 'auto-5', name: 'Alarm Bildirimi', triggerMagnitude: 5.0, action: 'Alarm bildirimi gönderildi', isActive: true },
      ],
    },
    {
      id: 'dev-3',
      name: 'Master-5',
      location: 'Ankara, Çankaya',
      latitude: 39.9334,
      longitude: 32.8597,
      status: 'online',
      firmwareVersion: 'v2.4.1',
      batteryPercent: 100,
      lastSeenAt: new Date().toISOString(),
      todayActivityCount: 0,
      ownerId: 'user-admin-1',
      isPhysical: false,
      automations: [
        { id: 'auto-6', name: 'Doğalgaz Vanası', triggerMagnitude: 4.0, action: 'Doğalgaz vanası kapatıldı', isActive: true },
      ],
    },
    {
      id: 'dev-4',
      name: 'Master-3',
      location: 'Muğla, Bodrum',
      latitude: 37.0344,
      longitude: 27.4305,
      status: 'online',
      firmwareVersion: 'v2.3.9',
      batteryPercent: 100,
      lastSeenAt: new Date().toISOString(),
      todayActivityCount: 0,
      ownerId: 'user-admin-1',
      isPhysical: false,
      automations: [
        { id: 'auto-7', name: 'Alarm Bildirimi', triggerMagnitude: 5.0, action: 'Alarm bildirimi gönderildi', isActive: false },
      ],
    },
    {
      id: 'dev-5',
      name: 'Master-6',
      location: 'Balıkesir, Erdek',
      latitude: 40.4014,
      longitude: 27.7937,
      status: 'online',
      firmwareVersion: 'v2.3.8',
      batteryPercent: 100,
      lastSeenAt: new Date().toISOString(),
      todayActivityCount: 0,
      ownerId: 'user-admin-1',
      isPhysical: false,
      automations: [],
    },
    {
      id: 'dev-6',
      name: 'Master-2',
      location: 'Çanakkale, Merkez',
      latitude: 40.1553,
      longitude: 26.4142,
      status: 'online',
      firmwareVersion: 'v2.3.7',
      batteryPercent: 100,
      lastSeenAt: new Date().toISOString(),
      todayActivityCount: 0,
      ownerId: 'user-admin-1',
      isPhysical: false,
      automations: [],
    },
  ],
  activities: [],
  notifications: [],
  settings: {
    elevatorThreshold: 3.5,
    gasThreshold: 4.0,
    alarmThreshold: 5.0
  }
};

// In-memory cache of the database to eliminate disk read I/O on polling requests
let dbInMemory = null;
let lastDbLoadMtime = 0;

// Helper: Read DB
function readDb() {
  let mtime = 0;
  try {
    if (fs.existsSync(DB_PATH)) {
      mtime = fs.statSync(DB_PATH).mtimeMs;
    }
  } catch (err) {}

  if (dbInMemory && mtime <= lastDbLoadMtime) {
    return dbInMemory;
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), 'utf8');
    dbInMemory = JSON.parse(JSON.stringify(DEFAULT_DB));
    try {
      lastDbLoadMtime = fs.statSync(DB_PATH).mtimeMs;
    } catch (err) {}
    return dbInMemory;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(raw);
    
    // Auto-prune long history to keep database size highly optimized
    let modified = false;
    
    // Migrate existing devices to have ipAddress and port
    if (db.devices) {
      db.devices.forEach(device => {
        if (device.ipAddress === undefined) {
          device.ipAddress = device.id === 'dev-1' ? '192.168.1.120' : '';
          modified = true;
        }
        if (device.port === undefined) {
          device.port = 8080;
          modified = true;
        }
      });
    }

    if (db.activities) {
      db.activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      if (db.activities.length > 50) {
        db.activities = db.activities.slice(0, 50);
        modified = true;
      }
    }
    if (db.notifications && db.notifications.length > 50) {
      db.notifications = db.notifications.slice(0, 50);
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
      try {
        lastDbLoadMtime = fs.statSync(DB_PATH).mtimeMs;
      } catch (err) {}
    } else {
      lastDbLoadMtime = mtime;
    }
    
    dbInMemory = db;
    return dbInMemory;
  } catch (err) {
    console.error("Error reading database file, resetting to defaults...", err);
    dbInMemory = JSON.parse(JSON.stringify(DEFAULT_DB));
    return dbInMemory;
  }
}

// Helper: Write DB
function writeDb(data) {
  dbInMemory = data;
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  try {
    lastDbLoadMtime = fs.statSync(DB_PATH).mtimeMs;
  } catch (err) {}
}

// --- API ENDPOINTS ---

// Auth Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-posta ve şifre alanları zorunludur.' });
  }

  const db = readDb();
  const user = db.users.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === password
  );

  if (!user) {
    return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
  }
  if (!user.isActive) {
    return res.status(403).json({ error: 'Hesabınız devre dışı bırakılmış. Yönetici ile iletişime geçin.' });
  }

  const token = `mock_token_${user.id}_${Date.now()}`;
  res.json({
    user,
    session: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
  });
});

// Users REST
app.get('/api/users', (req, res) => {
  const db = readDb();
  res.json(db.users);
});

app.post('/api/users', (req, res) => {
  const newUser = req.body;
  const db = readDb();
  
  const exists = db.users.find(u => u.email.toLowerCase() === newUser.email.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Bu e-posta adresi zaten kayıtlı.' });
  }

  newUser.id = `user-${Date.now()}`;
  newUser.createdAt = new Date().toISOString();
  newUser.passwordHash = newUser.password || 'User123!';
  delete newUser.password;

  db.users.push(newUser);
  writeDb(db);
  res.status(201).json(newUser);
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = readDb();

  const index = db.users.findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

  db.users[index] = { ...db.users[index], ...updates };
  writeDb(db);
  res.json(db.users[index]);
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();

  db.users = db.users.filter(u => u.id !== id);
  writeDb(db);
  res.json({ success: true });
});

// Devices REST
app.get('/api/devices', (req, res) => {
  const db = readDb();
  res.json(db.devices);
});

app.post('/api/devices', (req, res) => {
  const newDevice = req.body;
  
  if (!newDevice.name || !newDevice.location || !newDevice.latitude || !newDevice.longitude) {
    return res.status(400).json({ error: 'Cihaz adı, konum, enlem ve boylam alanları zorunludur.' });
  }

  const db = readDb();

  newDevice.id = newDevice.id || `dev-${Date.now()}`;
  newDevice.latitude = parseFloat(newDevice.latitude);
  newDevice.longitude = parseFloat(newDevice.longitude);
  newDevice.coverageRadius = parseFloat(newDevice.coverageRadius) || 150;
  newDevice.notificationThreshold = parseFloat(newDevice.notificationThreshold) || 3.0;
  newDevice.status = 'online';
  newDevice.firmwareVersion = 'v2.4.1';
  newDevice.batteryPercent = 100;
  newDevice.lastSeenAt = new Date().toISOString();
  newDevice.todayActivityCount = 0;
  newDevice.ipAddress = newDevice.ipAddress || '';
  newDevice.port = newDevice.port ? parseInt(newDevice.port) : 8080;
  
  // Set default automations using settings
  const settings = db.settings || { elevatorThreshold: 3.5, gasThreshold: 4.0, alarmThreshold: 5.0 };
  newDevice.automations = [
    { id: `auto-${Date.now()}-1`, name: 'Asansör Sistemi', triggerMagnitude: settings.elevatorThreshold, action: 'Asansör zemin kata indirildi', isActive: true },
    { id: `auto-${Date.now()}-2`, name: 'Doğalgaz Vanası', triggerMagnitude: settings.gasThreshold, action: 'Doğalgaz vanası kapatıldı', isActive: true },
    { id: `auto-${Date.now()}-3`, name: 'Alarm Bildirimi', triggerMagnitude: settings.alarmThreshold, action: 'Tüm kullanıcılara alarm gönderildi', isActive: true },
  ];

  db.devices.push(newDevice);

  // Auto assign device to all existing users so it immediately becomes visible
  db.users.forEach(u => {
    if (u.assignedDeviceIds) {
      if (!u.assignedDeviceIds.includes(newDevice.id)) {
        u.assignedDeviceIds.push(newDevice.id);
      }
    } else {
      u.assignedDeviceIds = [newDevice.id];
    }
  });

  writeDb(db);
  res.status(201).json(newDevice);
});

app.put('/api/devices/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = readDb();

  const index = db.devices.findIndex(d => d.id === id);
  if (index === -1) return res.status(404).json({ error: 'Cihaz bulunamadı.' });

  db.devices[index] = { ...db.devices[index], ...updates };
  writeDb(db);
  res.json(db.devices[index]);
});

app.delete('/api/devices/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();

  db.devices = db.devices.filter(d => d.id !== id);
  writeDb(db);
  res.json({ success: true });
});

// Activities REST
app.get('/api/activities', (req, res) => {
  const db = readDb();
  const sortedActivities = [...db.activities].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(sortedActivities);
});

app.post('/api/activities', (req, res) => {
  const newActivity = req.body;
  const db = readDb();

  newActivity.id = `act-${Date.now()}`;
  newActivity.timestamp = new Date().toISOString();

  db.activities.unshift(newActivity); // add to top
  
  // Cap activities to 50 items to prevent storage bloat
  if (db.activities.length > 50) {
    db.activities = db.activities.slice(0, 50);
  }
  
  // Increment target device todayActivityCount
  const devIndex = db.devices.findIndex(d => d.id === newActivity.deviceId);
  if (devIndex !== -1) {
    db.devices[devIndex].todayActivityCount += 1;
    db.devices[devIndex].lastSeenAt = new Date().toISOString();
    if (newActivity.type === 'seismic' && newActivity.actualMagnitude >= 4.0) {
      db.devices[devIndex].status = 'alarm';
    } else if (newActivity.type === 'seismic' && newActivity.actualMagnitude >= 3.0) {
      db.devices[devIndex].status = 'warning';
    }
  }

  writeDb(db);
  res.status(201).json(newActivity);
});

app.delete('/api/activities', (req, res) => {
  const { keepCount } = req.query;
  const db = readDb();

  if (keepCount !== undefined) {
    const keep = parseInt(keepCount, 10);
    if (isNaN(keep) || keep < 0) {
      return res.status(400).json({ error: 'Geçersiz keepCount parametresi.' });
    }
    // Sort desc to keep newest, slice from start, discard the rest (oldest)
    const sorted = [...db.activities].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    db.activities = sorted.slice(0, keep);
  } else {
    db.activities = [];
  }

  writeDb(db);
  res.json({ success: true, count: db.activities.length });
});

// Consolidated sync endpoint for ultra-high speed and low latency
app.get('/api/sync', (req, res) => {
  const db = readDb();
  const sortedActivities = [...db.activities].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json({
    devices: db.devices,
    activities: sortedActivities,
    notifications: db.notifications,
    settings: db.settings || { elevatorThreshold: 3.5, gasThreshold: 4.0, alarmThreshold: 5.0 }
  });
});

// Settings REST
app.get('/api/settings', (req, res) => {
  const db = readDb();
  res.json(db.settings || { elevatorThreshold: 3.5, gasThreshold: 4.0, alarmThreshold: 5.0 });
});

app.put('/api/settings', (req, res) => {
  const updates = req.body;
  const db = readDb();
  db.settings = { ...(db.settings || { elevatorThreshold: 3.5, gasThreshold: 4.0, alarmThreshold: 5.0 }), ...updates };

  // Also synchronize device automations triggerMagnitude values with these settings!
  db.devices.forEach(device => {
    if (device.automations) {
      device.automations.forEach(auto => {
        if (auto.id === 'auto-1' || auto.id === 'auto-4') {
          auto.triggerMagnitude = db.settings.elevatorThreshold;
        } else if (auto.id === 'auto-2' || auto.id === 'auto-6') {
          auto.triggerMagnitude = db.settings.gasThreshold;
        } else if (auto.id === 'auto-3' || auto.id === 'auto-5' || auto.id === 'auto-7') {
          auto.triggerMagnitude = db.settings.alarmThreshold;
        }
      });
    }
  });

  writeDb(db);
  res.json(db.settings);
});

// Notifications REST
app.get('/api/notifications', (req, res) => {
  const db = readDb();
  res.json(db.notifications);
});

app.post('/api/notifications', (req, res) => {
  const newNotif = req.body;
  const db = readDb();

  newNotif.id = `notif-${Date.now()}`;
  newNotif.timestamp = new Date().toISOString();
  newNotif.isRead = false;

  db.notifications.unshift(newNotif);
  
  // Cap notifications to 50 items to prevent storage bloat
  if (db.notifications.length > 50) {
    db.notifications = db.notifications.slice(0, 50);
  }
  
  writeDb(db);
  res.status(201).json(newNotif);
});

app.put('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = readDb();

  const index = db.notifications.findIndex(n => n.id === id);
  if (index === -1) return res.status(404).json({ error: 'Bildirim bulunamadı.' });

  db.notifications[index] = { ...db.notifications[index], ...updates };
  writeDb(db);
  res.json(db.notifications[index]);
});

// --- AFAD / KANDİLLİ REAL-TIME EARTHQUAKE SYNCHRONIZATION ---
// Calculates distance in km between two GPS coordinates using the Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Cleans up any existing duplicate seismic records favoring AFAD over others (e.g. KANDILLI)
function deduplicateActivities(activities) {
  const result = [];
  for (let i = 0; i < activities.length; i++) {
    const act = activities[i];
    
    // Migrate pre-existing "Sismik İstasyon" deviceName to the actual agency (AFAD/Kandilli)
    if (act.type === 'seismic' && !act.deviceId && (!act.deviceName || act.deviceName === 'Sismik İstasyon')) {
      act.deviceName = (act.magnitudeScale || act.provider || 'AFAD').toUpperCase();
    }
    
    if (act.type !== 'seismic') {
      result.push(act);
      continue;
    }
    
    const actTime = new Date(act.timestamp).getTime();
    const actProvider = (act.magnitudeScale || act.provider || 'AFAD').toUpperCase();
    
    let dupIndex = result.findIndex(existing => {
      if (existing.type !== 'seismic') return false;
      
      const existingTime = new Date(existing.timestamp).getTime();
      const timeDiffSec = Math.abs(existingTime - actTime) / 1000;
      if (timeDiffSec > 180) return false; // within 3 mins
      
      if (existing.latitude && existing.longitude && act.latitude && act.longitude) {
        const dist = calculateDistance(existing.latitude, existing.longitude, act.latitude, act.longitude);
        if (dist > 80) return false; // within 80km
      } else {
        const loc1 = (existing.location || '').toLowerCase();
        const loc2 = (act.location || '').toLowerCase();
        const words1 = loc1.split(/[\s,()]+/).filter(w => w.length > 3);
        const words2 = loc2.split(/[\s,()]+/).filter(w => w.length > 3);
        const hasCommonWord = words1.some(w => words2.includes(w));
        if (!hasCommonWord) return false;
      }
      
      const magDiff = Math.abs((existing.actualMagnitude || existing.estimatedMagnitude || 0) - (act.actualMagnitude || act.estimatedMagnitude || 0));
      if (magDiff > 0.8) return false; // within 0.8 magnitude
      
      return true;
    });
    
    if (dupIndex !== -1) {
      const existing = result[dupIndex];
      const existingProvider = (existing.magnitudeScale || existing.provider || 'AFAD').toUpperCase();
      
      if (actProvider === 'AFAD' && existingProvider !== 'AFAD') {
        result[dupIndex] = act;
        console.log(`[Deduplication Pass] Replacing duplicate ${existingProvider} with higher-priority AFAD record: ${act.location}`);
      } else {
        continue;
      }
    } else {
      result.push(act);
    }
  }
  return result;
}

let lastSismikHaritaFetchTime = 0;

// Helper to match devices and trigger automations for a seismic event
function processDeviceAutomations(newActivity, lat, lon, mag, db) {
  let closestDevice = null;
  let minDistance = Infinity;
  const matchingDevices = [];
  
  db.devices.forEach(device => {
    const dist = calculateDistance(lat, lon, device.latitude, device.longitude);
    const radius = device.coverageRadius || 150; // Custom coverage radius (default 150km)
    if (dist < radius) {
      matchingDevices.push({ device, dist });
    }
  });
  
  if (matchingDevices.length > 0) {
    matchingDevices.forEach(({ device, dist }) => {
      const dbDev = db.devices.find(d => d.id === device.id);
      if (dbDev) {
        dbDev.todayActivityCount += 1;
        dbDev.lastSeenAt = new Date().toISOString();
        
        const settings = db.settings || { elevatorThreshold: 3.5, gasThreshold: 4.0, alarmThreshold: 5.0 };
        
        // Adjust device status
        if (mag >= settings.alarmThreshold) {
          dbDev.status = 'alarm';
        } else if (mag >= settings.elevatorThreshold) {
          dbDev.status = 'warning';
        }
        
        // Trigger customized automations
        const triggeredActions = [];
        if (dbDev.automations) {
          dbDev.automations.forEach(auto => {
            if (auto.isActive && mag >= auto.triggerMagnitude) {
              triggeredActions.push(`${auto.action} (${dbDev.name})`);
            }
          });
        }
        
        if (triggeredActions.length > 0) {
          newActivity.actions.push(...triggeredActions);
        }
        
        if (dist < minDistance) {
          minDistance = dist;
          closestDevice = dbDev;
        }
        
        // Post notification for this user-assigned device based on its own threshold!
        const notifType = mag >= settings.alarmThreshold ? 'alarm' : mag >= settings.elevatorThreshold ? 'warning' : 'info';
        const threshold = dbDev.notificationThreshold || 3.0; // Custom notification threshold (default 3.0)
        if (mag >= threshold) {
          const newNotification = {
            id: `notif-real-${Date.now()}-${dbDev.id}`,
            title: `${mag} ML Deprem Algılandı`,
            body: `${dbDev.name} (${dbDev.location}) cihazına ${dist.toFixed(1)} km uzaklıkta (kapsama alanı içinde) deprem meydana geldi!`,
            type: notifType,
            activityId: newActivity.id,
            deviceId: dbDev.id,
            isRead: false,
            timestamp: new Date().toISOString()
          };
          db.notifications.unshift(newNotification);
        }
      }
    });
  }
  
  if (closestDevice) {
    newActivity.deviceId = closestDevice.id;
    newActivity.deviceName = closestDevice.name;
  }
}

// Fetches latest earthquakes in Turkey from both AFAD and Sismik Harita APIs
async function syncRealEarthquakes() {
  const db = readDb();
  let modified = false;

  // Run deduplication sweep on the existing database records to clean up any past duplicates
  const originalLength = db.activities.length;
  db.activities = deduplicateActivities(db.activities);
  if (db.activities.length !== originalLength) {
    modified = true;
    console.log(`[Sync] Cleaned up ${originalLength - db.activities.length} existing duplicate records from database.`);
  }

  // 1. Fetch official AFAD API (polling every 30s)
  let afadData = [];
  try {
    const now = new Date();
    const past = new Date(now.getTime() - 24 * 60 * 60 * 1000); // last 24 hours
    
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
    const url = `https://deprem.afad.gov.tr/apiv2/event/filter?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}&limit=100&orderby=timedesc`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (response.status === 429) {
      console.warn(`[AFAD Sync] Rate limited (429) by AFAD API.`);
    } else if (!response.ok) {
      console.error(`[AFAD Sync] HTTP error! status: ${response.status}`);
    } else {
      const data = await response.json();
      if (Array.isArray(data)) {
        afadData = data;
      }
    }
  } catch (error) {
    console.error(`[AFAD Sync] Error fetching real-time earthquakes:`, error.message);
  }

  // 2. Fetch Sismik Harita API (once every 15 minutes to respect 100 daily requests limit)
  let sismikData = [];
  const nowTimeMs = Date.now();
  if (nowTimeMs - lastSismikHaritaFetchTime >= 15 * 60 * 1000) {
    lastSismikHaritaFetchTime = nowTimeMs;
    try {
      console.log(`[Sismik Harita Sync] Fetching recent earthquakes...`);
      const sismikRes = await fetch('https://sismikharita.com/api.php?limit=100', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (sismikRes.ok) {
        const sismikJson = await sismikRes.json();
        if (sismikJson && sismikJson.status === 'success' && Array.isArray(sismikJson.earthquakes)) {
          sismikData = sismikJson.earthquakes;
          console.log(`[Sismik Harita Sync] Retrieved ${sismikData.length} earthquakes.`);
        }
      } else {
        console.warn(`[Sismik Harita Sync] HTTP error! status: ${sismikRes.status}`);
      }
    } catch (err) {
      console.error(`[Sismik Harita Sync] Error fetching:`, err.message);
    }
  }

  // Process AFAD data (processed first - high priority)
  if (afadData.length > 0) {
    const realEqs = afadData.slice().reverse();
    
    for (const eq of realEqs) {
      const mag = parseFloat(eq.magnitude);
      if (isNaN(mag)) continue;

      const lat = parseFloat(eq.latitude);
      const lon = parseFloat(eq.longitude);
      if (isNaN(lat) || isNaN(lon)) continue;

      const eqTime = new Date(eq.date + 'Z').getTime();
      const eqProvider = 'AFAD';
      const depth = parseFloat(eq.depth) || 0;
 
      // Check if duplicate
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
          console.log(`[Sync] Deduplication: Replacing ${existingProvider} with higher-priority AFAD record in ${eq.location}.`);
        } else {
          continue;
        }
      } else {
        const exists = db.activities.some(act => act.id === eq.eventID);
        if (exists) continue;
      }
      const level = mag >= 5.0 ? 'severe' : mag >= 4.0 ? 'high' : mag >= 3.0 ? 'moderate' : 'low';
      
      const newActivity = {
        id: eq.eventID,
        deviceId: '',
        deviceName: 'AFAD',
        type: 'seismic',
        estimatedMagnitude: parseFloat((mag - 0.2).toFixed(1)) || 0,
        actualMagnitude: mag,
        magnitudeScale: eq.type || 'ML',
        location: eq.location,
        depth: depth,
        timestamp: new Date(eqTime).toISOString(),
        actions: [],
        level: level,
        description: `${eq.location} bölgesinde ${depth} km derinlikte ${mag} büyüklüğünde gerçek sismik aktivite kaydedildi (AFAD).`,
        latitude: lat,
        longitude: lon
      };
      
      processDeviceAutomations(newActivity, lat, lon, mag, db);
      
      db.activities.unshift(newActivity);
      modified = true;
    }
  }

  // Process Sismik Harita data (processed second, Turkey boundaries restriction applied)
  if (sismikData.length > 0) {
    const sismikEqs = sismikData.slice().reverse();
    
    for (const eq of sismikEqs) {
      const mag = parseFloat(eq.magnitude);
      if (isNaN(mag)) continue;

      const lat = parseFloat(eq.latitude);
      const lon = parseFloat(eq.longitude);
      if (isNaN(lat) || isNaN(lon)) continue;

      // Turkey boundary restriction (Lat: 35-43, Lon: 25-46)
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

      // Check if duplicate
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
          console.log(`[Sync] Deduplication: Replacing ${existingProvider} with higher-priority AFAD record in ${eqLocation}.`);
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
        level: level,
        description: `${eqLocation} bölgesinde ${depth} km derinlikte ${mag} büyüklüğünde gerçek sismik aktivite kaydedildi (${eqProvider}).`,
        latitude: lat,
        longitude: lon
      };

      processDeviceAutomations(newActivity, lat, lon, mag, db);

      db.activities.unshift(newActivity);
      modified = true;
    }
  }

  if (modified) {
    db.activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (db.activities.length > 50) {
      db.activities = db.activities.slice(0, 50);
    }
    if (db.notifications.length > 50) {
      db.notifications = db.notifications.slice(0, 50);
    }
    writeDb(db);
    console.log(`[Sync] Successfully synchronized latest real earthquakes.`);
  }
}

// Initial fetch on server start and start interval polling every 30 seconds
syncRealEarthquakes();
setInterval(syncRealEarthquakes, 30000);

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`  OFSİS LOCAL SHARING API SERVER ACTIVE  `);
  console.log(`  Local URL:  http://localhost:${PORT}   `);
  console.log(`=========================================`);
});
