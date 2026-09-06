const express = require("express");
const router = express.Router();
const { login, logout, checkAuth } = require("../controllers/adminController");
const { requireAdmin } = require("../middleware/authMiddleware");

router.post("/login", login);
router.post("/logout", logout);
router.get("/check", requireAdmin, checkAuth);

module.exports = router;