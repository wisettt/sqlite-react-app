const express = require("express");
const jwt = require("jsonwebtoken");
const Joi = require("joi");

require("dotenv").config();

const router = express.Router();

// JWT Secret Key from .env
const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
  console.error("Error: JWT_SECRET is not defined in .env");
  process.exit(1); // หยุดการทำงานหากไม่มีคีย์ลับ
}

// Admin Credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1111";

// Validation Schema
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(4).required(),
});

// Login Route
router.post("/login", (req, res) => {
  // Validate request body
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const { email, password } = value;

  // Check credentials
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
        return res.status(401).json({ success: false, message: "Token หมดอายุ" });
      }
      return res.status(403).json({ success: false, message: "Token ไม่ถูกต้อง" });
    }

    req.user = user;
    next();
  });
};

// Optional: Refresh Token Route (หากต้องการใช้)
router.post("/refresh", authenticateToken, (req, res) => {
  const email = req.user.email;
  const newToken = jwt.sign({ email }, SECRET_KEY, { expiresIn: "1h" });
  return res.status(200).json({ success: true, token: newToken });
});

module.exports = { router, authenticateToken };
