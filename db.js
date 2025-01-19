const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const db = new sqlite3.Database("./menu.db", (err) => {
  if (err) {
    console.error("Error connecting to database:", err.message);
    return;
  }

  console.log("Connected to SQLite database.");

  // เปิดใช้งาน Foreign Key Constraint
  db.run("PRAGMA foreign_keys = ON");

  // สร้างตาราง categories
  db.run(
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )`,
    (err) => {
      if (err) {
        console.error("Error creating categories table:", err.message);
      }
    }
  );

  // สร้างตาราง menu
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
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    )`,
    (err) => {
      if (err) {
        console.error("Error creating menu table:", err.message);
      }
    }
  );

  // สร้างตาราง sales
  db.run(
    `CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menuId INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      totalPrice REAL NOT NULL,
      date DATE DEFAULT (date('now')),
      FOREIGN KEY (menuId) REFERENCES menu(id) ON DELETE CASCADE
    )`,
    (err) => {
      if (err) {
        console.error("Error creating sales table:", err.message);
      }
    }
  );

  // เติมข้อมูลพื้นฐานใน categories
  db.run(
    `INSERT OR IGNORE INTO categories (name) VALUES
      ('Drinks'),
      ('Food'),
      ('Desserts')`,
    (err) => {
      if (err) {
        console.error("Error inserting default categories:", err.message);
      }
    }
  );

  console.log("Database setup completed.");
});

module.exports = db;
