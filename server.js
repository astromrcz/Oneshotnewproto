// ==========================================
// ONE SHOT BAR & BILLIARDS: LOCAL EDGE SERVER
// ==========================================
import express from 'express';
import cors from 'cors';
import sqlite3Pkg from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer'; // 🟢 NEW: File parser

const sqlite3 = sqlite3Pkg.verbose();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// 🟢 NEW: Store uploaded files in Node memory temporarily so we can save them as BLOBs
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors()); 
app.use(express.json());

const dbPath = path.resolve(__dirname, 'oneshot.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('❌ Error connecting to SQLite database:', err.message);
  else {
    console.log('✅ Connected to local SQLite database (Direct Match Mode active).');
    db.run(`ALTER TABLE tables ADD COLUMN sessionData TEXT`, () => {});
    db.run(`CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, mimeType TEXT, data BLOB)`);
    
    // 🟢 NEW: Ensure settings and cms tables exist with keyName as PRIMARY KEY
    db.run(`CREATE TABLE IF NOT EXISTS systemSettings (keyName TEXT PRIMARY KEY, settingValue TEXT, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS cms (keyName TEXT PRIMARY KEY, settingValue TEXT, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  }
});

// ==========================================
// 🚀 READ ROUTES (GET) 
// ==========================================

// 🟢 NEW: Image serving route. This reads the BLOB and serves it as a real image file!
app.get('/api/images/:id', (req, res) => {
  db.get(`SELECT mimeType, data FROM images WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).send('Image not found');
    
    res.setHeader('Content-Type', row.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for fast loading
    res.send(row.data); // Serve the raw binary BLOB
  });
});

app.get('/api/tables', (req, res) => {
  db.all(`SELECT * FROM tables`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ 
      ...r, 
      isActive: r.isActive === 1,
      session: r.sessionData ? JSON.parse(r.sessionData) : undefined 
    })));
  });
});

app.get('/api/reservations', (req, res) => {
  db.all(`SELECT * FROM reservations ORDER BY createdAt DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ ...r, downPaymentPaid: r.downPaymentPaid === 1, balancePaid: r.balancePaid === 1 })));
  });
});



app.get('/api/inventory', (req, res) => {
  db.all(`SELECT * FROM inventory`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ ...r, isActive: r.isActive === 1 })));
  });
});

app.get('/api/queue', (req, res) => {
  db.all(`SELECT * FROM queue WHERE status IN ('waiting', 'called') ORDER BY queueNumber ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/events', (req, res) => {
  db.all(`SELECT * FROM events`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(e => ({ ...e, slotsFull: e.slotsFull === 1, attachments: e.attachments ? [e.attachments] : [] })));
  });
});

app.get('/api/feedback', (req, res) => {
  db.all(`SELECT * FROM feedback ORDER BY date DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(f => ({ ...f, tags: f.tags ? JSON.parse(f.tags) : [] })));
  });
});

app.get('/api/announcements', (req, res) => {
  db.all(`SELECT * FROM announcements ORDER BY createdAt DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(a => ({ ...a, isActive: a.isActive === 1 })));
  });
});

app.get('/api/settings/rates', (req, res) => {
  db.all(`SELECT keyName, settingValue FROM systemSettings`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const config = {};
    rows.forEach(row => {
      let val = row.settingValue;
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (!isNaN(val) && val.trim() !== '' && !val.includes(':')) val = Number(val);
      config[row.keyName] = val;
    });
    res.json(config);
  });
});

app.get('/api/cms', (req, res) => {
  db.all(`SELECT keyName, settingValue FROM cms`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const config = {};
    rows.forEach(row => {
      config[row.keyName] = row.keyName === 'heroImages' ? JSON.parse(row.settingValue) : row.settingValue;
    });
    res.json(config);
  });
});

// ==========================================
// 📥 WRITE ROUTES (POST/PUT/DELETE) 
// ==========================================

// 🟢 NEW: Upload Binary Image to BLOB
app.post('/api/images', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  
  const id = 'img_' + Date.now() + '_' + Math.round(Math.random() * 1000);
  
  db.run(
    `INSERT INTO images (id, mimeType, data) VALUES (?, ?, ?)`, 
    [id, req.file.mimetype, req.file.buffer], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      // Return the new URL back to the frontend so it can save it in the CMS table
      res.status(201).json({ url: `http://localhost:3001/api/images/${id}` });
    }
  );
});

app.put('/api/tables/:id', (req, res) => {
  const { status, session } = req.body;
  const sessionData = session ? JSON.stringify(session) : null;
  db.run(
    `UPDATE tables SET status = ?, sessionData = ? WHERE id = ?`, 
    [status, sessionData, req.params.id], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Table updated successfully." });
    }
  );
});

app.post('/api/queue', (req, res) => {
  const { id, customerName, contactNumber, partySize, status, queueNumber, notes } = req.body;
  const sql = `INSERT INTO queue (id, customerName, contactNumber, partySize, status, queueNumber, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.run(sql, [id, customerName, contactNumber, partySize, status, queueNumber, notes || ''], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Added to queue' });
  });
});

app.put('/api/queue/:id', (req, res) => {
  const { status } = req.body;
  db.run(`UPDATE queue SET status = ? WHERE id = ?`, [status, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Queue updated." });
  });
});

app.delete('/api/queue/:id', (req, res) => {
  db.run(`DELETE FROM queue WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Removed from queue." });
  });
});

app.post('/api/reservations', (req, res) => {
  const { id, customerName, contactNumber, email, date, timeSlot, durationHours, partySize, status, totalAmount, downPaymentAmount, downPaymentPaid, balancePaid, paymentRef, receiptImg } = req.body;
  const sql = `INSERT INTO reservations (id, customerName, contactNumber, email, date, timeSlot, durationHours, partySize, status, totalAmount, downPaymentAmount, downPaymentPaid, balancePaid, paymentRef, receiptImg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.run(sql, [id, customerName, contactNumber, email, date, timeSlot, durationHours, partySize, status, totalAmount, downPaymentAmount, downPaymentPaid ? 1 : 0, balancePaid ? 1 : 0, paymentRef, receiptImg], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Reservation created successfully', id: id });
  });
});

app.put('/api/reservations/:id', (req, res) => {
  const id = req.params.id;
  const { date, timeSlot, status } = req.body;
  let updates = [], params = [];
  if (date) { updates.push("date = ?"); params.push(date); }
  if (timeSlot) { updates.push("timeSlot = ?"); params.push(timeSlot); }
  if (status) { updates.push("status = ?"); params.push(status); }
  if (updates.length === 0) return res.json({ message: "Nothing to update" });
  params.push(id);
  db.run(`UPDATE reservations SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Reservation updated successfully." });
  });
});

app.post('/api/inventory', (req, res) => {
  const { id, name, category, price, stock, isActive } = req.body;
  db.run(`INSERT INTO inventory (id, name, category, price, stock, isActive) VALUES (?, ?, ?, ?, ?, ?)`, [id, name, category, price, stock, isActive ? 1 : 0], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Inventory item saved to DB." });
  });
});

app.put('/api/inventory/:id', (req, res) => {
  const id = req.params.id;
  const { name, category, price, stock } = req.body;
  let updates = [], params = [];
  if (name) { updates.push("name = ?"); params.push(name); }
  if (category) { updates.push("category = ?"); params.push(category); }
  if (price !== undefined) { updates.push("price = ?"); params.push(price); }
  if (stock !== undefined) { updates.push("stock = ?"); params.push(stock); }
  if (updates.length === 0) return res.json({ message: "Nothing to update" });
  params.push(id);
  db.run(`UPDATE inventory SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Inventory updated in DB." });
  });
});

app.put('/api/settings/rates', (req, res) => {
  console.log('PUT /api/settings/rates payload:', req.body);
  const payload = req.body;
  let completed = 0;
  const keys = Object.keys(payload);
  if (keys.length === 0) return res.json({ message: "No rates to update" });
  keys.forEach(key => {
    let value = payload[key];
    if (typeof value === 'boolean') value = value ? 'true' : 'false';
    else value = value !== null && value !== undefined ? value.toString() : '';
    const sql = `INSERT INTO systemSettings (keyName, settingValue) VALUES (?, ?) ON CONFLICT(keyName) DO UPDATE SET settingValue = excluded.settingValue, updatedAt = CURRENT_TIMESTAMP`;
    db.run(sql, [key, value], (err) => {
      completed++;
      if (completed === keys.length) res.json({ message: "System settings synced." });
    });
  });
});

app.post('/api/feedback', (req, res) => {
  const { id, customerName, contactInfo, feedbackType, comment, reservationId, tags } = req.body;
  db.run(`INSERT INTO feedback (id, customerName, contactInfo, feedbackType, comment, reservationId, tags) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
  [id, customerName, contactInfo, feedbackType, comment, reservationId, JSON.stringify(tags || [])], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Feedback saved to DB." });
  });
});

app.post('/api/announcements', (req, res) => {
  const { id, title, content, type, isActive, expiresAt } = req.body;
  db.run(`INSERT INTO announcements (id, title, content, type, isActive, expiresAt) VALUES (?, ?, ?, ?, ?, ?)`, 
  [id, title, content, type, isActive ? 1 : 0, expiresAt], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Announcement added to DB." });
  });
});

app.put('/api/announcements/:id', (req, res) => {
  const id = req.params.id;
  const { title, content, type, isActive, expiresAt } = req.body;
  let updates = [], params = [];
  if (title) { updates.push("title = ?"); params.push(title); }
  if (content) { updates.push("content = ?"); params.push(content); }
  if (type) { updates.push("type = ?"); params.push(type); }
  if (isActive !== undefined) { updates.push("isActive = ?"); params.push(isActive ? 1 : 0); }
  if (expiresAt !== undefined) { updates.push("expiresAt = ?"); params.push(expiresAt); }
  if (updates.length === 0) return res.json({ message: "Nothing to update" });
  params.push(id);
  db.run(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Announcement updated." });
  });
});

app.delete('/api/announcements/:id', (req, res) => {
  db.run(`DELETE FROM announcements WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Announcement deleted." });
  });
});


app.listen(PORT, () => {
  console.log(`\n🎱 One Shot Edge Server is running on http://localhost:${PORT}`);
});