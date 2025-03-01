const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./menu.db", (err) => {
  if (err) {
    console.error("Error connecting to database:", err.message);
    return;
  }

  console.log("Connected to SQLite database.");

  // ✅ เปิดใช้งาน Foreign Key Constraint
  db.run("PRAGMA foreign_keys = ON");

  // ✅ สร้างตาราง categories
  db.run(
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )`
  );

  // ✅ สร้างตาราง menu
  db.run(
    `CREATE TABLE IF NOT EXISTS menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      details TEXT NOT NULL,
      image TEXT,
      isAvailable BOOLEAN DEFAULT true,
      createdAt DATETIME DEFAULT (datetime('now')),
      updatedAt DATETIME DEFAULT (datetime('now')),
      categoryId INTEGER,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
    )`
  );

  // ✅ สร้างตาราง sales
  db.run(
    `CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menuId INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      totalPrice REAL NOT NULL,
      date DATE DEFAULT (date('now')),
      FOREIGN KEY (menuId) REFERENCES menu(id) ON DELETE CASCADE
    )`
  );

  // ✅ สร้างตาราง tables (เก็บสถานะของโต๊ะ)
  db.run(
    `CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number INTEGER UNIQUE NOT NULL,
      status TEXT DEFAULT 'available'  -- available, occupied
    )`
  );

  // ✅ สร้างตาราง qr_codes สำหรับ QR Code ของแต่ละโต๊ะ
  db.run(
    `CREATE TABLE IF NOT EXISTS qr_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number INTEGER UNIQUE NOT NULL,
      qr_code TEXT NOT NULL,
      FOREIGN KEY (table_number) REFERENCES tables(table_number) ON DELETE CASCADE
    )`
  );

  // ✅ สร้างตาราง orders
  db.run(
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending', -- pending, completed, cancelled
      createdAt DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (table_number) REFERENCES tables(table_number) ON DELETE CASCADE
    )`
  );

  // ✅ สร้างตาราง order_items (เก็บเมนูที่สั่งในออเดอร์)
  db.run(
    `CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_id) REFERENCES menu(id) ON DELETE CASCADE
    )`
  );

  // ✅ เติมข้อมูลพื้นฐานใน categories
  db.run(
    `INSERT OR IGNORE INTO categories (name) VALUES
      ('Drinks'),
      ('Food'),
      ('Desserts')`
  );

  // ✅ เติมข้อมูลพื้นฐานใน tables (โต๊ะ)
  for (let i = 1; i <= 10; i++) {
    db.run(`INSERT OR IGNORE INTO tables (table_number, status) VALUES (?, 'available')`, [i]);
  }

  console.log("✅ Database setup completed.");
});

module.exports = db;
