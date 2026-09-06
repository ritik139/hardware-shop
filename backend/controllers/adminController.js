const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

/**
 * On first ever run, if no admin exists in the database yet,
 * create one automatically using ADMIN_USERNAME / ADMIN_PASSWORD from .env.
 * This means you only edit .env once — after that, you can change the
 * password properly through the database if needed.
 */
async function ensureDefaultAdmin() {
  const count = await Admin.countDocuments();
  if (count === 0) {
    const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await Admin.create({ username: process.env.ADMIN_USERNAME, password: hashed });
    console.log("👤 Default admin created:", process.env.ADMIN_USERNAME);
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax",
    });

    res.json({ message: "Login successful", token, username: admin.username });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

function logout(req, res) {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
}

function checkAuth(req, res) {
  // If this route is reached, requireAdmin middleware already validated the token
  res.json({ loggedIn: true, admin: req.admin });
}

module.exports = { login, logout, checkAuth, ensureDefaultAdmin };