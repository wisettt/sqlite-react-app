const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Joi = require("joi");
const { authenticateToken } = require("./auth");
const db = require("../db");

const router = express.Router();
const uploadDir = path.join(__dirname, "../uploads");

// ✅ ตรวจสอบว่าโฟลเดอร์ `uploads` มีอยู่หรือไม่ หากไม่มีให้สร้าง
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// ✅ ตั้งค่า Multer สำหรับอัปโหลดไฟล์รูปเมนู
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

// ✅ Validation Schema (ลบ categoryId ออก)
const menuSchema = Joi.object({
    name: Joi.string().required(),
    price: Joi.number().greater(0).required(),
    details: Joi.string().required(),
    isAvailable: Joi.boolean().optional(),
});

// 🔹 ดึงเมนูทั้งหมด
router.get("/", (req, res) => {
    db.all("SELECT * FROM menu", [], (err, rows) => {
        if (err) {
            console.error("❌ Failed to fetch menus:", err);
            return res.status(500).json({ success: false, error: "Failed to fetch menus." });
        }
        res.status(200).json({ success: true, data: rows });
    });
});

// 🔹 เพิ่มเมนูใหม่ (คนขายต้องล็อกอิน)
router.post("/add-menu", authenticateToken, upload.single("image"), (req, res) => {
    console.log("📌 Received request body:", req.body);

    const { error, value } = menuSchema.validate(req.body);
    if (error) {
        console.error("❌ Validation Error:", error.details[0].message);
        return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { name, price, details } = value;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    db.run(
        `INSERT INTO menu (name, price, details, image, createdAt) VALUES (?, ?, ?, ?, datetime('now'))`,
        [name, price, details, imageUrl],
        function (err) {
            if (err) {
                console.error("❌ Database Error:", err);
                return res.status(500).json({ success: false, error: "Failed to add menu." });
            }

            res.status(201).json({
                success: true,
                message: "เพิ่มเมนูสำเร็จ",
                data: { id: this.lastID, name, price, details, image: imageUrl },
            });
        }
    );
});

// 🔹 แก้ไขเมนู (คนขายต้องล็อกอิน)
router.put("/update-menu/:id", authenticateToken, upload.single("image"), (req, res) => {
    const { id } = req.params;
    console.log("📌 Update request received for ID:", id);
    console.log("📌 Request body:", req.body); // 🔍 Debug Request Body

    let { name, price, details, isAvailable } = req.body;

    // 🔥 ตรวจสอบค่าที่ได้รับ
    console.log("📌 Received name:", name);
    console.log("📌 Received isAvailable:", isAvailable);

    if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid ID." });
    }

    db.get("SELECT * FROM menu WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error("❌ Failed to fetch menu:", err);
            return res.status(500).json({ success: false, error: "Failed to fetch menu." });
        }
        if (!row) {
            return res.status(404).json({ success: false, message: "Menu not found." });
        }

        // ✅ ตั้งค่าเริ่มต้นให้ name, price, details
        name = name || row.name;
        price = price || row.price;
        details = details || row.details;
        isAvailable = isAvailable !== undefined ? isAvailable : row.isAvailable;

        console.log("📌 Final Update Values:", { name, price, details, isAvailable });

        db.run(
            `UPDATE menu SET name = ?, price = ?, details = ?, isAvailable = ?, updatedAt = datetime('now') WHERE id = ?`,
            [name, price, details, isAvailable, id],
            function (err) {
                if (err) {
                    console.error("❌ Failed to update menu:", err);
                    return res.status(500).json({ success: false, error: "Failed to update menu." });
                }

                console.log(`✅ Menu ID ${id} updated successfully.`);
                res.status(200).json({ success: true, message: "แก้ไขเมนูสำเร็จ" });
            }
        );
    });
});

// 🔹 ลบเมนู (คนขายต้องล็อกอิน)
router.delete("/delete-menu/:id", authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM menu WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error("❌ Failed to fetch menu:", err);
            return res.status(500).json({ success: false, error: "Failed to fetch menu." });
        }
        if (!row) {
            return res.status(404).json({ success: false, message: "Menu not found." });
        }

        if (row.image) {
            const imagePath = path.join(__dirname, "..", row.image);
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }

        db.run("DELETE FROM menu WHERE id = ?", [id], function (err) {
            if (err) {
                console.error("❌ Failed to delete menu:", err);
                return res.status(500).json({ success: false, error: "Failed to delete menu." });
            }

            res.status(200).json({ success: true, message: "ลบเมนูสำเร็จ" });
        });
    });
});

module.exports = router;
