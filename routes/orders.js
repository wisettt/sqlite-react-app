const express = require("express");
const router = express.Router();
const db = require("../db"); // เชื่อมกับฐานข้อมูล SQLite หรือ MySQL

// ✅ POST: เพิ่มคำสั่งซื้อใหม่ (สำหรับโต๊ะที่ระบุ)
router.post("/", (req, res) => {
  const { table, items, totalAmount } = req.body;

  console.log("📦 รับข้อมูลจาก Frontend:", req.body); // ✅ Debug

  // 🔹 ตรวจสอบค่าที่จำเป็น
  if (!table || !items || items.length === 0 || !totalAmount || totalAmount <= 0) {
    return res.status(400).json({ error: "Table, items, and totalAmount are required" });
  }

  // 🔹 บันทึกออเดอร์ลง Database
  const sql = "INSERT INTO orders (table_number, items, total_amount, date) VALUES (?, ?, ?, ?)";
  const params = [table, JSON.stringify(items), totalAmount, new Date().toISOString()];

  db.run(sql, params, function (err) {
    if (err) {
      console.error("❌ Error inserting order into database:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log("✅ ออเดอร์ถูกบันทึกลง Database:", { id: this.lastID, table, items, totalAmount });
    res.status(201).json({
      id: this.lastID,
      table,
      items,
      totalAmount,
      message: `บันทึกออเดอร์โต๊ะที่ ${table} สำเร็จ`,
    });
  });
});

// ✅ PUT: อัพเดตสถานะการชำระเงินของออเดอร์
router.put("/:id/payment", (req, res) => {
  const { id } = req.params; // รับ id ของคำสั่งซื้อ
  const sql = "UPDATE orders SET payment_status = 'paid' WHERE id = ?"; // คำสั่ง SQL ที่อัปเดตสถานะการชำระเงิน

  db.run(sql, [id], function (err) {
    if (err) {
      console.error("❌ Error updating payment status:", err.message);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Order not found" }); // หากไม่พบคำสั่งซื้อ
    }
    console.log(`✅ ออเดอร์ ID ${id} ได้รับการชำระเงินแล้ว`);
    res.status(200).json({ message: "ออเดอร์ได้รับการชำระเงินแล้ว" }); // ส่งข้อความตอบกลับ
  });
});

// ✅ GET: ดึงข้อมูลคำสั่งซื้อทั้งหมด หรือเฉพาะโต๊ะที่ระบุ
router.get("/", (req, res) => {
  const { table } = req.query; // ✅ ใช้ `table` แทน `tableNumber`

  let sql = "SELECT * FROM orders";
  let params = [];

  if (table) {
    sql += " WHERE table_number = ?";
    params.push(table);
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("❌ Error fetching orders:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log("✅ ดึงข้อมูลออเดอร์สำเร็จ:", rows);
    res.status(200).json(rows);
  });
});

// ✅ GET: ดึงข้อมูลคำสั่งซื้อทีละรายการ โดยใช้ id
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM orders WHERE id = ?";

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error("❌ Error fetching order by ID:", err.message);
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Order not found" });
    }
    console.log("✅ ดึงข้อมูลออเดอร์สำเร็จ:", row);
    res.status(200).json(row);
  });
});

// ✅ DELETE: ลบคำสั่งซื้อทั้งหมดของโต๊ะที่ระบุ
router.delete("/", (req, res) => {
  const { table } = req.query; // ✅ ใช้ `table` แทน `tableNumber`

  if (!table) {
    return res.status(400).json({ error: "Table number is required" });
  }

  const sql = "DELETE FROM orders WHERE table_number = ?";

  db.run(sql, table, function (err) {
    if (err) {
      console.error("❌ Error deleting orders:", err.message);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "No orders found for this table" });
    }
    console.log(`✅ ออเดอร์ของโต๊ะ ${table} ถูกลบเรียบร้อยแล้ว`);
    res.status(200).json({ message: `ออเดอร์ของโต๊ะ ${table} ถูกลบเรียบร้อยแล้ว` });
  });
});

// ✅ DELETE: ลบคำสั่งซื้อทีละรายการโดยใช้ id
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM orders WHERE id = ?";

  db.run(sql, id, function (err) {
    if (err) {
      console.error("❌ Error deleting order by ID:", err.message);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    console.log(`✅ คำสั่งซื้อ ID ${id} ถูกลบเรียบร้อยแล้ว`);
    res.status(200).json({ message: "คำสั่งซื้อนี้ถูกลบเรียบร้อยแล้ว" });
  });
});

module.exports = router;
