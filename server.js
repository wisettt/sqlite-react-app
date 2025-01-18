const express = require("express");
const cors = require("cors");
const path = require("path");

// Import routes
const menuRoutes = require("./routes/menu");
const authRoutes = require("./routes/auth").router;

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  })
);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/menu", menuRoutes);
app.use("/auth", authRoutes);

// Home Route
app.get("/", (req, res) => {
  res.send("Welcome to the Menu Management API!");
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
