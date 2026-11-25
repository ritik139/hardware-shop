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

// ===== SEO: server-filled <head> for product-detail.html =====
// WhatsApp / Facebook / X / LinkedIn previews and many search bots do not run JavaScript, so the
// per-product title, description and image that product-detail.html sets in the browser are
// invisible to them. Catalogue product links carry their data in the query string
// (?src=catalog&cat=..&name=..&img=..), so the same tags can be filled in here with no DB call.
// The page's own JS still runs afterwards and refines everything; this only fixes the first HTML.
const fs = require("fs");
const SITE_ORIGIN = "https://www.korraz.in/";
const escHtml = (v) =>
  String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clip = (str, max) => {
  str = String(str).replace(/\s+/g, " ").trim();
  if (str.length <= max) return str;
  return str.slice(0, max - 1).replace(/\s+\S*$/, "").replace(/[\s,;:·—–-]+$/, "") + "…";
};
function setMetaTag(html, attr, key, value) {
  const re = new RegExp('(<meta\\s+' + attr + '="' + key + '"\\s+content=")[^"]*(")');
  return html.replace(re, (m, a, b) => a + escHtml(value) + b);
}
app.get("/product-detail.html", (req, res, next) => {
  const { src, cat, name, sub, img } = req.query;
  if (src !== "catalog" || typeof name !== "string" || !name.trim() || name.length > 120) return next();
  fs.readFile(path.join(__dirname, "..", "product-detail.html"), "utf8", (err, html) => {
    if (err) return next();
    const category = typeof cat === "string" ? cat.slice(0, 80) : "";
    const lowName = name.toLowerCase();
    const covered = !category || category.toLowerCase().split(/\s+/).every((w) => lowName.includes(w));
    const title = (covered ? name + " | Korraz" : name + " – " + category + " | Korraz").slice(0, 90);
    const subText = typeof sub === "string" ? sub.replace(/\s*·\s*/g, ", ").trim() : "";
    const desc = clip(
      (subText ? name + " — " + subText : name) + ". By Korraz, Mumbai — pan-India delivery. Enquire for bulk pricing.",
      158
    );
    const qs = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
    const url = SITE_ORIGIN + "product-detail.html" + qs;
    // only images that live in this site's own /images folder (never an arbitrary external URL)
    let image = SITE_ORIGIN + "images/catalog-demo/cheshhandlemain-hero.jpg";
    if (typeof img === "string" && /^images\//.test(img) && !img.includes("..")) {
      try { image = new URL(img, SITE_ORIGIN).href; } catch (e) { /* keep default */ }
    }
    html = html.replace(/<title>[\s\S]*?<\/title>/, "<title>" + escHtml(title) + "</title>");
    html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, (m, a, b) => a + escHtml(url) + b);
    html = setMetaTag(html, "name", "description", desc);
    html = setMetaTag(html, "property", "og:title", title);
    html = setMetaTag(html, "property", "og:description", desc);
    html = setMetaTag(html, "property", "og:url", url);
    html = setMetaTag(html, "property", "og:image", image);
    html = setMetaTag(html, "property", "og:image:alt", name);
    html = html.replace(/<meta property="og:image:(width|height)"[^>]*>\s*/g, "");
    html = setMetaTag(html, "name", "twitter:title", title);
    html = setMetaTag(html, "name", "twitter:description", desc);
    html = setMetaTag(html, "name", "twitter:image", image);
    html = setMetaTag(html, "name", "twitter:image:alt", name);
    res.type("html").send(html);
  });
});

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