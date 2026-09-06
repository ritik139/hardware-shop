// ===== API helper: always sends the cookie + Authorization header =====
async function adminFetch(url, options = {}) {
  const token = localStorage.getItem('korraz_admin_token');
  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    options.headers || {},
    token ? { Authorization: 'Bearer ' + token } : {}
  );
  const res = await fetch(url, { ...options, headers, credentials: 'include' });
  if (res.status === 401) {
    localStorage.removeItem('korraz_admin_token');
    window.location.href = 'login.html';
    throw new Error('Not authenticated');
  }
  return res;
}

// ===== Guard: run on every protected page before anything else =====
async function requireAdminAuth() {
  try {
    const res = await adminFetch('/api/admin/check');
    if (!res.ok) window.location.href = 'login.html';
  } catch (e) {
    // adminFetch already redirects on 401
  }
}

// ===== Sidebar: highlights the current page + wires the logout button =====
function initSidebar(activePage) {
  document.querySelectorAll('.sidebar nav a').forEach((a) => {
    if (a.dataset.page === activePage) a.classList.add('active');
  });
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await adminFetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
      localStorage.removeItem('korraz_admin_token');
      window.location.href = 'login.html';
    });
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(d) {
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}