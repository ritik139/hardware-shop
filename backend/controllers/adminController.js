const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

// Used so a wrong username takes as long to reject as a wrong password (no username guessing by timing)
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

/**
 * On first ever run, if no admin exists in the database yet,
 * create one automatically using ADMIN_USERNAME / ADMIN_PASSWORD from .env.
 * This means you only edit .env once — after that, you can change the
 * password properly through the database if needed.
 *
 * Never throws: a problem here must not crash the whole server.
 */
async function ensureDefaultAdmin() {
  try {
    const count = await Admin.countDocuments();
    if (count > 0) return;

    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
      console.warn("⚠️  No admin exists yet and ADMIN_USERNAME / ADMIN_PASSWORD are missing in .env — admin login will not work.");
      return;
    }

    const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await Admin.create({ username: process.env.ADMIN_USERNAME, password: hashed });
    console.log("👤 Default admin created:", process.env.ADMIN_USERNAME);
  } catch (err) {
    console.error("❌ Could not create default admin:", err.message);
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body || {};
    // must be plain strings — blocks objects like {"$ne": null} being passed into the database query
    if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const admin = await Admin.findOne({ username });
    const isMatch = await bcrypt.compare(password, admin ? admin.password : DUMMY_HASH);
    if (!admin || !isMatch) {
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
      secure: process.env.NODE_ENV === "production", // https-only cookie on the live site
    });

    res.json({ message: "Login successful", token, username: admin.username });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}

function logout(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.json({ message: "Logged out" });
}

function checkAuth(req, res) {
  // If this route is reached, requireAdmin middleware already validated the token
  res.json({ loggedIn: true, admin: req.admin });
}

module.exports = { login, logout, checkAuth, ensureDefaultAdmin };