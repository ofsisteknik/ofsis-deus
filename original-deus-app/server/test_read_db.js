const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
console.log('Total activities in db:', db.activities.length);
db.activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
console.log('Top 5 activities sorted:');
db.activities.slice(0, 5).forEach((a, i) => {
  console.log(`${i+1}. ${a.location} | ${a.timestamp} | ${a.deviceName}`);
});
