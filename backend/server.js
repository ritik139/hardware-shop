require("dotenv").config();

// ===== Fail fast with a clear message if .env is incomplete =====
const missingEnv = ["MONGO_URI", "JWT_SECRET"].filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error("❌ Missing required values in backend/.env: " + missingEnv.join(", "));
  console.error("   Copy backend/.env.example to backend/.env and fill it in.");
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 16) {
  console.warn("⚠️  JWT_SECRET is very short — use a long random string.");
}

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { rateLimit } = require("./middleware/rateLimit");
const { requireAdmin } = require("./middleware/authMiddleware");

const app = express();
const isProd = process.env.NODE_ENV === "production";

app.disable("x-powered-by");
// Behind a host/proxy (Render, Nginx, etc.) req.ip must come from X-Forwarded-For for rate limiting
if (isProd) app.set("trust proxy", 1);

// ===== Middleware =====
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.set("X-Frame-Options", "SAMEORIGIN");
  if (isProd) res.set("Strict-Transport-Security", "max-age=15552000"); // 180 days: browsers stay on https
  next();
});
// ===== Speed (helps mobile loading and Google rankings): gzip pages, CSS, JS and API JSON =====
let compression = null;
try { compression = require("compression"); }
catch (e) { console.warn("ℹ️  Tip: run 'npm install' in backend/ to get 'compression' (gzip = faster loading, better SEO)."); }
if (compression) app.use(compression());

// The site and the API share one origin, so CORS is only needed if you call the API from another domain.
// Optional: CORS_ORIGIN=https://www.korraz.in,https://korraz.in  (comma separated). Not set = same as before (open).
const corsOrigins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(corsOrigins.length ? cors({ origin: corsOrigins }) : cors());

// Body size limits: ONLY the logged-in admin product routes may send big base64 images (10 MB).
// Everything else (login, enquiry form...) is capped at 100 KB, so nobody can flood the server with huge requests.
// requireAdmin runs first, so strangers can't even make the server read a large body.
app.use("/api/products/admin", requireAdmin, express.json({ limit: "10mb" }));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use(cookieParser());

// API answers are private/live by default; the public product routes opt in to caching themselves
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// ===== SEO: server-filled <head> for product-detail.html =====
// WhatsApp / Facebook / X / LinkedIn previews and many search bots do not run JavaScript, so the
// per-product title, description and image that product-detail.html sets in the browser are
// invisible to them. Catalogue product links carry their data in the query string
// (?src=catalog&cat=..&name=..&img=..), so the same tags can be filled in here with no DB call.
// The page's own JS still runs afterwards and refines everything; this only fixes the first HTML.
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
// The 200 KB page template is kept in memory (re-read automatically if the file changes) instead of read from disk on every visit
const PRODUCT_DETAIL_FILE = path.join(__dirname, "..", "product-detail.html");
let templateCache = { mtimeMs: 0, html: null };
function getProductDetailTemplate(cb) {
  fs.stat(PRODUCT_DETAIL_FILE, (err, st) => {
    if (err) return cb(err);
    if (templateCache.html && templateCache.mtimeMs === st.mtimeMs) return cb(null, templateCache.html);
    fs.readFile(PRODUCT_DETAIL_FILE, "utf8", (err2, html) => {
      if (err2) return cb(err2);
      templateCache = { mtimeMs: st.mtimeMs, html };
      cb(null, html);
    });
  });
}
app.get("/product-detail.html", (req, res, next) => {
  const { src, cat, name, sub, img } = req.query;
  if (src !== "catalog" || typeof name !== "string" || !name.trim() || name.length > 120) return next();
  getProductDetailTemplate((err, html) => {
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
    html = html.replace(/<title>[\s\S]*?<\/title>/, () => "<title>" + escHtml(title) + "</title>");
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

// ===== Never serve private project files =====
// The website root is the folder ABOVE backend/, so without this guard the backend source code,
// package files, node_modules and the .git folder (full code history) could be downloaded by anyone.
app.use((req, res, next) => {
  let p;
  try { p = decodeURIComponent(req.path).replace(/\\/g, "/").toLowerCase(); }
  catch (e) { return res.status(400).send("Bad request"); }
  if (/^\/(backend|node_modules)(\/|$)/.test(p) || /(^|\/)\.[^/]/.test(p)) {
    return res.status(404).send("Not found");
  }
  next();
});

// Serve the public website (index.html, products.html, etc.)
// NOTE: site files are one level ABOVE backend/, not in a "public" folder
app.use(express.static(path.join(__dirname, ".."), {
  dotfiles: "deny",
  // product photos/icons/fonts rarely change: let browsers keep them for 7 days (repeat visits load faster)
  setHeaders: (res, filePath) => {
    if (/\.(jpe?g|png|webp|avif|gif|svg|ico|woff2?)$/i.test(filePath)) res.setHeader("Cache-Control", "public, max-age=604800");
  },
}));
// Serve the admin panel UI
app.use("/admin-panel", express.static(path.join(__dirname, "admin-panel")));

// ===== Routes =====
const adminRoutes = require("./routes/adminRoutes");
const productRoutes = require("./routes/productRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const { ensureDefaultAdmin } = require("./controllers/adminController");

// Slow down password guessing and enquiry-form spam (per IP)
app.use("/api/admin/login", rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: "Too many login attempts. Please try again in 15 minutes.",
}));
app.post("/api/enquiries", rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  message: "Too many enquiries from this connection. Please call or WhatsApp us instead.",
}));

app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/enquiries", enquiryRoutes);

app.get("/api/health", (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.json({
    status: dbUp ? "ok" : "degraded",
    db: dbUp ? "connected" : "disconnected",
    message: "Korraz backend is running",
  });
});

// Unknown /api URLs get a JSON 404 (not an HTML page)
app.use("/api", (req, res) => res.status(404).json({ message: "API route not found" }));

// Central error handler: bad JSON, oversized uploads, unexpected crashes
app.use((err, req, res, next) => {
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request too large — please use a smaller image." });
  }
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON in request" });
  }
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status((err && err.status) || 500).json({ message: "Server error" });
});

// ===== Start: connect to MongoDB first, create the default admin (from .env) if none exists yet, then accept traffic =====
const PORT = process.env.PORT || 5000;
let server;

(async () => {
  await connectDB();
  await ensureDefaultAdmin();
  server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
  // slightly longer than the 60s idle timeout most hosts/proxies use, so they never hit a half-closed connection (random 502s)
  server.keepAliveTimeout = 65 * 1000;
  server.headersTimeout = 66 * 1000;
})();

// ===== Stability: log instead of dying silently, and shut down cleanly when the host restarts the app =====
process.on("unhandledRejection", (reason) => console.error("Unhandled promise rejection:", reason));
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1); // the host (Render / pm2) starts a fresh copy
});
function shutdown(signal) {
  console.log(`${signal} received — shutting down…`);
  setTimeout(() => process.exit(1), 10000).unref(); // safety net
  if (!server) return process.exit(0);
  server.close(async () => {
    try { await mongoose.connection.close(); } catch (e) { /* ignore */ }
    process.exit(0);
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));