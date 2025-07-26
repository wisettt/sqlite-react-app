const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
require("dotenv").config();

// Import Routes
const menuRoutes = require("./routes/menu");
const authRoutes = require("./routes/auth").router;
const ordersRoutes = require("./routes/orders");
const tableRoutes = require("./routes/tables");
const sqlite3 = require("sqlite3").verbose();
// นำเข้าไฟล์ routes
const app = express();
const port = process.env.PORT || 5000;

// ✅ ตั้งค่า CORS ให้รองรับ React (`localhost:3000` และ `localhost:5173`)
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"], 
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ ตั้งค่า Multer สำหรับอัปโหลดไฟล์ (สร้างโฟลเดอร์อัตโนมัติ)
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage });

// ✅ อ่าน FormData และ JSON อย่างถูกต้อง
app.use(express.urlencoded({ extended: true })); // รองรับ FormData
app.use(express.json()); // รองรับ JSON

// ✅ เชื่อมต่อฐานข้อมูล SQLite
const dbPath = path.join(__dirname, "data", "menu.db");
if (!fs.existsSync(path.join(__dirname, "data"))) {
  fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Cannot connect to SQLite database:", err.message);
    process.exit(1);
  } else {
    console.log(`✅ Connected to SQLite database at ${dbPath}`);
  }
});

// ✅ Static Files (ให้สามารถเข้าถึงไฟล์อัปโหลดได้)
app.use("/uploads", express.static(path.resolve(__dirname, "uploads"), {
  setHeaders: (res, path, stat) => {
    res.set("Access-Control-Allow-Origin", "*"); // ✅ อนุญาตให้ทุกโดเมนดึงรูป
  }
}));

// ✅ ตรวจสอบโฟลเดอร์ QR Code
const qrCodeFolder = path.resolve(__dirname, "uploads", "qr_codes");
if (!fs.existsSync(qrCodeFolder)) {
  fs.mkdirSync(qrCodeFolder, { recursive: true });
}

// ✅ API สำหรับสร้าง QR Code และบันทึกเป็นไฟล์
app.get("/generate-qr/:table", async (req, res) => {
  const { table } = req.params;
  const baseUrl = `http://localhost:${port}`;
  const url = `${baseUrl}/?table=${table}`;
  const qrPath = path.join(qrCodeFolder, `table_${table}.png`);

  try {
    await QRCode.toFile(qrPath, url);
    res.json({ table, qrCodeUrl: `${baseUrl}/uploads/qr_codes/table_${table}.png` });
  } catch (err) {
    res.status(500).json({ error: "QR Code generation failed" });
  }
});

// ✅ API สำหรับดึง QR Code ทั้งหมด
app.get("/list-qr", (req, res) => {
  fs.readdir(qrCodeFolder, (err, files) => {
    if (err) return res.status(500).json({ error: "Cannot read QR code folder" });

    const baseUrl = `http://localhost:${port}`;
    const qrList = files.map(file => ({
      table: file.replace("table_", "").replace(".png", ""),
      qrCodeUrl: `${baseUrl}/uploads/qr_codes/${file}`
    }));

    res.json(qrList);
  });
});

// ✅ ใช้งาน Routes (ต้องอยู่หลัง express.json())
app.use("/api/menu", menuRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/tables", tableRoutes);
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

// ✅ Logout Route
app.post("/api/auth/logout", (req, res) => {
  res.status(200).json({ success: true, message: "ออกจากระบบสำเร็จ" });
});

// ✅ Start the server
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://192.168.1.42:${port}`);
});