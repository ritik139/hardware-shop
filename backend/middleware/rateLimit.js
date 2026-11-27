/**
 * Tiny in-memory rate limiter (no extra npm package needed).
 * Used to slow down password guessing on /api/admin/login and spam on the enquiry form.
 * Counts are kept per IP and reset when the window ends (or when the server restarts).
 */
function rateLimit({ windowMs, max, message }) {
  const hits = new Map(); // ip -> { count, resetAt }

  // clean old entries so the Map never grows forever
  const cleaner = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  cleaner.unref();

  return function limiter(req, res, next) {
    const now = Date.now();
    const key = req.ip;
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ message });
    }
    next();
  };
}

module.exports = { rateLimit };