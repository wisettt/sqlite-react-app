const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./menu.db", (err) => {
  if (err) {
    console.error("Error connecting to database:", err.message);
  } else {
    console.log("Connected to SQLite database.");

    // Create categories table if it doesn't exist
    db.run(
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      )`
    );

    // Create menu table if it doesn't exist
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
      )`
    );

    // Create sales table if it doesn't exist
    db.run(
      `CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        menuId INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        totalPrice REAL NOT NULL,
        date DATE DEFAULT (date('now')),
        FOREIGN KEY (menuId) REFERENCES menu(id)
      )`
    );

    // Check and update menu table schema
    db.all(`PRAGMA table_info(menu)`, (err, columns) => {
      if (err) {
        console.error("Error fetching table info for menu:", err.message);
      } else {
        const columnNames = columns.map((column) => column.name);

        // Add createdAt column if it doesn't exist
        if (!columnNames.includes("createdAt")) {
          db.run(`ALTER TABLE menu ADD COLUMN createdAt DATETIME`, (err) => {
            if (!err) {
              db.run(`UPDATE menu SET createdAt = datetime('now') WHERE createdAt IS NULL`);
              console.log("Column createdAt added to menu table.");
            }
          });
        }

        // Add updatedAt column if it doesn't exist
        if (!columnNames.includes("updatedAt")) {
          db.run(`ALTER TABLE menu ADD COLUMN updatedAt DATETIME`, (err) => {
            if (!err) {
              db.run(`UPDATE menu SET updatedAt = datetime('now') WHERE updatedAt IS NULL`);
              console.log("Column updatedAt added to menu table.");
            }
          });
        }

        // Add categoryId column if it doesn't exist
        if (!columnNames.includes("categoryId")) {
          db.run(`ALTER TABLE menu ADD COLUMN categoryId INTEGER`, (err) => {
            if (!err) {
              console.log("Column categoryId added to menu table.");
            }
          });
        }

        // Add isAvailable column if it doesn't exist
        if (!columnNames.includes("isAvailable")) {
          db.run(`ALTER TABLE menu ADD COLUMN isAvailable BOOLEAN DEFAULT true`, (err) => {
            if (!err) {
              console.log("Column isAvailable added to menu table.");
            }
          });
        }
      }
    });

    // Pre-fill default categories
    db.run(
      `INSERT OR IGNORE INTO categories (name) VALUES
       ('Drinks'),
       ('Food'),
       ('Desserts')`
    );
  }
});

module.exports = db;
