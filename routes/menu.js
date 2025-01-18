const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticateToken } = require("./auth");
const db = require("../db");

const router = express.Router();
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (!allowedTypes.includes(file.mimetype)) return cb(new Error("File type not allowed"), false);
  cb(null, true);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

// Add Menu
router.post("/add-menu", authenticateToken, upload.single("image"), (req, res) => {
  const { name, price, details } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name || !price || !details)
    return res.status(400).json({ success: false, error: "Missing required fields." });

  db.run(
    `INSERT INTO menu (name, price, details, image) VALUES (?, ?, ?, ?)`,
    [name, price, details, imageUrl],
    function (err) {
      if (err) return res.status(500).json({ success: false, error: "Failed to add menu." });
      res.status(201).json({
        success: true,
        message: "เพิ่มเมนูสำเร็จ",
        data: { id: this.lastID, name, price, details, image: imageUrl },
      });
    }
  );
});

// Get All Menus
router.get("/", authenticateToken, (req, res) => {
  const { onlyAvailable } = req.query;

  let query = "SELECT * FROM menu";
  const params = [];

  if (onlyAvailable === "true") {
    query += " WHERE isAvailable = ?";
    params.push(1);
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: "Failed to fetch menus." });
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: "ไม่มีเมนูในระบบ" });
    res.status(200).json({ success: true, data: rows });
  });
});

// Update Menu
router.put("/update-menu/:id", authenticateToken, upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { name, price, details } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name || !price || !details) {
    return res.status(400).json({ success: false, error: "Missing required fields." });
  }

  db.get("SELECT * FROM menu WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ success: false, error: "Failed to fetch menu." });
    if (!row) return res.status(404).json({ success: false, message: "Menu not found." });

    if (row.image && req.file) {
      const oldImagePath = path.join(__dirname, "..", row.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlink(oldImagePath, (err) => {
          if (err) console.error("Error deleting old image:", err.message);
        });
      }
    }

    db.run(
      `UPDATE menu SET name = ?, price = ?, details = ?, image = COALESCE(?, image), updatedAt = datetime('now') WHERE id = ?`,
      [name, price, details, imageUrl, id],
      function (err) {
        if (err) return res.status(500).json({ success: false, error: "Failed to update menu." });
        res.status(200).json({ success: true, message: "แก้ไขเมนูสำเร็จ" });
      }
    );
  });
});

// Toggle Menu Availability
router.put("/availability/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { isAvailable } = req.body;

  if (!id || isNaN(id)) {
    return res.status(400).json({ success: false, message: "Invalid ID" });
  }

  if (typeof isAvailable !== "boolean") {
    return res.status(400).json({ success: false, message: "Invalid availability value." });
  }

  db.run(
    `UPDATE menu SET isAvailable = ?, updatedAt = datetime('now') WHERE id = ?`,
    [isAvailable, id],
    function (err) {
      if (err) {
        console.error("Error updating availability:", err.message);
        return res.status(500).json({ success: false, message: "Failed to update availability." });
      }

      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: "Menu not found." });
      }

      res.status(200).json({ success: true, message: "Menu availability updated successfully." });
    }
  );
});

// Delete Menu
router.delete("/delete-menu/:id", authenticateToken, (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM menu WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ success: false, error: "Failed to fetch menu." });
    if (!row) return res.status(404).json({ success: false, message: "Menu not found." });

    if (row.image) {
      const imagePath = path.join(__dirname, "..", row.image);
      if (fs.existsSync(imagePath)) {
        fs.unlink(imagePath, (err) => {
          if (err) console.error("Error deleting image:", err.message);
        });
      }
    }

    db.run("DELETE FROM menu WHERE id = ?", [id], function (err) {
      if (err) return res.status(500).json({ success: false, error: "Failed to delete menu." });
      res.status(200).json({ success: true, message: "ลบเมนูสำเร็จ" });
    });
  });
});

module.exports = router;
