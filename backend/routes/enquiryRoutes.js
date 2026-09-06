const express = require("express");
const router = express.Router();
const {
  createEnquiry,
  getAllEnquiries,
  updateEnquiryStatus,
  deleteEnquiry,
} = require("../controllers/enquiryController");
const { requireAdmin } = require("../middleware/authMiddleware");

// ===== Public route (contact form submits here) =====
router.post("/", createEnquiry); // POST /api/enquiries

// ===== Admin routes (protected) =====
router.get("/admin/all", requireAdmin, getAllEnquiries);        // GET /api/enquiries/admin/all
router.patch("/admin/:id", requireAdmin, updateEnquiryStatus);  // PATCH /api/enquiries/admin/:id
router.delete("/admin/:id", requireAdmin, deleteEnquiry);       // DELETE /api/enquiries/admin/:id

module.exports = router;