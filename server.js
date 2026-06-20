import express from 'express';
import cors from 'cors';
import sqlite3Pkg from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const sqlite3 = sqlite3Pkg.verbose();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors()); 
app.use(express.json());

const dbPath = path.resolve(__dirname, 'oneshot.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('❌ Error connecting to SQLite database:', err.message);
  else console.log('✅ Connected to local SQLite database (Direct Match Mode active).');
});

// ==========================================
// 🚀 READ ROUTES (GET) 
// ==========================================

app.get('/api/tables', (req, res) => {
  db.all(`SELECT * FROM tables`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // SQLite stores booleans as 1 or 0, we quickly map them to true/false for React
    res.json(rows.map(r => ({ ...r, isActive: r.isActive === 1 })));
  });
});

app.get('/api/reservations', (req, res) => {
  db.all(`SELECT * FROM reservations ORDER BY createdAt DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ 
      ...r, 
      downPaymentPaid: r.downPaymentPaid === 1, 
      balancePaid: r.balancePaid === 1 
    })));
  });
});

app.get('/api/settings/rates', (req, res) => {
  db.all(`SELECT keyName, settingValue FROM systemSettings`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const config = {};
    rows.forEach(row => {
      let val = row.settingValue;
      // Clean string conversion without relying on regex parsing
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (!isNaN(val) && val.trim() !== '' && !val.includes(':')) val = Number(val);
      
      config[row.keyName] = val;
    });

    res.json(config);
  });
});

app.get('/api/inventory', (req, res) => {
  db.all(`SELECT * FROM inventory`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ ...r, isActive: r.isActive === 1 })));
  });
});

app.get('/api/queue', (req, res) => {
  db.all(`SELECT * FROM queue WHERE status = 'waiting' ORDER BY queueNumber ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/events', (req, res) => {
  db.all(`SELECT * FROM events`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(e => ({ 
      ...e, 
      slotsFull: e.slotsFull === 1,
      attachments: e.attachments ? [e.attachments] : [] 
    })));
  });
});

// ==========================================
// 📥 WRITE ROUTES (POST/PUT) 
// ==========================================

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
    res.json({ message: "Inventory item updated in DB." });
  });
});

// The UPSERT function now takes the EXACT keys React sends it and saves them cleanly
app.put('/api/settings/rates', (req, res) => {
  const payload = req.body;
  let completed = 0;
  const keys = Object.keys(payload);
  
  if (keys.length === 0) return res.json({ message: "No rates to update" });

  keys.forEach(key => {
    let value = payload[key];
    if (typeof value === 'boolean') value = value ? 'true' : 'false';
    else value = value !== null && value !== undefined ? value.toString() : '';

    const sql = `
      INSERT INTO systemSettings (keyName, settingValue) 
      VALUES (?, ?) 
      ON CONFLICT(keyName) DO UPDATE SET settingValue = excluded.settingValue, updatedAt = CURRENT_TIMESTAMP
    `;
    
    db.run(sql, [key, value], (err) => {
      if (err) console.error("DB UPSERT Error:", err);
      completed++;
      if (completed === keys.length) res.json({ message: "System settings successfully synced to DB." });
    });
  });
});

app.listen(PORT, () => {
  console.log(`\n🎱 One Shot Edge Server is running on http://localhost:${PORT}`);
});