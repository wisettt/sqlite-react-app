const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const menuRoutes = require("./routes/menu");
const authRoutes = require("./routes/auth").router;

const app = express();
const port = process.env.PORT || 5000;

// ตรวจสอบ environment variables ที่จำเป็น
if (!process.env.JWT_SECRET) {
  console.error("Error: JWT_SECRET is not defined in .env or environment variables.");
  process.exit(1);
}

// Middleware
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

// Static Files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/menu", menuRoutes);
app.use("/auth", authRoutes);

// Home Route
app.get("/", (req, res) => {
  res.send("Welcome to the Menu API!");
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(`[Error]: ${err.message}`);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
