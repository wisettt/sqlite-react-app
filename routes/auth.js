const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

// JWT Secret Key and Admin Credentials
const SECRET_KEY = "your-secret-key";
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "1111";

// Login Route
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: "1h" });
    return res.status(200).json({ success: true, message: "เข้าสู่ระบบสำเร็จ", token });
  }

  return res.status(401).json({ success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
});

// Middleware for Authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ success: false, message: "ไม่ได้รับ Token" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ success: false, message: "Token expired" });
      }
      return res.status(403).json({ success: false, message: "Token ไม่ถูกต้อง" });
    }

    req.user = user;
    next();
  });
};

module.exports = { router, authenticateToken };
