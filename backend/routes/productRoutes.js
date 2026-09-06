const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductBySlug,
  getAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const { requireAdmin } = require("../middleware/authMiddleware");

// ===== Admin routes (protected) — must be defined BEFORE the /:slug route below =====
router.get("/admin/all", requireAdmin, getAllProductsAdmin);   // GET /api/products/admin/all
router.post("/admin/create", requireAdmin, createProduct);     // POST /api/products/admin/create
router.put("/admin/:id", requireAdmin, updateProduct);         // PUT /api/products/admin/:id
router.delete("/admin/:id", requireAdmin, deleteProduct);      // DELETE /api/products/admin/:id

// ===== Public routes (used by the website) =====
router.get("/", getAllProducts);              // GET /api/products
router.get("/:slug", getProductBySlug);        // GET /api/products/m5001 — kept LAST so it doesn't swallow /admin/* routes

module.exports = router;