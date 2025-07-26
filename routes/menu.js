const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Joi = require("joi");
const cors = require("cors");
const { authenticateToken } = require("./auth");
const db = require("../db");
require("dotenv").config();

const router = express.Router();
const uploadDir = path.join(__dirname, "../uploads");

// ตรวจสอบและสร้างโฟลเดอร์ uploads ถ้ายังไม่มี
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// ตั้งค่า CORS ให้รองรับเฉพาะ localhost
const allowedOrigins = ["http://localhost:3000", "http://localhost:5173"];
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("ไม่อนุญาตให้เข้าถึง API จากโดเมนนี้"));
        }
    }
};

router.use(cors(corsOptions));
router.use(express.json());

// Middleware ตรวจสอบว่า request มาจาก localhost เท่านั้น
const checkLocalhost = (req, res, next) => {
    if (req.hostname !== "localhost") {
        return res.status(403).json({ success: false, message: "API นี้ใช้ได้เฉพาะบน localhost เท่านั้น" });
    }
    next();
};

// ตั้งค่า Multer สำหรับอัปโหลดไฟล์
const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // จำกัดขนาดไฟล์ 2MB
});

// Validation Schema
const menuSchema = Joi.object({
    name: Joi.string().required(),
    price: Joi.number().greater(0).required(),
    details: Joi.string().required(),
    isAvailable: Joi.boolean().optional(),
});

// ดึงเมนูทั้งหมด
router.get("/", checkLocalhost, (req, res) => {
    db.all("SELECT * FROM menu", [], (err, rows) => {
        if (err) {
            console.error("❌ Failed to fetch menus:", err);
            return res.status(500).json({ success: false, error: "Failed to fetch menus." });
        }
        res.status(200).json({ success: true, data: rows });
    });
});

// ดึงเมนูที่พร้อมให้ใช้งาน
router.get("/public-menu", (req, res) => {
    db.all("SELECT * FROM menu WHERE isAvailable = 1 OR isAvailable = true", [], (err, rows) => {
        if (err) {
            console.error("❌ Failed to fetch menus:", err);
            return res.status(500).json({ success: false, error: "Failed to fetch menus." });
        }
        res.status(200).json({ success: true, data: rows });
    });
});


// เพิ่มเมนูใหม่
router.post("/add-menu", upload.single("image"), (req, res) => {
    console.log("✅ API /add-menu ถูกเรียก");
    console.log("📥 Data received:", req.body);
    console.log("📤 File received:", req.file);


    const { name, price, details, isAvailable, categoryId } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name || !price || !details) {
        console.error("❌ ข้อมูลไม่ครบ:", req.body);
        return res.status(400).json({ success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    const available = isAvailable ? parseInt(isAvailable) : 1; // ✅ ถ้าไม่ได้ส่งมา ให้เป็น 1 (เปิดขาย)
    const category = categoryId ? parseInt(categoryId) : null; // ✅ ถ้าไม่มี category ให้เป็น null

    db.run(
        `INSERT INTO menu (name, price, details, image, isAvailable, createdAt, updatedAt, categoryId) 
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)`,
        [name, price, details, image, available, category],
        function (err) {
            if (err) {
                console.error("❌ Database Error:", err);
                return res.status(500).json({ success: false, message: "เพิ่มเมนูไม่สำเร็จ" });
            }
            res.status(201).json({ success: true, message: "เพิ่มเมนูสำเร็จ!", id: this.lastID });
        }
    );
});

// แก้ไขเมนู
router.put("/update-menu/:id", upload.single("image"), (req, res) => {
    console.log("✅ API /update-menu/:id ถูกเรียก"); 
    console.log("🔍 Params:", req.params);
    console.log("📥 Data received:", req.body);

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        console.error("❌ Invalid ID:", req.params.id);
        return res.status(400).json({ success: false, message: "Invalid ID." });
    }

    db.get("SELECT * FROM menu WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error("❌ Database Error:", err);
            return res.status(500).json({ success: false, error: "Failed to fetch menu." });
        }
        if (!row) {
            console.error("❌ Menu Not Found:", id);
            return res.status(404).json({ success: false, message: "Menu not found." });
        }

        const name = req.body.name || row.name;
        const price = req.body.price || row.price;
        const details = req.body.details || row.details;

        // ✅ แก้ปัญหา NaN โดยกำหนดค่า isAvailable ให้แน่นอน
        let isAvailable;
        if (req.body.isAvailable === undefined || req.body.isAvailable === "" || req.body.isAvailable === null) {
            isAvailable = row.isAvailable; // ถ้าไม่ได้ส่งค่ามา ใช้ค่าจากฐานข้อมูล
        } else {
            isAvailable = (req.body.isAvailable === "1" || req.body.isAvailable === 1 || req.body.isAvailable === true) ? 1 : 0;
        }

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : row.image;

        db.run(
            `UPDATE menu 
             SET name = ?, price = ?, details = ?, isAvailable = ?, image = ?, updatedAt = datetime('now') 
             WHERE id = ?`,
            [name, price, details, isAvailable, imageUrl, id],
            function (err) {
                if (err) {
                    console.error("❌ Database Error:", err);
                    return res.status(500).json({ success: false, error: "Failed to update menu." });
                }
                console.log("✅ Update Success:", { id, name, price, details, isAvailable, imageUrl });
                res.status(200).json({ success: true, message: "แก้ไขเมนูสำเร็จ", updatedId: id });
            }
        );
    });
});

// ลบเมนู
router.delete("/delete-menu/:id", checkLocalhost, authenticateToken, (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid ID." });
    }

    db.get("SELECT * FROM menu WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ success: false, error: "Failed to fetch menu." });
        if (!row) return res.status(404).json({ success: false, message: "Menu not found." });

        if (row.image) {
            const imagePath = path.join(__dirname, "..", row.image);
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }

        db.run("DELETE FROM menu WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ success: false, error: "Failed to delete menu." });
            res.status(200).json({ success: true, message: "ลบเมนูสำเร็จ" });
        });
    });
});

module.exports = router;
