require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

const app = express();

// ===== Middleware =====
app.use(cors());
app.use(express.json({ limit: "10mb" })); // large limit for base64 product images
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve the public website (index.html, products.html, etc.)
// NOTE: site files are one level ABOVE backend/, not in a "public" folder
app.use(express.static(path.join(__dirname, "..")));
// Serve the admin panel UI
app.use("/admin-panel", express.static(path.join(__dirname, "admin-panel")));

// ===== Connect to MongoDB =====
connectDB();

// ===== Routes =====
const adminRoutes = require("./routes/adminRoutes");
const productRoutes = require("./routes/productRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const { ensureDefaultAdmin } = require("./controllers/adminController");

app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/enquiries", enquiryRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Korraz backend is running" });
});

// Create the default admin (from .env) if none exists yet in the database
ensureDefaultAdmin();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});