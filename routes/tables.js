const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

const db = new sqlite3.Database("./data/menu.db");

// 📌 ตรวจสอบและสร้างตาราง `tables` ถ้ายังไม่มี
db.run(`CREATE TABLE IF NOT EXISTS tables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number INTEGER UNIQUE NOT NULL,
  status TEXT DEFAULT 'available'
)`);

const qrCodeFolder = path.resolve(__dirname, "../uploads/qr_codes");
if (!fs.existsSync(qrCodeFolder)) {
  fs.mkdirSync(qrCodeFolder, { recursive: true });
}

// 📌 GET: ดึงข้อมูลโต๊ะทั้งหมด
router.get("/", (req, res) => {
  db.all("SELECT * FROM tables", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
// 📌 GET: ดึงข้อมูลโต๊ะตามหมายเลข
router.get("/:number", (req, res) => {
  const { number } = req.params;
  console.log(`🔍 ค้นหาโต๊ะหมายเลข: ${number}`);

  db.get("SELECT * FROM tables WHERE number = ?", [number], (err, row) => {
    if (err) {
      console.error("❌ Error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      console.warn(`⚠️ โต๊ะหมายเลข ${number} ไม่พบในฐานข้อมูล`);
      return res.status(404).json({ error: "❌ ไม่พบโต๊ะนี้" });
    }

    console.log(`✅ พบโต๊ะหมายเลข ${number}:`, row);
    res.json(row);
  });
});

// 📌 POST: เพิ่มโต๊ะใหม่ + สร้าง QR Code ขนาดใหญ่
router.post("/", (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).json({ error: "ต้องระบุหมายเลขโต๊ะ" });

  const sql = "INSERT INTO tables (number, status) VALUES (?, 'available')";
  db.run(sql, [number], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    const tableId = this.lastID;
    const qrCodePath = path.join(qrCodeFolder, `table_${number}.png`);
    const qrData = `http://localhost:5000/?table=${number}`;

    // 📌 สร้าง QR Code ขนาดใหญ่ (512x512 px)
    QRCode.toFile(qrCodePath, qrData, { width: 512, margin: 2 }, (err) => {
      if (err) return res.status(500).json({ error: "QR Code generation failed" });

      res.json({ id: tableId, number, status: "available", qrCodeUrl: `http://localhost:5000/uploads/qr_codes/table_${number}.png` });
    });
  });
});

// 📌 DELETE: ลบโต๊ะและ QR Code ที่เกี่ยวข้อง
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  // 🔹 ดึงหมายเลขโต๊ะจากฐานข้อมูล
  db.get("SELECT number FROM tables WHERE id = ?", [id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: "ไม่พบโต๊ะนี้" });

    const tableNumber = row.number;
    const qrCodePath = path.join(qrCodeFolder, `table_${tableNumber}.png`);

    // 🔹 ลบโต๊ะจากฐานข้อมูล
    db.run("DELETE FROM tables WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // 🔹 ลบไฟล์ QR Code ที่เกี่ยวข้อง
      if (fs.existsSync(qrCodePath)) fs.unlinkSync(qrCodePath);

      res.json({ success: true, message: `ลบโต๊ะ ${tableNumber} เรียบร้อยแล้ว` });
    });
  });
});

module.exports = router;
