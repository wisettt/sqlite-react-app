const express = require("express");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const cors = require("cors");
require("dotenv").config();

const router = express.Router();

// ใช้ CORS เพื่อให้รองรับการเรียก API จาก localhost
const corsOptions = {
    origin: ["http://localhost:3000", "http://localhost:5173"], // รองรับหลายโดเมน
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
};
router.use(cors(corsOptions));
router.use(express.json()); // รองรับ JSON Request

// JWT Secret Key จาก .env
const SECRET_KEY = process.env.JWT_SECRET || "mysecretkey"; // ใช้ค่าเริ่มต้นหากไม่กำหนด
if (!process.env.JWT_SECRET) {
  console.warn("Warning: JWT_SECRET is not defined in .env. Using default key.");
}

// Admin Credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@localhost";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";

// Validation Schema สำหรับ login
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(4).required(),
});

// 📌 **Login Route**
router.post("/login", (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const { email, password } = value;

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: "1h" });
    return res.status(200).json({ success: true, message: "เข้าสู่ระบบสำเร็จ", token });
  }

  return res.status(401).json({ success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
});

// 📌 **Middleware for Authentication**
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ success: false, message: "ไม่ได้รับ Token" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Token ไม่ถูกต้อง" });
  }

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

// 📌 **Refresh Token Route**
router.post("/refresh", authenticateToken, (req, res) => {
  const email = req.user.email;
  const newToken = jwt.sign({ email }, SECRET_KEY, { expiresIn: "1h" });
  return res.status(200).json({ success: true, token: newToken });
});

// 📌 **Logout Route**
router.post("/logout", (req, res) => {
  return res.status(200).json({ success: true, message: "ออกจากระบบสำเร็จ" });
});

// 📌 **Export Middleware**
module.exports = { router, authenticateToken };
