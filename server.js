// ==========================================
// ONE SHOT BAR & BILLIARDS: LOCAL EDGE SERVER
// ==========================================
import express from 'express';
import cors from 'cors';
import sqlite3Pkg from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

// 🟢 NEW: Missing Supabase Import
import { createClient } from '@supabase/supabase-js';

const sqlite3 = sqlite3Pkg.verbose();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// 🟢 NEW: Define your Supabase credentials (replace with your actual strings)
const SUPABASE_URL = 'https://bqnswmjopwmvunzchqzl.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_7t0VexQXO8D0Gqk0n4StIg_IeVefuXa';

// Initialize your cloud connection 
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// 🟢 Phase 4: The Dead Man's Switch Heartbeat
setInterval(async () => {
  try {
    const { error } = await supabase
      .from('system_status')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', 1);

    if (error) throw error;
    // console.log(`[Heartbeat] Pinged cloud at ${new Date().toLocaleTimeString()}`);
  } catch (err) {
    // If the internet goes down, it will quietly fail here without crashing the server
    console.log('[Heartbeat Alert] Failed to reach Supabase. Venue might be offline.');
  }
}, 60000); // Runs every 60,000 milliseconds (1 minute)

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
    db.configure('busyTimeout', 5000);
    
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS systemSettings (keyName TEXT PRIMARY KEY, settingValue TEXT, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP)`);
      db.run(`CREATE TABLE IF NOT EXISTS cms (keyName TEXT PRIMARY KEY, settingValue TEXT, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP)`);
      db.run(`CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, mimeType TEXT, data BLOB)`);
      db.run(`CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY, username TEXT, password TEXT, fullName TEXT, email TEXT, role TEXT, phone TEXT, joinedDate TEXT, avatarImg TEXT, isActive INTEGER DEFAULT 1, isAdmin INTEGER DEFAULT 0)`);
      db.run(`ALTER TABLE staff ADD COLUMN recoveryPin TEXT`, (err) => {
      db.run(`ALTER TABLE tables ADD COLUMN sessionData TEXT`, () => {});
      
      db.run(`INSERT OR IGNORE INTO systemSettings (keyName, settingValue) SELECT key_name, setting_value FROM system_settings`, (err) => {
        if (!err) {
          db.run(`DELETE FROM systemSettings WHERE keyName LIKE '%_%'`);
          db.run(`DROP TABLE IF EXISTS system_settings`);
        }
      });
      db.run(`INSERT OR IGNORE INTO cms (keyName, settingValue) SELECT key_name, content_value FROM cms_content`, (err) => {
        if (!err) db.run(`DROP TABLE IF EXISTS cms_content`);
      });

      db.run(`ALTER TABLE closed_dates ADD COLUMN type TEXT DEFAULT 'specific'`, () => {});
      db.run(`ALTER TABLE closed_dates ADD COLUMN day_of_week INTEGER`, () => {});
      db.run(`ALTER TABLE events ADD COLUMN allowReservations INTEGER DEFAULT 1`, () => {});
      db.run(`ALTER TABLE events ADD COLUMN caterWalkIns INTEGER DEFAULT 1`, () => {});
      db.run(`ALTER TABLE events ADD COLUMN walkInTableCount INTEGER DEFAULT 10`, () => {});
      db.run(`ALTER TABLE staff ADD COLUMN isFirstLogin INTEGER DEFAULT 1`, (err) => {});
      // 🟢 NEW: Lost & Found and Watchlist Tables
     // 🟢 NEW: Lost & Found and Watchlist Tables
// 🟢 NEW: Lost & Found and Watchlist Tables (with Soft Delete & Evidence Link)
      db.run(`CREATE TABLE IF NOT EXISTS lost_and_found (id TEXT PRIMARY KEY, itemName TEXT, description TEXT, foundDate DATETIME, status TEXT, image TEXT, claimedBy TEXT, claimedDate DATETIME, isArchived INTEGER DEFAULT 0)`);
      db.run(`CREATE TABLE IF NOT EXISTS watchlist (id TEXT PRIMARY KEY, name TEXT, reason TEXT, description TEXT, status TEXT, evidenceLink TEXT, dateAdded DATETIME, resolvedDate DATETIME, isArchived INTEGER DEFAULT 0)`);
      
      // Alter existing tables just in case they were already created in the previous step
      db.run(`ALTER TABLE lost_and_found ADD COLUMN isArchived INTEGER DEFAULT 0`, () => {});
      db.run(`ALTER TABLE watchlist ADD COLUMN isArchived INTEGER DEFAULT 0`, () => {});
      db.run(`ALTER TABLE watchlist ADD COLUMN evidenceLink TEXT`, () => {});

      db.run(`CREATE TABLE IF NOT EXISTS session_history (id TEXT PRIMARY KEY, customerName TEXT, tableId TEXT, tableName TEXT, startTime DATETIME, endTime DATETIME, durationMinutes INTEGER, totalAmount REAL, amountPaid REAL, orders TEXT)`);

      // 🟢 UPDATED: 'admin123' is now replaced with its SHA-256 hash
      const createSuperAdmin = `
        INSERT INTO staff (id, username, password, fullName, email, role, phone, joinedDate, isActive, isAdmin, recoveryPin)
        SELECT 'admin_001', 'superadmin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'System Administrator', 'admin@oneshot.local', 'Super Admin', '00000000000', datetime('now'), 1, 1, '8492'
        WHERE NOT EXISTS (SELECT 1 FROM staff WHERE username = 'superadmin')
      `;
      db.run(createSuperAdmin);

      const makeImmortal = `
        CREATE TRIGGER IF NOT EXISTS prevent_superadmin_deletion
        BEFORE DELETE ON staff
        FOR EACH ROW
        WHEN OLD.username = 'superadmin'
        BEGIN
            SELECT RAISE(ABORT, 'CRITICAL SECURITY ALERT: The Master Super Admin account cannot be deleted from the database.');
        END;
      `;
      db.run(makeImmortal);
    });
    });
  }
});

// ==========================================
// 🚀 READ ROUTES (GET) 
// ==========================================
app.get('/api/staff', (req, res) => {
    db.all(`SELECT * FROM staff`, [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map(r => ({ ...r, isActive: r.isActive === 1, isAdmin: r.isAdmin === 1 })));
    });
});

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
      id: r.id, date: r.closed_date, type: r.type || 'specific', dayOfWeek: r.day_of_week,
      reason: r.reason, isFullDay: r.is_full_day === 1, openTime: r.open_time, closeTime: r.close_time
    })));
  });
});

app.get('/api/tables', (req, res) => {
  db.all(`SELECT * FROM tables`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ ...r, isActive: r.isActive === 1, session: r.sessionData ? JSON.parse(r.sessionData) : undefined })));
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
    res.json(rows.map(e => ({ 
      ...e, 
      slotsFull: e.slotsFull === 1, 
      allowReservations: e.allowReservations !== 0,
      caterWalkIns: e.caterWalkIns !== 0,
      walkInTableCount: e.walkInTableCount ?? 10,
      attachments: e.attachments ? [e.attachments] : [] 
    })));
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

app.get('/api/session-history', (req, res) => {
  db.all(`SELECT * FROM session_history ORDER BY endTime DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ ...r, orders: r.orders ? JSON.parse(r.orders) : [] })));
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

// 🟢 NEW: Lost & Found and Watchlist GET Routes
app.get('/api/lost-and-found', (req, res) => {
  db.all(`SELECT * FROM lost_and_found ORDER BY foundDate DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ ...r, isArchived: r.isArchived === 1 })));
  });
});

app.get('/api/watchlist', (req, res) => {
  db.all(`SELECT * FROM watchlist ORDER BY dateAdded DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ ...r, isArchived: r.isArchived === 1 })));
  });
});


// ==========================================
// 📥 WRITE ROUTES (POST/PUT/DELETE) 
// ==========================================
// ==========================================
// ☁️ CLOUD SYNC ROUTE (Triggered by Admin Saves)
// ==========================================
app.post('/api/sync-to-cloud', async (req, res) => {
  console.log('☁️ Initiating forced cloud sync for Vercel...');
  
  try {
    // 1. Sync CMS (Site Settings)
    db.all(`SELECT keyName, settingValue FROM cms`, [], async (err, rows) => {
      if (err) return console.error('Local CMS read error:', err.message);
      if (rows && rows.length > 0) {
        // Formats local SQLite data to match your Supabase schema
        const payload = rows.map(r => ({ key_name: r.keyName, content_value: r.settingValue }));
        
        const { error } = await supabase
          .from('cms_content')
          .upsert(payload, { onConflict: 'key_name' });
          
        if (error) console.error('❌ Supabase CMS Sync Error:', error.message);
        else console.log('✅ CMS synced to cloud.');
      }
    });

    // 2. Sync System Settings (Policy & Rates)
    db.all(`SELECT keyName, settingValue FROM systemSettings`, [], async (err, rows) => {
      if (err) return console.error('Local Rates read error:', err.message);
      if (rows && rows.length > 0) {
        // Formats local SQLite data to match your Supabase schema
        const payload = rows.map(r => ({ key_name: r.keyName, setting_value: r.settingValue }));
        
        const { error } = await supabase
          .from('system_settings')
          .upsert(payload, { onConflict: 'key_name' });
          
        if (error) console.error('❌ Supabase Rates Sync Error:', error.message);
        else console.log('✅ Policy & Rates synced to cloud.');
      }
    });

    // Send immediate response back to frontend so the UI doesn't hang
    res.status(200).json({ message: 'Cloud sync dispatched successfully.' });

  } catch (err) {
    console.error('❌ Critical Cloud Sync Failure:', err);
    res.status(500).json({ error: 'Failed to dispatch cloud sync.' });
  }
});

// 🟢 NEW: Lost & Found and Watchlist Write Routes
app.post('/api/lost-and-found', (req, res) => {
  const { id, itemName, description, foundDate, status, image, claimedBy, claimedDate } = req.body;
  db.run(`INSERT INTO lost_and_found (id, itemName, description, foundDate, status, image, claimedBy, claimedDate, isArchived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
  [id, itemName, description, foundDate, status, image, claimedBy, claimedDate], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Lost item added." });
  });
});

app.put('/api/lost-and-found/:id', (req, res) => {
  const { itemName, description, status, image, claimedBy, claimedDate, isArchived } = req.body;
  let updates = [], params = [];
  if (itemName !== undefined) { updates.push("itemName = ?"); params.push(itemName); }
  if (description !== undefined) { updates.push("description = ?"); params.push(description); }
  if (status !== undefined) { updates.push("status = ?"); params.push(status); }
  if (image !== undefined) { updates.push("image = ?"); params.push(image); }
  if (claimedBy !== undefined) { updates.push("claimedBy = ?"); params.push(claimedBy); }
  if (claimedDate !== undefined) { updates.push("claimedDate = ?"); params.push(claimedDate); }
  if (isArchived !== undefined) { updates.push("isArchived = ?"); params.push(isArchived ? 1 : 0); }
  if (updates.length === 0) return res.json({ message: "Nothing to update" });
  params.push(req.params.id);
  db.run(`UPDATE lost_and_found SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Lost item updated." });
  });
});

// SOFT DELETE
app.delete('/api/lost-and-found/:id', (req, res) => {
  db.run(`UPDATE lost_and_found SET isArchived = 1 WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Lost item archived." });
  });
});

app.post('/api/watchlist', (req, res) => {
  const { id, name, reason, description, status, evidenceLink, dateAdded, resolvedDate } = req.body;
  db.run(`INSERT INTO watchlist (id, name, reason, description, status, evidenceLink, dateAdded, resolvedDate, isArchived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
  [id, name, reason, description, status, evidenceLink, dateAdded, resolvedDate], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Watchlist item added." });
  });
});

app.put('/api/watchlist/:id', (req, res) => {
  const { name, reason, description, status, evidenceLink, resolvedDate, isArchived } = req.body;
  let updates = [], params = [];
  if (name !== undefined) { updates.push("name = ?"); params.push(name); }
  if (reason !== undefined) { updates.push("reason = ?"); params.push(reason); }
  if (description !== undefined) { updates.push("description = ?"); params.push(description); }
  if (status !== undefined) { updates.push("status = ?"); params.push(status); }
  if (evidenceLink !== undefined) { updates.push("evidenceLink = ?"); params.push(evidenceLink); }
  if (resolvedDate !== undefined) { updates.push("resolvedDate = ?"); params.push(resolvedDate); }
  if (isArchived !== undefined) { updates.push("isArchived = ?"); params.push(isArchived ? 1 : 0); }
  if (updates.length === 0) return res.json({ message: "Nothing to update" });
  params.push(req.params.id);
  db.run(`UPDATE watchlist SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Watchlist item updated." });
  });
});

// SOFT DELETE
app.delete('/api/watchlist/:id', (req, res) => {
  db.run(`UPDATE watchlist SET isArchived = 1 WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Watchlist item archived." });
  });
});

app.post('/api/session-history', (req, res) => {
  const { id, customerName, tableId, tableName, startTime, endTime, durationMinutes, totalAmount, amountPaid, orders } = req.body;
  db.run(`INSERT INTO session_history (id, customerName, tableId, tableName, startTime, endTime, durationMinutes, totalAmount, amountPaid, orders) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [id, customerName, tableId, tableName, startTime, endTime, durationMinutes, totalAmount, amountPaid, JSON.stringify(orders || [])], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Session history logged." });
  });
});

app.post('/api/promo-codes', (req, res) => {
  const { id, code, discountPercent, description, isActive, isLimitedUses, maxUsage, startDate, expiresAt } = req.body;
  db.run(`INSERT INTO promo_codes (id, code, discount_percent, description, is_active, is_limited_uses, max_usage, start_date, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
  [id, code, discountPercent, description, isActive ? 1 : 0, isLimitedUses ? 1 : 0, maxUsage, startDate, expiresAt], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Promo added to DB." });
  });
});

app.put('/api/promo-codes/:id', (req, res) => {
  const { code, discountPercent, description, isActive, isLimitedUses, maxUsage, startDate, expiresAt } = req.body;
  let updates = [], params = [];
  if (code !== undefined) { updates.push("code = ?"); params.push(code); }
  if (discountPercent !== undefined) { updates.push("discount_percent = ?"); params.push(discountPercent); }
  if (description !== undefined) { updates.push("description = ?"); params.push(description); }
  if (isActive !== undefined) { updates.push("is_active = ?"); params.push(isActive ? 1 : 0); }
  if (isLimitedUses !== undefined) { updates.push("is_limited_uses = ?"); params.push(isLimitedUses ? 1 : 0); }
  if (maxUsage !== undefined) { updates.push("max_usage = ?"); params.push(maxUsage); }
  if (startDate !== undefined) { updates.push("start_date = ?"); params.push(startDate); }
  if (expiresAt !== undefined) { updates.push("expires_at = ?"); params.push(expiresAt); }
  if (updates.length === 0) return res.json({ message: "Nothing to update" });
  params.push(req.params.id);
  db.run(`UPDATE promo_codes SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
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

app.delete('/api/tables/:id', (req, res) => {
  db.run(`DELETE FROM tables WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Table deleted." });
  });
});

app.delete('/api/inventory/:id', (req, res) => {
  db.run(`DELETE FROM inventory WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Inventory item deleted." });
  });
});

app.post('/api/closed-dates', (req, res) => {
  const { id, date, type, dayOfWeek, reason, isFullDay, openTime, closeTime } = req.body;
  db.run(
    `INSERT INTO closed_dates (id, closed_date, type, day_of_week, reason, is_full_day, open_time, close_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
    [id, date || '', type || 'specific', dayOfWeek !== undefined ? dayOfWeek : null, reason, isFullDay ? 1 : 0, openTime, closeTime], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Closed date added to DB." });
    }
  );
});

app.put('/api/closed-dates/:id', (req, res) => {
  const { date, type, dayOfWeek, reason, isFullDay, openTime, closeTime } = req.body;
  let updates = [], params = [];
  if (date !== undefined) { updates.push("closed_date = ?"); params.push(date); }
  if (type !== undefined) { updates.push("type = ?"); params.push(type); }
  if (dayOfWeek !== undefined) { updates.push("day_of_week = ?"); params.push(dayOfWeek); }
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
  const { id, title, date, type, description, registrationLink, maxParticipants, slotsFull, attachments, allowReservations, caterWalkIns, walkInTableCount } = req.body;
  const attString = attachments && attachments.length > 0 ? attachments[0] : null;
  db.run(`INSERT INTO events (id, title, date, type, description, registrationLink, maxParticipants, slotsFull, attachments, allowReservations, caterWalkIns, walkInTableCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
  [id, title, date, type, description, registrationLink, maxParticipants, slotsFull ? 1 : 0, attString, allowReservations === false ? 0 : 1, caterWalkIns === false ? 0 : 1, walkInTableCount ?? 10], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Event added to DB." });
  });
});

app.put('/api/events/:id', (req, res) => {
  const { title, date, type, description, duration, registrationLink, maxParticipants, slotsFull, attachments, allowReservations, caterWalkIns, walkInTableCount } = req.body;
  let updates = [], params = [];
  if (title !== undefined) { updates.push("title = ?"); params.push(title); }
  if (date !== undefined) { updates.push("date = ?"); params.push(date); }
  if (type !== undefined) { updates.push("type = ?"); params.push(type); }
  if (description !== undefined) { updates.push("description = ?"); params.push(description); }
  if (duration !== undefined) { updates.push("duration = ?"); params.push(duration); }
  if (registrationLink !== undefined) { updates.push("registrationLink = ?"); params.push(registrationLink); }
  if (maxParticipants !== undefined) { updates.push("maxParticipants = ?"); params.push(maxParticipants); }
  if (slotsFull !== undefined) { updates.push("slotsFull = ?"); params.push(slotsFull ? 1 : 0); }
  if (allowReservations !== undefined) { updates.push("allowReservations = ?"); params.push(allowReservations ? 1 : 0); }
  if (caterWalkIns !== undefined) { updates.push("caterWalkIns = ?"); params.push(caterWalkIns ? 1 : 0); }
  if (walkInTableCount !== undefined) { updates.push("walkInTableCount = ?"); params.push(walkInTableCount); }
  if (attachments !== undefined) { updates.push("attachments = ?"); params.push(attachments && attachments.length > 0 ? attachments[0] : null); }
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
  const { status, session, isActive, name, maintenanceReason } = req.body;
  const sessionData = session ? JSON.stringify(session) : null;
  let updates = [], params = [];
  if (status !== undefined) { updates.push("status = ?"); params.push(status); }
  if (session !== undefined || req.body.hasOwnProperty('session')) { updates.push("sessionData = ?"); params.push(sessionData); }
  if (isActive !== undefined) { updates.push("isActive = ?"); params.push(isActive ? 1 : 0); }
  if (name !== undefined) { updates.push("name = ?"); params.push(name); }
  if (maintenanceReason !== undefined) { updates.push("maintenanceReason = ?"); params.push(maintenanceReason); }
  if (updates.length === 0) return res.json({ message: "Nothing to update" });
  params.push(req.params.id);
  db.run(`UPDATE tables SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Table updated successfully." });
  });
});

app.post('/api/queue', (req, res) => {
  const { id, customerName, contactNumber, partySize, status, queueNumber, notes } = req.body;
  db.run(`INSERT INTO queue (id, customerName, contactNumber, partySize, status, queueNumber, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
  [id, customerName, contactNumber, partySize, status, queueNumber, notes || ''], function(err) {
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
  db.run(`INSERT INTO reservations (id, customerName, contactNumber, email, date, timeSlot, durationHours, partySize, status, totalAmount, downPaymentAmount, downPaymentPaid, balancePaid, paymentRef, receiptImg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
  [id, customerName, contactNumber, email, date, timeSlot, durationHours, partySize, status, totalAmount, downPaymentAmount, downPaymentPaid ? 1 : 0, balancePaid ? 1 : 0, paymentRef, receiptImg], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Reservation created successfully', id: id });
  });
});

app.put('/api/reservations/:id', (req, res) => {
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
  params.push(req.params.id);
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
  const { name, category, price, stock, isActive } = req.body;
  let updates = [], params = [];
  if (name !== undefined) { updates.push("name = ?"); params.push(name); }
  if (category !== undefined) { updates.push("category = ?"); params.push(category); }
  if (price !== undefined) { updates.push("price = ?"); params.push(price); }
  if (stock !== undefined) { updates.push("stock = ?"); params.push(stock); }
  if (isActive !== undefined) { updates.push("isActive = ?"); params.push(isActive ? 1 : 0); }
  if (updates.length === 0) return res.json({ message: "Nothing to update" });
  params.push(req.params.id);
  db.run(`UPDATE inventory SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Inventory updated in DB." });
  });
});

app.put('/api/settings/rates', (req, res) => {
  const payload = req.body;
  const keys = Object.keys(payload);
  if (keys.length === 0) return res.json({ message: "No rates to update" });
  let index = 0; let errors = [];
  const processNextKey = () => {
    if (index >= keys.length) {
      if (errors.length > 0) return res.status(500).json({ error: "Some rates failed to save.", details: errors });
      return res.json({ message: "Rates updated successfully." });
    }
    const key = keys[index];
    const value = typeof payload[key] === 'boolean' ? String(payload[key]) : (payload[key] ?? '').toString();
    db.run(`INSERT INTO systemSettings (keyName, settingValue) VALUES (?, ?) ON CONFLICT(keyName) DO UPDATE SET settingValue = excluded.settingValue, updatedAt = CURRENT_TIMESTAMP`, [key, value], function(err) {
      if (err) { errors.push({ key, error: err.message }); }
      index++; processNextKey();
    });
  };
  processNextKey();
});

app.put('/api/settings/terms', (req, res) => {
  const payload = req.body;
  const keys = Object.keys(payload);
  if (keys.length === 0) return res.json({ message: "No terms to update" });
  let index = 0; let errors = [];
  const processNextKey = () => {
    if (index >= keys.length) {
      if (errors.length > 0) return res.status(500).json({ error: "Some terms failed to save.", details: errors });
      return res.json({ message: "Terms updated successfully." });
    }
    const key = keys[index];
    const value = typeof payload[key] === 'boolean' ? String(payload[key]) : (payload[key] ?? '').toString();
    db.run(`INSERT INTO systemSettings (keyName, settingValue) VALUES (?, ?) ON CONFLICT(keyName) DO UPDATE SET settingValue = excluded.settingValue, updatedAt = CURRENT_TIMESTAMP`, [key, value], function(err) {
      if (err) { errors.push({ key, error: err.message }); }
      index++; processNextKey();
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

app.post('/api/staff', (req, res) => {
  const { id, username, password, fullName, email, role, phone, joinedDate, isActive, isAdmin, recoveryPin } = req.body;
  db.run(`INSERT INTO staff (id, username, password, fullName, email, role, phone, joinedDate, isActive, isAdmin, recoveryPin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [id, username, password, fullName, email, role, phone, joinedDate, isActive ? 1 : 0, isAdmin ? 1 : 0, recoveryPin || null], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Staff added to DB." });
  });
});

app.put('/api/staff/:identifier', (req, res) => {
  // 🟢 FIX: Added recoveryPin and isAdmin to the destructured body
  const { username, fullName, email, phone, password, avatarImg, isActive, role, isAdmin, recoveryPin } = req.body;
  let updates = [], params = [];
  
  if (username !== undefined) { updates.push("username = ?"); params.push(username); }
  if (fullName !== undefined) { updates.push("fullName = ?"); params.push(fullName); }
  if (email !== undefined) { updates.push("email = ?"); params.push(email); }
  if (phone !== undefined) { updates.push("phone = ?"); params.push(phone); }
  if (password !== undefined) { updates.push("password = ?"); params.push(password); }
  if (avatarImg !== undefined) { updates.push("avatarImg = ?"); params.push(avatarImg); }
  if (isActive !== undefined) { updates.push("isActive = ?"); params.push(isActive ? 1 : 0); }
  if (role !== undefined) { updates.push("role = ?"); params.push(role); }
  
  // 🟢 FIX: Push the new fields into the SQL update array if they are provided
  if (isAdmin !== undefined) { updates.push("isAdmin = ?"); params.push(isAdmin ? 1 : 0); }
  if (recoveryPin !== undefined) { updates.push("recoveryPin = ?"); params.push(recoveryPin); }
  
  if (updates.length === 0) return res.json({ message: "Nothing to update" });
  
  params.push(req.params.identifier);
  params.push(req.params.identifier);
  
  db.run(`UPDATE staff SET ${updates.join(', ')} WHERE id = ? OR username = ?`, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Profile updated successfully." });
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
  const { title, content, type, isActive, expiresAt } = req.body;
  let updates = [], params = [];
  if (title) { updates.push("title = ?"); params.push(title); }
  if (content) { updates.push("content = ?"); params.push(content); }
  if (type) { updates.push("type = ?"); params.push(type); }
  if (isActive !== undefined) { updates.push("isActive = ?"); params.push(isActive ? 1 : 0); }
  if (expiresAt !== undefined) { updates.push("expiresAt = ?"); params.push(expiresAt); }
  if (updates.length === 0) return res.json({ message: "Nothing to update" });
  params.push(req.params.id);
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
  let index = 0; let errors = [];
  const processNextKey = () => {
    if (index >= keys.length) {
      if (errors.length > 0) return res.status(500).json({ error: "Some CMS settings failed to save.", details: errors });
      return res.json({ message: "CMS synced successfully." });
    }
    const key = keys[index];
    let value = key === 'heroImages' ? JSON.stringify(payload[key]) : payload[key].toString();
    db.run(`INSERT INTO cms (keyName, settingValue) VALUES (?, ?) ON CONFLICT(keyName) DO UPDATE SET settingValue = excluded.settingValue, updatedAt = CURRENT_TIMESTAMP`, [key, value], function(err) {
      if (err) { errors.push({ key, error: err.message }); } 
      index++; processNextKey(); 
    });
  };
  processNextKey();
});

app.listen(PORT, () => {
  console.log(`\n🎱 One Shot Edge Server is running on http://localhost:${PORT}`);
});