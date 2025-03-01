const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
require("dotenv").config();

// Import Routes
const menuRoutes = require("./routes/menu");
const authRoutes = require("./routes/auth").router;
const ordersRoutes = require("./routes/orders");
const db = require("./db");

const app = express();
const port = process.env.PORT || 5000;

// ✅ ตรวจสอบ environment variables ที่จำเป็น
if (!process.env.JWT_SECRET) {
  console.error("Error: JWT_SECRET is not defined in .env or environment variables.");
  process.exit(1);
}

// ✅ Middleware
app.use(bodyParser.json());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.PRODUCTION_URL
        : ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Static Files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ ตรวจสอบโฟลเดอร์ QR Code
const qrCodeFolder = path.join(__dirname, "uploads", "qr_codes");
if (!fs.existsSync(qrCodeFolder)) {
    fs.mkdirSync(qrCodeFolder, { recursive: true });
}

// ✅ API สำหรับสร้าง QR Code และบันทึกเป็นไฟล์
app.get("/generate-qr/:table", async (req, res) => {
    const { table } = req.params;
    const url = `http://localhost:3000/?table=${table}`;
    const qrPath = path.join(qrCodeFolder, `table_${table}.png`);

    try {
        await QRCode.toFile(qrPath, url);
        res.json({ table, qrCodeUrl: `http://localhost:5000/uploads/qr_codes/table_${table}.png` });
    } catch (err) {
        res.status(500).json({ error: "QR Code generation failed" });
    }
});

// ✅ API สำหรับดึง QR Code ทั้งหมด
app.get("/list-qr", (req, res) => {
    fs.readdir(qrCodeFolder, (err, files) => {
        if (err) return res.status(500).json({ error: "Cannot read QR code folder" });

        const qrList = files.map(file => ({
            table: file.replace("table_", "").replace(".png", ""),
            qrCodeUrl: `http://localhost:5000/uploads/qr_codes/${file}`
        }));

        res.json(qrList);
    });
});

// ✅ Routes
app.use("/menu", menuRoutes);
app.use("/auth", authRoutes);
app.use("/orders", ordersRoutes); // ✅ แก้ path ให้ถูกต้อง

// ✅ Home Route
app.get("/", (req, res) => {
  res.send("Welcome to the Coffee Shop API!");
});

// ✅ Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(`[Error]: ${err.message}`);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// ✅ Route สำหรับดึงเมนูโดยไม่ต้องล็อกอิน
app.get("/public-menu", (req, res) => {
  const { onlyAvailable, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  let query = "SELECT * FROM menu";
  const params = [];

  if (onlyAvailable === "true") {
    query += " WHERE isAvailable = ?";
    params.push(1);
  }

  query += " LIMIT ? OFFSET ?";
  params.push(Number(limit), Number(offset));

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Failed to fetch menus:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch menus." });
    }
    res.status(200).json({ success: true, data: rows });
  });
});

// ✅ Route สำหรับดึงเมนูเฉพาะ ID
app.get("/menu/:id", (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ success: false, message: "Invalid ID" });
  }

  db.get("SELECT * FROM menu WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Error fetching menu:", err);
      return res.status(500).json({ success: false, message: "Failed to fetch menu." });
    }
    if (!row) {
      return res.status(404).json({ success: false, message: "Menu not found." });
    }
    res.status(200).json({ success: true, data: row });
  });
});

// ✅ Start the server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
