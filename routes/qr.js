const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const qrCodeFolder = path.join(__dirname, "../uploads/qr_codes");

// ✅ API ดึง QR Code ทั้งหมด
router.get("/list-qr", (req, res) => {
    fs.readdir(qrCodeFolder, (err, files) => {
        if (err) return res.status(500).json({ error: "Cannot read QR code folder" });

        const qrList = files.map(file => ({
            table: file.replace("table_", "").replace(".png", ""),
            qrCodeUrl: `http://localhost:5000/uploads/qr_codes/${file}`
        }));

        res.json(qrList);
    });
});

module.exports = router;
