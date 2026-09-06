/* =========================================================
   KORRAZ SHARED SCRIPT
   Auto-extracted from inline <script> blocks across all pages.
   Safe to include on every page: each block only touches
   elements when they actually exist on the current page.
   ========================================================= */

/* ---------- Shared header + reveal-on-scroll (all pages) ---------- */
const header = document.getElementById('siteHeader');
const topBar = document.querySelector('.top-bar');
if (header) {
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY > 40;
    header.classList.toggle('scrolled', scrolled);
    if (topBar) topBar.classList.toggle('hide', scrolled);
  });
}

/* ---------- Header: search toggle ---------- */
const searchToggle = document.getElementById('searchToggle');
const navSearchPanel = document.getElementById('navSearchPanel');
if (searchToggle && navSearchPanel) {
  searchToggle.addEventListener('click', () => {
    navSearchPanel.classList.toggle('open');
    if (navSearchPanel.classList.contains('open')) {
      navSearchPanel.querySelector('input').focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!navSearchPanel.contains(e.target) && e.target !== searchToggle && !searchToggle.contains(e.target)) {
      navSearchPanel.classList.remove('open');
    }
  });
}
function handleNavSearch(e) {
  e.preventDefault();
  const q = e.target.q.value.trim();
  window.location.href = 'products.html' + (q ? ('?q=' + encodeURIComponent(q)) : '');
  return false;
}

/* ---------- Header: mobile menu ---------- */
const menuToggle = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');
const menuScrim = document.getElementById('menuScrim');
function closeMobileMenu() {
  if (mobileMenu) mobileMenu.classList.remove('open');
  if (menuScrim) menuScrim.classList.remove('open');
}
if (menuToggle && mobileMenu) {
  menuToggle.addEventListener('click', () => {
    mobileMenu.classList.add('open');
    if (menuScrim) menuScrim.classList.add('open');
  });
}
if (menuScrim) menuScrim.addEventListener('click', closeMobileMenu);
if (mobileMenu) {
  mobileMenu.querySelectorAll('.has-dropdown > a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      link.closest('.has-dropdown').classList.toggle('open');
    });
  });
  mobileMenu.querySelectorAll('a:not(.has-dropdown > a)').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });
}

/* ---------- Header: wishlist / cart badge counts ---------- */
(function initBadges() {
  const wishlist = JSON.parse(localStorage.getItem('koraaz_wishlist') || '[]');
  const cart = JSON.parse(localStorage.getItem('koraaz_cart') || '[]');
  document.querySelectorAll('[data-badge="wishlist"]').forEach(el => {
    el.textContent = wishlist.length;
    el.classList.toggle('zero', wishlist.length === 0);
  });
  document.querySelectorAll('[data-badge="cart"]').forEach(el => {
    el.textContent = cart.length;
    el.classList.toggle('zero', cart.length === 0);
  });
})();

const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal, .pcard').forEach(el => io.observe(el));

/* ---------- Newsletter subscribe handler (all pages) ---------- */
function handleSubscribe(e) {
  e.preventDefault();
  alert('Thanks for subscribing! (Backend integration coming soon)');
  e.target.reset();
  return false;
}

/* ---------- Contact enquiry form handler (contact.html) ---------- */
function handleContactForm(e) {
  e.preventDefault();
  alert('Thanks for reaching out! We\'ll get back to you shortly. (Backend integration coming soon)');
  e.target.reset();
  return false;
}

/* ---------- Home page (index.html): hero slider dots + stats count-up ---------- */
const heroDots = document.querySelectorAll('.hero-dots button');
if (heroDots.length) {
  let slideIdx = 0;
  setInterval(() => {
    slideIdx = (slideIdx + 1) % heroDots.length;
    heroDots.forEach((d, i) => d.classList.toggle('active', i === slideIdx));
  }, 7000);
  heroDots.forEach((d, i) => d.addEventListener('click', () => {
    slideIdx = i;
    heroDots.forEach((dd, ii) => dd.classList.toggle('active', ii === slideIdx));
  }));
}

const statNums = document.querySelectorAll('.stat-num');
const statIO = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const el = e.target;
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const duration = 1400;
      const start = performance.now();
      function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      statIO.unobserve(el);
    }
  });
}, { threshold: 0.4 });
statNums.forEach(el => statIO.observe(el));

/* ---------- Gallery page (gallery.html): filter buttons ---------- */
document.querySelectorAll('.gfilter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.gfilter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    document.querySelectorAll('.gallery-tile').forEach(tile => {
      if (filter === 'all' || tile.dataset.cat === filter) {
        tile.classList.remove('hide');
      } else {
        tile.classList.add('hide');
      }
    });
  });
});