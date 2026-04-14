/* ═══════════════════════════════════════════════
   Army Bank Admin — api.js
   ═══════════════════════════════════════════════ */

const API_BASE = 'https://army-bank.onrender.com';
const TOKEN_KEY = 'army_admin_token';

class AdminAPI {
  get token() { return localStorage.getItem(TOKEN_KEY) || ''; }
  setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }

  async request(method, path, body = null) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);

    const refreshed = res.headers.get('X-Refresh-Token');
    if (refreshed && refreshed !== this.token) this.setToken(refreshed);

    if (res.status === 401) {
      this.setToken('');
      window.dispatchEvent(new Event('admin:unauthorized'));
    }

    const json = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
    if (!json.ok) throw new Error(json.error || 'Помилка запиту');
    return json;
  }

  get(path)         { return this.request('GET', path); }
  post(path, body)  { return this.request('POST', path, body); }
  patch(path, body) { return this.request('PATCH', path, body); }

  // ── Auth ──
  login(identity, password) { return this.post('/api/auth/login', { identity, password }); }
  logout()  { return this.post('/api/auth/logout').catch(() => {}); }
  me()      { return this.get('/api/auth/me'); }

  // ── Admin ──
  stats()   { return this.get('/api/admin/stats'); }

  listUsers(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/admin/users${q ? '?' + q : ''}`);
  }
  getUser(id)          { return this.get(`/api/admin/users/${id}`); }
  getUserTransactions(id, limit = 50) {
    return this.get(`/api/admin/users/${id}/transactions?limit=${limit}`);
  }
  updateRole(id, role) { return this.patch(`/api/admin/users/${id}/role`, { role }); }

  listTransactions(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/admin/transactions${q ? '?' + q : ''}`);
  }
  createPayout(data)   { return this.post('/api/admin/payouts', data); }

  listAuditLogs(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/admin/audit-logs${q ? '?' + q : ''}`);
  }

  // ── Compliance / KYC ──
  complianceStats() {
    return this.get('/api/admin/compliance/stats');
  }

  complianceUsers(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/admin/compliance/users${q ? '?' + q : ''}`);
  }

  complianceUser(id) {
    return this.get(`/api/admin/compliance/users/${id}`);
  }

  updateCompliance(id, payload) {
    return this.patch(`/api/admin/compliance/users/${id}`, payload);
  }

  verifyPassport(id, payload) {
    return this.post(`/api/admin/compliance/users/${id}/verify-passport`, payload);
  }

  analyticsOverview() {
    return this.get('/api/admin/analytics/overview');
  }

  messengerAnalytics() {
    return this.get('/api/admin/analytics/messenger');
  }
}

window.api = new AdminAPI();
