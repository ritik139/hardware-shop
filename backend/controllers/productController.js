const Product = require("../models/Product");

const isObjectId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
// cleans a text field: must be a string, trimmed, max length
const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// "M 5001 Gold!" -> "m-5001-gold"
const makeSlug = (v) =>
  text(v, 120).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Picture types the public image endpoint will serve (anything else stays inline, exactly as before; SVG is never served from our own address)
const SERVABLE_IMAGE = /^data:(image\/(?:png|jpe?g|webp|gif|avif|bmp));base64,/i;

// Product images are shown on the public pages as <img src="...">, so only accept real image data / site image paths / http(s) links.
function isValidImage(v) {
  if (v === null || v === undefined || v === "") return true; // no image is fine
  if (typeof v !== "string") return false;
  if (v.startsWith("data:image/")) {
    const i = v.indexOf(";base64,");
    return i > 0 && i < 40 && /^[A-Za-z0-9+/=]+$/.test(v.slice(i + 8));
  }
  return /^(https?:\/\/|\/?images\/)[^"'<>\\]+$/i.test(v);
}

// Finish swatch colors are placed inside style="background:..." on the public pages, so only allow a plain hex or color name.
function cleanFinishes(list) {
  if (!Array.isArray(list)) return null;
  return list
    .slice(0, 30)
    .map((f) => {
      const color = f && typeof f.swatchColor === "string" ? f.swatchColor.trim() : "";
      return {
        name: text(f && f.name, 60),
        swatchColor: /^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(color) ? color : "#c9a24b",
        code: text(f && f.code, 60),
      };
    })
    .filter((f) => f.name);
}

// Accept a real number or a numeric string only. (Number(null) is 0 and Number(true) is 1 — those must NOT slip through as a price.)
function parsePrice(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return NaN;
}

/**
 * Takes the request body and returns only the fields we allow, cleaned and checked.
 * Returns { error } if something is invalid, otherwise { fields }.
 * (Replaces passing req.body straight into the database.)
 */
function readProductFields(body, { isCreate }) {
  const fields = {};
  const b = body || {};

  for (const key of ["title", "code", "category"]) {
    if (b[key] !== undefined || isCreate) {
      const v = text(b[key], 150);
      if (!v) return { error: `${key} is required` };
      fields[key] = v;
    }
  }

  if (b.slug !== undefined || isCreate) {
    // new products: tidy the slug automatically; existing products: keep the saved slug exactly (cart/wishlist use it)
    const slug = isCreate ? makeSlug(b.slug) : text(b.slug, 120);
    if (!slug || /[\s"'<>&?#/\\]/.test(slug)) {
      return { error: "Slug is required and cannot contain spaces or characters like \" ' < > & ? # /" };
    }
    fields.slug = slug;
  }

  if (b.price !== undefined || isCreate) {
    const price = parsePrice(b.price);
    if (!Number.isFinite(price) || price < 0 || price > 100000000) {
      return { error: "Price must be a valid number" };
    }
    fields.price = price;
  }

  if (b.subText !== undefined) fields.subText = text(b.subText, 300);

  if (b.isActive !== undefined) {
    if (typeof b.isActive !== "boolean") return { error: "isActive must be true or false" };
    fields.isActive = b.isActive;
  }

  if (b.image !== undefined) {
    if (!isValidImage(b.image)) {
      return { error: "Image must be an uploaded image file or an image link" };
    }
    fields.image = b.image || null;
  }

  if (b.finishes !== undefined) {
    const finishes = cleanFinishes(b.finishes);
    if (finishes === null) return { error: "finishes must be a list" };
    fields.finishes = finishes;
  }

  return { fields };
}

/* =====================================================================
   SPEED: public product list
   ---------------------------------------------------------------------
   Uploaded product photos are stored in MongoDB as base64 text (often 1-5 MB EACH).
   Before: every page (product-detail, cart, wishlist) downloaded ALL of them inside /api/products.
   Now:    the list carries a tiny image URL instead (/api/products/image/<id>?v=...), the browser
           fetches each photo once and keeps it for a year, and the finished JSON is cached in
           memory (cleared automatically whenever the admin adds / edits / deletes a product).
   The website code needs no change: it already uses product.image as an <img src>.
   ===================================================================== */
const LIST_CACHE_TTL_MS = 5 * 60 * 1000;
const LIST_CACHE_MAX_KEYS = 50;
const listCache = new Map(); // category ("" = all) -> { body, expires }
const clearProductCache = () => listCache.clear();

const imageUrl = (p) =>
  "/api/products/image/" + p._id + "?v=" + (p.updatedAt ? new Date(p.updatedAt).getTime() : 0);

// swaps an uploaded (base64) photo for its small URL; real links / site paths are left alone
function toPublic(p) {
  if (typeof p.image === "string" && SERVABLE_IMAGE.test(p.image.slice(0, 40))) p.image = imageUrl(p);
  return p;
}

async function loadPublicProducts(filter) {
  try {
    // The database itself checks "is this photo base64?" and does NOT send the big text over the network.
    const rows = await Product.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      {
        $addFields: {
          isData: {
            $regexMatch: {
              input: { $ifNull: ["$image", ""] },
              regex: "^data:image/(png|jpe?g|webp|gif|avif|bmp);base64,",
              options: "i",
            },
          },
        },
      },
      { $addFields: { image: { $cond: ["$isData", "", "$image"] } } },
      { $project: { __v: 0 } },
    ]);
    for (const p of rows) {
      if (p.isData) p.image = imageUrl(p);
      delete p.isData;
    }
    return rows;
  } catch (err) {
    // never let an optimisation break the shop: fall back to the plain query
    console.warn("Product list fast-path failed, using plain query:", err.message);
    const rows = await Product.find(filter).select("-__v").sort({ createdAt: -1 }).lean();
    return rows.map(toPublic);
  }
}

// GET /api/products  (public — used by website to show product listing)
async function getAllProducts(req, res) {
  try {
    const filter = { isActive: true };
    const category = typeof req.query.category === "string" ? req.query.category.slice(0, 80) : "";
    if (category) filter.category = category;

    const hit = listCache.get(category);
    let body;
    if (hit && hit.expires > Date.now()) {
      body = hit.body;
    } else {
      body = JSON.stringify(await loadPublicProducts(filter));
      if (listCache.size < LIST_CACHE_MAX_KEYS) {
        listCache.set(category, { body, expires: Date.now() + LIST_CACHE_TTL_MS });
      }
    }
    // short browser/CDN cache + ETag (Express adds it) so repeat visits get a tiny 304 reply
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.type("application/json").send(body);
  } catch (err) {
    console.error("getAllProducts error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/products/image/:id  (public — serves an uploaded product photo as a real image file)
async function getProductImage(req, res) {
  try {
    if (!isObjectId(req.params.id)) return res.status(404).end();
    const p = await Product.findOne({ _id: req.params.id, isActive: true }).select("image").lean();
    const m = p && typeof p.image === "string" && SERVABLE_IMAGE.exec(p.image.slice(0, 40));
    if (!m) return res.status(404).end();
    res.set({
      "Content-Type": m[1].toLowerCase(),
      // the URL changes (?v=) whenever the product is edited, so it is safe to cache for a year
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    });
    res.send(Buffer.from(p.image.slice(m[0].length), "base64"));
  } catch (err) {
    console.error("getProductImage error:", err.message);
    res.status(500).end();
  }
}

// GET /api/products/:slug  (public — used by product detail page)
async function getProductBySlug(req, res) {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true }).select("-__v").lean();
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json(toPublic(product));
  } catch (err) {
    console.error("getProductBySlug error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}

// GET /api/products/admin/all  (admin — includes inactive/hidden products too)
// Full data (including the base64 photo) because the admin edit form re-saves it.
async function getAllProductsAdmin(req, res) {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).lean();
    res.json(products);
  } catch (err) {
    console.error("getAllProductsAdmin error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}

// POST /api/products/admin/create  (admin — add new product)
async function createProduct(req, res) {
  try {
    const { error, fields } = readProductFields(req.body, { isCreate: true });
    if (error) return res.status(400).json({ message: error });

    const existing = await Product.findOne({ slug: fields.slug }).select("_id").lean();
    if (existing) {
      return res.status(409).json({ message: "A product with this slug already exists" });
    }

    const product = await Product.create(fields);
    clearProductCache();
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A product with this slug already exists" });
    }
    console.error("createProduct error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}

// PUT /api/products/admin/:id  (admin — edit product)
async function updateProduct(req, res) {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(404).json({ message: "Product not found" });
    }

    const { error, fields } = readProductFields(req.body, { isCreate: false });
    if (error) return res.status(400).json({ message: error });
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    if (fields.slug) {
      const clash = await Product.findOne({ slug: fields.slug, _id: { $ne: req.params.id } }).select("_id").lean();
      if (clash) return res.status(409).json({ message: "A product with this slug already exists" });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: fields },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    clearProductCache();
    res.json(product);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A product with this slug already exists" });
    }
    console.error("updateProduct error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}

// DELETE /api/products/admin/:id  (admin — delete product)
async function deleteProduct(req, res) {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(404).json({ message: "Product not found" });
    }
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    clearProductCache();
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("deleteProduct error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  getAllProducts,
  getProductImage,
  getProductBySlug,
  getAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
};