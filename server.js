const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
require("dotenv").config(); // Load environment variables

const menuRoutes = require("./routes/menu");
const authRoutes = require("./routes/auth").router;

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(
  cors({
    origin: process.env.NODE_ENV === "production"
      ? "https://your-production-url.com"
      : ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/menu", menuRoutes); // Menu-related endpoints
app.use("/auth", authRoutes); // Authentication endpoints

// Home Route
app.get("/", (req, res) => {
  res.send("Welcome to the Menu API!");
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
