const Product = require("../models/Product");

// GET /api/products  (public — used by website to show product listing)
async function getAllProducts(req, res) {
  try {
    const filter = { isActive: true };
    if (req.query.category) filter.category = req.query.category;
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// GET /api/products/:slug  (public — used by product detail page)
async function getProductBySlug(req, res) {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// GET /api/admin/products  (admin — includes inactive/hidden products too)
async function getAllProductsAdmin(req, res) {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// POST /api/admin/products  (admin — add new product)
async function createProduct(req, res) {
  try {
    const { slug, title, code, category, subText, price, image, finishes } = req.body;

    if (!slug || !title || !code || !category || !price) {
      return res.status(400).json({ message: "slug, title, code, category and price are required" });
    }

    const existing = await Product.findOne({ slug });
    if (existing) {
      return res.status(409).json({ message: "A product with this slug already exists" });
    }

    const product = await Product.create({
      slug, title, code, category, subText, price, image, finishes,
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// PUT /api/admin/products/:id  (admin — edit product)
async function updateProduct(req, res) {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// DELETE /api/admin/products/:id  (admin — delete product)
async function deleteProduct(req, res) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

module.exports = {
  getAllProducts,
  getProductBySlug,
  getAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
};