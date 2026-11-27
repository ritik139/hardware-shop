const mongoose = require("mongoose");

const finishSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },      // e.g. "Gold"
    swatchColor: { type: String, default: "#c9a24b" }, // hex color for the round swatch
    code: { type: String },                        // e.g. "M-5001-GOLD"
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true }, // used in URL: /product/m5001
    title: { type: String, required: true },               // "M — 5001"
    code: { type: String, required: true },                // "M-5001"
    category: { type: String, required: true },            // "Mortise Handle" / "Key Hole Cover"
    subText: { type: String },                              // "Full Brass · Set of 2"
    price: { type: Number, required: true, min: 0 },       // 5750
    image: { type: String },                                 // base64 or image URL
    finishes: [finishSchema],
    isActive: { type: Boolean, default: true },              // show/hide on site
  },
  { timestamps: true }
);

// Indexes so the product list (newest first, optionally one category) never scans the whole collection
productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ isActive: 1, category: 1, createdAt: -1 });
productSchema.index({ createdAt: -1 }); // admin list

module.exports = mongoose.model("Product", productSchema);