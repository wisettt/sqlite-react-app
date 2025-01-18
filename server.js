const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

// Import routes
const menuRoutes = require("./routes/menu");
const authRoutes = require("./routes/auth").router;

const app = express();
const port = 5000;

// Middleware
app.use(bodyParser.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/menu", menuRoutes); // Menu-related endpoints, including DELETE
app.use("/auth", authRoutes); // Authentication endpoints

// Home Route
app.get("/", (req, res) => {
  res.send("Welcome to the Menu API!");
});

// Handle Deletion (Optional Log for Debugging)
app.delete("/menu/delete-menu/:id", (req, res, next) => {
  const { id } = req.params;
  console.log(`Attempting to delete menu with ID: ${id}`);
  next(); // Passes control to the delete logic in `routes/menu.js`
});

// Start Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
