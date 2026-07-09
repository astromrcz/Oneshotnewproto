// ==========================================
// ONE SHOT BAR & BILLIARDS: LOCAL EDGE SERVER
// ==========================================
import express from 'express';
import cors from 'cors';
import sqlite3Pkg from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const sqlite3 = sqlite3Pkg.verbose();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Store uploaded files in Node memory temporarily so we can save them as BLOBs
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors()); 
// 🚨 CRITICAL: This must be the ONLY express.json() call in your file!
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const dbPath = path.resolve(__dirname, 'oneshot.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('❌ Error connecting to SQLite database:', err.message);
  else {
    console.log('✅ Connected to local SQLite database (Direct Match Mode active).');
    
    // Set a busy timeout to help with concurrent access
    db.configure('busyTimeout', 5000);
    
    // 🟢 DATABASE INITIALIZATION & DUPLICATE CLEANUP (Properly Serialized)
    db.serialize(() => {
      // Step 1: Create main tables
      db.run(`CREATE TABLE IF NOT EXISTS systemSettings (keyName TEXT PRIMARY KEY, settingValue TEXT, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP)`, (err) => {
        if (err) console.error('Error creating systemSettings table:', err);
      });
      
      db.run(`CREATE TABLE IF NOT EXISTS cms (keyName TEXT PRIMARY KEY, settingValue TEXT, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP)`, (err) => {
        if (err) console.error('Error creating cms table:', err);
      });
      
      db.run(`CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, mimeType TEXT, data BLOB)`, (err) => {
        if (err) console.error('Error creating images table:', err);
      });
      
      // Step 2: Try to add sessionData column if it doesn't exist (will fail silently if exists)
      db.run(`ALTER TABLE tables ADD COLUMN sessionData TEXT`, (err) => {
        // Ignore error - column likely already exists
      });

      // Step 3: Merge and cleanup old snake_case tables if they exist
      db.run(`INSERT OR IGNORE INTO systemSettings (keyName, settingValue) SELECT key_name, setting_value FROM system_settings`, (err) => {
        // Ignore errors if source table doesn't exist
        if (!err) {
          db.run(`DELETE FROM systemSettings WHERE keyName LIKE '%_%'`);
          db.run(`DROP TABLE IF EXISTS system_settings`);
        }
      });

      db.run(`INSERT OR IGNORE INTO cms (keyName, settingValue) SELECT key_name, content_value FROM cms_content`, (err) => {
        // Ignore errors if source table doesn't exist
        if (!err) {
          db.run(`DROP TABLE IF EXISTS cms_content`);
        }
      });
    });
  }
});

// ==========================================
// 🚀 READ ROUTES (GET) 
// ==========================================
app.get('/api/promo-codes', (req, res) => {
  db.all(`SELECT * FROM promo_codes`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({
      id: r.id, code: r.code, discountPercent: r.discount_percent, description: r.description,
      isActive: r.is_active === 1, isLimitedUses: r.is_limited_uses === 1, maxUsage: r.max_usage,
      usageCount: r.usage_count, startDate: r.start_date, expiresAt: r.expires_at
    })));
  });
});

app.get('/api/images/:id', (req, res) => {
  db.get(`SELECT mimeType, data FROM images WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).send('Image not found');
    
    res.setHeader('Content-Type', row.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); 
    res.send(row.data); 
  });
});

app.get('/api/closed-dates', (req, res) => {
  db.all(`SELECT * FROM closed_dates ORDER BY closed_date ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({
      id: r.id,
      date: r.closed_date,
      reason: r.reason,
      isFullDay: r.is_full_day === 1,
      openTime: r.open_time,
      closeTime: r.close_time
    })));
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

app.get('/api/activities', (req, res) => {
  db.run(`CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY, type TEXT, description TEXT, timestamp DATETIME, metadata TEXT)`, () => {
    db.all(`SELECT * FROM activities ORDER BY timestamp DESC LIMIT 200`, [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map(r => ({ ...r, metadata: r.metadata ? JSON.parse(r.metadata) : undefined })));
    });
  });
})

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


app.post('/api/promo-codes', (req, res) => {
  const { id, code, discountPercent, description, isActive, isLimitedUses, maxUsage, startDate, expiresAt } = req.body;
  db.run(`INSERT INTO promo_codes (id, code, discount_percent, description, is_active, is_limited_uses, max_usage, start_date, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
  [id, code, discountPercent, description, isActive ? 1 : 0, isLimitedUses ? 1 : 0, maxUsage, startDate, expiresAt], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Promo added to DB." });
  });
});

app.put('/api/promo-codes/:id', (req, res) => {
  const { isActive } = req.body;
  db.run(`UPDATE promo_codes SET is_active = ? WHERE id = ?`, [isActive ? 1 : 0, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Promo updated." });
  });
});

app.delete('/api/promo-codes/:id', (req, res) => {
  db.run(`DELETE FROM promo_codes WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Promo deleted." });
  });
});

app.post('/api/images', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  
  const id = 'img_' + Date.now() + '_' + Math.round(Math.random() * 1000);
  
  db.run(
    `INSERT INTO images (id, mimeType, data) VALUES (?, ?, ?)`, 
    [id, req.file.mimetype, req.file.buffer], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ url: `http://localhost:3001/api/images/${id}` });
    }
  );
});

app.post('/api/tables', (req, res) => {
  const { id, name, status, isActive } = req.body;
  const sql = `INSERT INTO tables (id, name, status, isActive) VALUES (?, ?, ?, ?)`;
  db.run(sql, [id, name, status || 'available', isActive ? 1 : 0], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Table created successfully', id: id });
  });
});

app.post('/api/closed-dates', (req, res) => {
  const { id, date, reason, isFullDay, openTime, closeTime } = req.body;
  db.run(
    `INSERT INTO closed_dates (id, closed_date, reason, is_full_day, open_time, close_time) VALUES (?, ?, ?, ?, ?, ?)`, 
    [id, date, reason, isFullDay ? 1 : 0, openTime, closeTime], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Closed date added to DB." });
    }
  );
});

app.put('/api/closed-dates/:id', (req, res) => {
  const { date, reason, isFullDay, openTime, closeTime } = req.body;
  let updates = [], params = [];
  
  if (date !== undefined) { updates.push("closed_date = ?"); params.push(date); }
  if (reason !== undefined) { updates.push("reason = ?"); params.push(reason); }
  if (isFullDay !== undefined) { updates.push("is_full_day = ?"); params.push(isFullDay ? 1 : 0); }
  if (openTime !== undefined) { updates.push("open_time = ?"); params.push(openTime); }
  if (closeTime !== undefined) { updates.push("close_time = ?"); params.push(closeTime); }
  
  if (updates.length === 0) return res.json({ message: "Nothing to update" });
  params.push(req.params.id);
  
  db.run(`UPDATE closed_dates SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Closed date updated in DB." });
  });
});

app.delete('/api/closed-dates/:id', (req, res) => {
  db.run(`DELETE FROM closed_dates WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Closed date deleted from DB." });
  });
});

app.post('/api/events', (req, res) => {
  const { id, title, date, type, description, registrationLink, maxParticipants, slotsFull, attachments } = req.body;
  const attString = attachments && attachments.length > 0 ? attachments[0] : null;
  db.run(`INSERT INTO events (id, title, date, type, description, registrationLink, maxParticipants, slotsFull, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
  [id, title, date, type, description, registrationLink, maxParticipants, slotsFull ? 1 : 0, attString], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Event added to DB." });
  });
});

app.put('/api/events/:id', (req, res) => {
  const { title, date, type, description, duration, registrationLink, maxParticipants, slotsFull, attachments } = req.body;
  let updates = [], params = [];
  
  if (title !== undefined) { updates.push("title = ?"); params.push(title); }
  if (date !== undefined) { updates.push("date = ?"); params.push(date); }
  if (type !== undefined) { updates.push("type = ?"); params.push(type); }
  if (description !== undefined) { updates.push("description = ?"); params.push(description); }
  if (duration !== undefined) { updates.push("duration = ?"); params.push(duration); }
  if (registrationLink !== undefined) { updates.push("registrationLink = ?"); params.push(registrationLink); }
  if (maxParticipants !== undefined) { updates.push("maxParticipants = ?"); params.push(maxParticipants); }
  if (slotsFull !== undefined) { updates.push("slotsFull = ?"); params.push(slotsFull ? 1 : 0); }
  if (attachments !== undefined) { 
    updates.push("attachments = ?"); 
    // 🟢 Grabs the first image from the array to save in the DB
    params.push(attachments && attachments.length > 0 ? attachments[0] : null); 
  }
  
  if (updates.length === 0) return res.json({ message: "Nothing to update" });
  params.push(req.params.id);
  
  db.run(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Event updated." });
  });
});

app.delete('/api/events/:id', (req, res) => {
  db.run(`DELETE FROM events WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Event deleted." });
  });
});

app.put('/api/tables/:id', (req, res) => {
  const { status, session, isActive, name } = req.body;
  const sessionData = session ? JSON.stringify(session) : null;
  
  let updates = [];
  let params = [];
  
  if (status !== undefined) { updates.push("status = ?"); params.push(status); }
  if (session !== undefined || req.body.hasOwnProperty('session')) { 
    updates.push("sessionData = ?"); 
    params.push(sessionData); 
  }
  if (isActive !== undefined) { updates.push("isActive = ?"); params.push(isActive ? 1 : 0); }
  if (name !== undefined) { updates.push("name = ?"); params.push(name); }
  
  if (updates.length === 0) return res.json({ message: "Nothing to update" });
  params.push(req.params.id);
  
  db.run(`UPDATE tables SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Table updated successfully." });
  });
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
  const { date, timeSlot, status, downPaymentPaid, balancePaid, cancellationReason, tableId } = req.body;
  
  let updates = [], params = [];
  
  if (date !== undefined) { updates.push("date = ?"); params.push(date); }
  if (timeSlot !== undefined) { updates.push("timeSlot = ?"); params.push(timeSlot); }
  if (status !== undefined) { updates.push("status = ?"); params.push(status); }
  if (downPaymentPaid !== undefined) { updates.push("downPaymentPaid = ?"); params.push(downPaymentPaid ? 1 : 0); }
  if (balancePaid !== undefined) { updates.push("balancePaid = ?"); params.push(balancePaid ? 1 : 0); }
  if (cancellationReason !== undefined) { updates.push("cancellationReason = ?"); params.push(cancellationReason); }
  if (tableId !== undefined) { updates.push("tableId = ?"); params.push(tableId); }
  
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

// PUT or POST /api/settings/rates
app.put('/api/settings/rates', (req, res) => {
  const payload = req.body;
  const keys = Object.keys(payload);
  
  if (keys.length === 0) return res.json({ message: "No rates to update" });
  
  let index = 0;
  let errors = [];
  
  const processNextKey = () => {
    if (index >= keys.length) {
      if (errors.length > 0) return res.status(500).json({ error: "Some rates failed to save.", details: errors });
      return res.json({ message: "Rates updated successfully." });
    }
    
    const key = keys[index];
    // Convert boolean values to strings so SQLite can store them easily in the TEXT column
    const value = typeof payload[key] === 'boolean' ? String(payload[key]) : (payload[key] ?? '').toString();
    
    const sql = `INSERT INTO systemSettings (keyName, settingValue) VALUES (?, ?) ON CONFLICT(keyName) DO UPDATE SET settingValue = excluded.settingValue, updatedAt = CURRENT_TIMESTAMP`;
    
    db.run(sql, [key, value], function(err) {
      if (err) {
        console.error(`❌ DB Error saving rates [${key}]:`, err.message);
        errors.push({ key, error: err.message });
      }
      index++;
      processNextKey();
    });
  };
  
  processNextKey();
});

// PUT or POST /api/settings/terms
app.put('/api/settings/terms', (req, res) => {
  const payload = req.body;
  const keys = Object.keys(payload);
  
  if (keys.length === 0) return res.json({ message: "No terms to update" });
  
  let index = 0;
  let errors = [];
  
  const processNextKey = () => {
    if (index >= keys.length) {
      if (errors.length > 0) return res.status(500).json({ error: "Some terms failed to save.", details: errors });
      return res.json({ message: "Terms updated successfully." });
    }
    
    const key = keys[index];
    const value = typeof payload[key] === 'boolean' ? String(payload[key]) : (payload[key] ?? '').toString();
    
    const sql = `INSERT INTO systemSettings (keyName, settingValue) VALUES (?, ?) ON CONFLICT(keyName) DO UPDATE SET settingValue = excluded.settingValue, updatedAt = CURRENT_TIMESTAMP`;
    
    db.run(sql, [key, value], function(err) {
      if (err) {
        console.error(`❌ DB Error saving terms [${key}]:`, err.message);
        errors.push({ key, error: err.message });
      }
      index++;
      processNextKey();
    });
  };
  
  processNextKey();
});

app.post('/api/activities', (req, res) => {
  const { id, type, description, timestamp, metadata } = req.body;
  db.run(`CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY, type TEXT, description TEXT, timestamp DATETIME, metadata TEXT)`, () => {
    db.run(`INSERT INTO activities (id, type, description, timestamp, metadata) VALUES (?, ?, ?, ?, ?)`, 
    [id, type, description, timestamp, metadata ? JSON.stringify(metadata) : null], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Activity logged." });
    });
  });
});

// ==========================================
// 🟢 STAFF / USER PROFILE ROUTES
// ==========================================
app.put('/api/staff/:username', (req, res) => {
  const { fullName, email, phone, password, avatarImg } = req.body;
  let updates = [], params = [];
  
  if (fullName !== undefined) { updates.push("fullName = ?"); params.push(fullName); }
  if (email !== undefined) { updates.push("email = ?"); params.push(email); }
  if (phone !== undefined) { updates.push("phone = ?"); params.push(phone); }
  if (password !== undefined) { updates.push("password = ?"); params.push(password); }
  if (avatarImg !== undefined) { updates.push("avatarImg = ?"); params.push(avatarImg); }
  
  if (updates.length === 0) return res.json({ message: "Nothing to update" });
  params.push(req.params.username);
  
  // Auto-create table if missing
  db.run(`CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY, username TEXT, password TEXT, fullName TEXT, email TEXT, role TEXT, phone TEXT, joinedDate TEXT, avatarImg TEXT)`, () => {
     db.run(`UPDATE staff SET ${updates.join(', ')} WHERE username = ?`, params, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Profile updated successfully." });
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

app.put('/api/cms', (req, res) => {
  const payload = req.body;
  const keys = Object.keys(payload);
  
  if (keys.length === 0) return res.json({ message: "No CMS updates" });
  
  // Serialize database operations using a queue to prevent locking
  let index = 0;
  let errors = [];
  
  const processNextKey = () => {
    if (index >= keys.length) {
      // All operations completed
      if (errors.length > 0) {
        console.error('❌ Errors during CMS update:', errors);
        return res.status(500).json({ error: "Some CMS settings failed to save.", details: errors });
      }
      return res.json({ message: "CMS synced successfully." });
    }
    
    const key = keys[index];
    let value = key === 'heroImages' ? JSON.stringify(payload[key]) : payload[key].toString();
    
    const sql = `INSERT INTO cms (keyName, settingValue) VALUES (?, ?) ON CONFLICT(keyName) DO UPDATE SET settingValue = excluded.settingValue, updatedAt = CURRENT_TIMESTAMP`;
    
    db.run(sql, [key, value], function(err) {
      if (err) {
        console.error(`❌ DB Error saving CMS [${key}]:`, err.message);
        errors.push({ key, error: err.message });
      } else {
        console.log(`✅ Saved CMS [${key}]`);
      }
      index++;
      processNextKey(); // Process next key in queue
    });
  };
  
  processNextKey();
});

app.listen(PORT, () => {
  console.log(`\n🎱 One Shot Edge Server is running on http://localhost:${PORT}`);
});