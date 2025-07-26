const express = require("express");
const router = express.Router();
const db = require("../db");
const cors = require("cors");

require("dotenv").config();
const API_URL = process.env.API_URL || "http://localhost:5000";  // ✅ กำหนด API_URL
// ✅ ตั้งค่า CORS ให้ API อนุญาตทุกโดเมน
const corsOptions = {
    origin: "*", // ✅ อนุญาตทุกที่ (Allow All Origins)
    methods: ["GET", "POST", "PUT", "DELETE"], // ✅ ระบุ HTTP Methods ที่อนุญาต
    allowedHeaders: ["Content-Type", "Authorization"], // ✅ อนุญาต Headers สำคัญ
};

// ✅ ใช้ CORS
router.use(cors(corsOptions));
router.use(express.json());

// ✅ Middleware: จำกัดให้ API ใช้ได้เฉพาะ localhost
const checkLocalhost = (req, res, next) => {
    if (req.hostname !== "localhost") {
        return res.status(403).json({ success: false, message: "API นี้ใช้ได้เฉพาะบน localhost เท่านั้น" });
    }
    next();
};

// ✅ POST: เพิ่มคำสั่งซื้อใหม่ (สำหรับโต๊ะที่ระบุ)
router.post("/", checkLocalhost, (req, res) => {
  const { table, items, totalAmount } = req.body;

  console.log("📦 รับข้อมูลจาก Frontend:", req.body);

  if (!table || !items || items.length === 0 || !totalAmount || totalAmount <= 0) {
      return res.status(400).json({ error: "ต้องระบุ Table, items และ totalAmount" });
  }

  // ✅ JSON.stringify(items) จะเก็บ URL ของรูปภาพไปด้วย
  const sql = "INSERT INTO orders (table_number, items, total_amount, date) VALUES (?, ?, ?, ?)";
  const params = [table, JSON.stringify(items), totalAmount, new Date().toISOString()];

  db.run(sql, params, function (err) {
      if (err) {
          console.error("❌ Error inserting order:", err.message);
          return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
          id: this.lastID,
          table,
          items,
          totalAmount,
          message: `บันทึกออเดอร์โต๊ะที่ ${table} สำเร็จ`,
      });
  });
});

// ✅ PUT: อัพเดตสถานะการชำระเงิน
router.put("/:id/payment", (req, res) => {
    const { id } = req.params;
    const sql = "UPDATE orders SET payment_status = 'paid' WHERE id = ?"; // 🔥 เปลี่ยนเป็น payment_status
  
    db.run(sql, [id], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "ไม่พบออเดอร์" });
      }
  
      res.status(200).json({ message: "✅ ออเดอร์ถูกชำระเงินแล้ว" });
    });
  });
// ✅ PUT: อัพเดตสถานะออเดอร์เป็น "delivered"
router.put("/:id/delivery", (req, res) => {
  const { id } = req.params;
  const sql = "UPDATE orders SET status = 'delivered' WHERE id = ?";

  db.run(sql, [id], function (err) {
      if (err) {
          return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
          return res.status(404).json({ error: "ไม่พบออเดอร์" });
      }
      res.status(200).json({ message: "✅ ออเดอร์ถูกส่งเรียบร้อยแล้ว" });
  });
});


// ✅ GET: ดึงข้อมูลคำสั่งซื้อทั้งหมด หรือเฉพาะโต๊ะที่ระบุ
router.get("/", (req, res) => {
  const sql = "SELECT * FROM orders WHERE status != 'paid'";  // ✅ โหลดเฉพาะที่ยังไม่จ่าย

  db.all(sql, [], (err, rows) => {
      if (err) {
          return res.status(500).json({ error: err.message });
      }
      res.status(200).json(rows);
  });
});

// ✅ GET: ดึงข้อมูลเฉพาะออเดอร์ที่ชำระเงินแล้ว
router.get("/paid-orders", (req, res) => {
    const sql = "SELECT id, table_number, items, total_amount, date FROM orders WHERE payment_status = 'paid'";
  
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("❌ Error fetching paid orders:", err.message);
        return res.status(500).json({ error: err.message });
      }
  
      if (!rows || rows.length === 0) {
        console.warn("⚠️ ไม่พบออเดอร์ที่ชำระเงินแล้ว");
        return res.status(404).json({ error: "ไม่พบออเดอร์ที่ชำระเงินแล้ว" });
      }
  
      console.log("📢 ออเดอร์ที่จ่ายเงินแล้ว:", rows);
      res.status(200).json(rows);
    });
  });


// ✅ GET: ดึงข้อมูลคำสั่งซื้อทีละรายการ
router.get("/:id", checkLocalhost, (req, res) => {
    const { id } = req.params;
    const sql = "SELECT * FROM orders WHERE id = ?";

    db.get(sql, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: "ไม่พบออเดอร์" });
        }
        res.status(200).json(row);
    });
});

// ✅ DELETE: ลบคำสั่งซื้อทั้งหมดของโต๊ะที่ระบุ
router.delete("/", checkLocalhost, (req, res) => {
    const { table } = req.query;
    if (!table) {
        return res.status(400).json({ error: "ต้องระบุหมายเลขโต๊ะ" });
    }

    const sql = "DELETE FROM orders WHERE table_number = ?";
    db.run(sql, table, function (err) {
        if (err) {
           return res.status(500).json({ error: err.message });
       }
        if (this.changes === 0) {
            return res.status(404).json({ error: "ไม่พบออเดอร์ของโต๊ะนี้" });
       }
        res.status(200).json({ message: `ออเดอร์ของโต๊ะ ${table} ถูกลบเรียบร้อยแล้ว` });
    });
});

// ✅ DELETE: ลบคำสั่งซื้อทีละรายการ
router.delete("/:id", checkLocalhost, (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM orders WHERE id = ?";

    db.run(sql, id, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "ไม่พบออเดอร์" });
        }
        res.status(200).json({ message: "ออเดอร์ถูกลบเรียบร้อยแล้ว" });
    });
});


  
module.exports = router;
