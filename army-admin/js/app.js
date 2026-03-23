/* ═══════════════════════════════════════════════
   Army Bank Admin — app.js
   ═══════════════════════════════════════════════ */

/* ── UTILS ── */
function fmt(date) {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleString('uk-UA', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return date; }
}

function fmtMoney(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₴';
}

function badge(cls, label) {
  return `<span class="badge badge-${cls}">${label}</span>`;
}

function roleBadge(role) {
  const map = { soldier: 'Солдат', operator: 'Оператор', admin: 'Адмін', platform_admin: 'Plt Admin' };
  return badge(role, map[role] || role);
}

function txTypeBadge(type) {
  const map = { payout: 'Виплата', donation: 'Донат', transfer: 'Переказ', deposit: 'Депозит', withdrawal: 'Зняття' };
  return badge(type, map[type] || type);
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.add('hidden'), 3500);
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

/* ── STATE ── */
let currentPage = 'dashboard';
let modalUserId = null;
let selectedPayoutUser = null;
let txOffset = 0;
const TX_LIMIT = 50;

/* ══════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════ */
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const section = document.getElementById(`page-${page}`);
  if (section) section.classList.add('active');
  const navItem = document.querySelector(`[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');
  const titles = { dashboard: 'Дешборд', users: 'Користувачі', transactions: 'Транзакції', payouts: 'Виплати', audit: 'Аудит' };
  document.getElementById('topbarTitle').textContent = titles[page] || page;
  closeSidebar();
  loadPage(page);
}

function loadPage(page) {
  switch (page) {
    case 'dashboard':    loadDashboard(); break;
    case 'users':        loadUsers(); break;
    case 'transactions': loadTransactions(); break;
    case 'audit':        loadAuditLogs(); break;
  }
}

/* ── SIDEBAR MOBILE ── */
let overlay = null;
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', closeSidebar);
    document.body.appendChild(overlay);
  }
  overlay.classList.add('visible');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  if (overlay) overlay.classList.remove('visible');
}

/* ══════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════ */
function showAuth() {
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('adminApp').classList.add('hidden');
}
function showApp(user) {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('adminApp').classList.remove('hidden');
  const initials = (user.full_name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('sidebarAvatar').textContent = initials;
  document.getElementById('sidebarName').textContent = user.full_name || user.email;
  document.getElementById('sidebarRole').textContent = user.role;
  navigate('dashboard');
}

async function tryAutoLogin() {
  if (!api.token) { showAuth(); return; }
  try {
    const res = await api.me();
    const user = res.data;
    if (!['admin', 'platform_admin'].includes(user?.role)) {
      showToast('Недостатньо прав.', 'error');
      api.setToken('');
      showAuth();
      return;
    }
    showApp(user);
  } catch {
    showAuth();
  }
}

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const identity = document.getElementById('loginIdentity').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'Вхід…';
  try {
    const res = await api.login(identity, password);
    const user = res.data?.user || res.user;
    api.setToken(res.data?.token || res.token);
    if (!['admin', 'platform_admin'].includes(user?.role)) {
      api.setToken('');
      errEl.textContent = 'Доступ лише для адміністраторів.';
      errEl.classList.remove('hidden');
      return;
    }
    showApp(user);
  } catch (err) {
    errEl.textContent = err.message || 'Помилка авторизації.';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Увійти';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await api.logout();
  api.setToken('');
  showAuth();
});

window.addEventListener('admin:unauthorized', () => showAuth());

/* ══════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════ */
async function loadDashboard() {
  try {
    const res = await api.stats();
    const d = res.data;

    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Всього користувачів</div>
        <div class="stat-value">${d.total_users}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Загальний баланс</div>
        <div class="stat-value gold">${fmtMoney(d.total_balance)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Транзакцій</div>
        <div class="stat-value">${d.total_tx}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Виплачено</div>
        <div class="stat-value green">${fmtMoney(d.total_payouts)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Донати</div>
        <div class="stat-value gold">${fmtMoney(d.total_donations)}</div>
      </div>
    `;

    const roleNames = { soldier: 'Солдат', operator: 'Оператор', admin: 'Адмін', platform_admin: 'Platform Admin' };
    document.getElementById('rolesGrid').innerHTML = (d.by_role || []).map(r =>
      `<div class="role-badge">${roleNames[r.role] || r.role} <b>${r.cnt}</b></div>`
    ).join('');

    document.getElementById('recentTxBody').innerHTML = (d.recent_tx || []).map(tx => `
      <tr>
        <td style="font-size:.8rem;color:var(--text-muted)">${fmt(tx.created_at)}</td>
        <td><code style="font-size:.78rem">${escHtml(tx.account_number)}</code></td>
        <td>${txTypeBadge(tx.tx_type)}</td>
        <td>${badge(tx.direction === 'in' ? 'in' : 'out', tx.direction === 'in' ? '↑' : '↓')}</td>
        <td class="${tx.direction === 'in' ? 'amount-in' : 'amount-out'}">${fmtMoney(tx.amount)}</td>
        <td style="color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis">${escHtml(tx.description || '—')}</td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Помилка дешборду: ' + err.message, 'error');
  }
}

document.getElementById('refreshStats').addEventListener('click', loadDashboard);

/* ══════════════════════════════════════════════
   USERS
══════════════════════════════════════════════ */
async function loadUsers() {
  const search = document.getElementById('userSearch').value.trim();
  const role = document.getElementById('userRoleFilter').value;
  try {
    const params = {};
    if (search) params.search = search;
    if (role)   params.role   = role;
    const res = await api.listUsers(params);
    const users = res.data || [];
    const empty = document.getElementById('usersEmpty');
    const tbody = document.getElementById('usersBody');
    if (!users.length) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    tbody.innerHTML = users.map(u => `
      <tr>
        <td style="color:var(--text-muted);font-size:.8rem">${u.id}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:28px;height:28px;border-radius:50%;background:var(--sand);color:#0a0a0a;font-weight:700;font-size:.7rem;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${escHtml((u.full_name || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase())}
            </div>
            <b>${escHtml(u.full_name)}</b>
          </div>
        </td>
        <td style="font-size:.82rem">${escHtml(u.phone || '—')}</td>
        <td style="color:var(--text-muted);font-size:.82rem">${escHtml(u.email || '—')}</td>
        <td>${roleBadge(u.role)}</td>
        <td style="color:var(--text-muted);font-size:.78rem">${fmt(u.created_at)}</td>
        <td><button class="btn-table" onclick="openUserModal(${u.id})">Деталі →</button></td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Помилка: ' + err.message, 'error');
  }
}

// Debounced search
const debouncedSearch = debounce(loadUsers, 380);
document.getElementById('userSearch').addEventListener('input', debouncedSearch);
document.getElementById('userRoleFilter').addEventListener('change', loadUsers);
document.getElementById('searchUsersBtn').addEventListener('click', loadUsers);

/* ── USER MODAL ── */
function switchModalTab(tab) {
  document.querySelectorAll('.modal-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.modal-tab-content').forEach(c => {
    const show = c.id === `tab-${tab}`;
    c.classList.toggle('active', show);
    c.classList.toggle('hidden', !show);
  });
  if (tab === 'txs' && modalUserId) loadModalTxs(modalUserId);
}

async function openUserModal(userId) {
  modalUserId = userId;
  document.getElementById('userModal').classList.remove('hidden');
  // Reset tabs to info
  switchModalTab('info');
  // Reset action messages
  ['roleChangeMsg', 'payoutMsg'].forEach(id => {
    const el = document.getElementById(id);
    el.className = 'form-msg hidden';
    el.textContent = '';
  });
  document.getElementById('mPayoutAmount').value = '';
  document.getElementById('mPayoutTitle').value  = '';

  try {
    const res = await api.getUser(userId);
    const u = res.data;
    const initials = (u.full_name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('modalAvatar').textContent = initials;
    document.getElementById('modalUserName').textContent = u.full_name;
    document.getElementById('modalUserRoleBadge').innerHTML = roleBadge(u.role);
    document.getElementById('mUserId').textContent      = u.id;
    document.getElementById('mUserEmail').textContent   = u.email || '—';
    document.getElementById('mUserPhone').textContent   = u.phone || '—';
    document.getElementById('mUserRole').innerHTML      = roleBadge(u.role);
    document.getElementById('mUserStatus').textContent  = u.military_status || '—';
    document.getElementById('mUserCreated').textContent = fmt(u.created_at);
    document.getElementById('mRoleSelect').value        = u.role;
    if (u.account) {
      document.getElementById('mAccNumber').textContent  = u.account.account_number;
      document.getElementById('mAccBalance').textContent = fmtMoney(u.account.balance);
      document.getElementById('mAccountSection').style.display = '';
    } else {
      document.getElementById('mAccountSection').style.display = 'none';
    }
  } catch (err) {
    showToast('Помилка: ' + err.message, 'error');
    closeUserModal();
  }
}
window.openUserModal = openUserModal;

async function loadModalTxs(userId) {
  const loading = document.getElementById('mTxLoading');
  const wrap    = document.getElementById('mTxWrap');
  const empty   = document.getElementById('mTxEmpty');
  loading.style.display = 'block';
  wrap.style.display    = 'none';
  empty.style.display   = 'none';
  try {
    const res = await api.getUserTransactions(userId, 100);
    const txs = res.data || [];
    loading.style.display = 'none';
    if (!txs.length) { empty.style.display = 'block'; return; }
    wrap.style.display = 'block';
    document.getElementById('mTxBody').innerHTML = txs.map(tx => `
      <tr>
        <td style="font-size:.78rem;color:var(--text-muted);white-space:nowrap">${fmt(tx.created_at)}</td>
        <td>${txTypeBadge(tx.tx_type)}</td>
        <td>${badge(tx.direction === 'in' ? 'in' : 'out', tx.direction === 'in' ? '↑' : '↓')}</td>
        <td class="${tx.direction === 'in' ? 'amount-in' : 'amount-out'}">${fmtMoney(tx.amount)}</td>
        <td style="font-size:.78rem;color:var(--text-muted);max-width:160px;overflow:hidden;text-overflow:ellipsis">${escHtml(tx.description || '—')}</td>
      </tr>
    `).join('');
  } catch (err) {
    loading.textContent = 'Помилка завантаження.';
  }
}

function closeUserModal() {
  document.getElementById('userModal').classList.add('hidden');
  modalUserId = null;
}

document.getElementById('modalClose').addEventListener('click', closeUserModal);
document.getElementById('userModal').addEventListener('click', e => {
  if (e.target === document.getElementById('userModal')) closeUserModal();
});
document.querySelectorAll('.modal-tab').forEach(btn => {
  btn.addEventListener('click', () => switchModalTab(btn.dataset.tab));
});

document.getElementById('saveRoleBtn').addEventListener('click', async () => {
  if (!modalUserId) return;
  const role  = document.getElementById('mRoleSelect').value;
  const msgEl = document.getElementById('roleChangeMsg');
  try {
    await api.updateRole(modalUserId, role);
    msgEl.textContent  = 'Роль оновлено!';
    msgEl.className    = 'form-msg success';
    document.getElementById('mUserRole').innerHTML        = roleBadge(role);
    document.getElementById('modalUserRoleBadge').innerHTML = roleBadge(role);
    showToast('Роль оновлено', 'success');
    loadUsers();
  } catch (err) {
    msgEl.textContent = err.message;
    msgEl.className   = 'form-msg error';
  }
});

document.getElementById('mPayoutBtn').addEventListener('click', async () => {
  if (!modalUserId) return;
  const amount = parseFloat(document.getElementById('mPayoutAmount').value);
  const title  = document.getElementById('mPayoutTitle').value.trim() || 'Бойова виплата';
  const msgEl  = document.getElementById('payoutMsg');
  if (!amount || amount <= 0) {
    msgEl.textContent = 'Вкажіть коректну суму.';
    msgEl.className   = 'form-msg error';
    return;
  }
  try {
    const res = await api.createPayout({ user_id: modalUserId, amount, title });
    msgEl.textContent = `✓ Нараховано ${fmtMoney(amount)}. Баланс: ${fmtMoney(res.data.new_balance)}`;
    msgEl.className   = 'form-msg success';
    document.getElementById('mAccBalance').textContent = fmtMoney(res.data.new_balance);
    document.getElementById('mPayoutAmount').value = '';
    document.getElementById('mPayoutTitle').value  = '';
    showToast('Виплату нараховано', 'success');
  } catch (err) {
    msgEl.textContent = err.message;
    msgEl.className   = 'form-msg error';
  }
});

/* ══════════════════════════════════════════════
   TRANSACTIONS
══════════════════════════════════════════════ */
async function loadTransactions(offset = 0) {
  txOffset = offset;
  const params = { limit: TX_LIMIT, offset };
  const txType = document.getElementById('txTypeFilter').value;
  const dir    = document.getElementById('txDirFilter').value;
  const from   = document.getElementById('txFromDate').value;
  const to     = document.getElementById('txToDate').value;
  if (txType) params.tx_type   = txType;
  if (dir)    params.direction = dir;
  if (from)   params.from_date = from;
  if (to)     params.to_date   = to;

  try {
    const res   = await api.listTransactions(params);
    const rows  = res.data  || [];
    const total = res.total || 0;

    document.getElementById('txCount').textContent = `${total} транзакцій`;

    document.getElementById('txBody').innerHTML = rows.map(tx => `
      <tr>
        <td style="font-size:.8rem;color:var(--text-muted);white-space:nowrap">${fmt(tx.created_at)}</td>
        <td style="font-size:.82rem">${escHtml(tx.full_name || '—')}</td>
        <td><code style="font-size:.78rem">${escHtml(tx.account_number || '—')}</code></td>
        <td>${txTypeBadge(tx.tx_type)}</td>
        <td>${badge(tx.direction === 'in' ? 'in' : 'out', tx.direction === 'in' ? '↑ Зарах.' : '↓ Список.')}</td>
        <td class="${tx.direction === 'in' ? 'amount-in' : 'amount-out'}">${fmtMoney(tx.amount)}</td>
        <td style="font-size:.82rem;color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis">${escHtml(tx.description || '—')}</td>
      </tr>
    `).join('');

    renderPagination(total, offset, TX_LIMIT);
  } catch (err) {
    showToast('Помилка: ' + err.message, 'error');
  }
}

function renderPagination(total, offset, limit) {
  const bar   = document.getElementById('txPagination');
  const pages = Math.ceil(total / limit);
  const cur   = Math.floor(offset / limit);
  if (pages <= 1) { bar.innerHTML = ''; return; }

  let html = `<button class="page-btn" ${cur === 0 ? 'disabled' : ''} onclick="loadTransactions(${(cur - 1) * limit})">‹</button>`;
  const start = Math.max(0, cur - 2);
  const end   = Math.min(pages - 1, cur + 2);
  if (start > 0) {
    html += `<button class="page-btn" onclick="loadTransactions(0)">1</button>`;
    if (start > 1) html += `<span style="color:var(--text-muted);padding:0 4px">…</span>`;
  }
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === cur ? 'active' : ''}" onclick="loadTransactions(${i * limit})">${i + 1}</button>`;
  }
  if (end < pages - 1) {
    if (end < pages - 2) html += `<span style="color:var(--text-muted);padding:0 4px">…</span>`;
    html += `<button class="page-btn" onclick="loadTransactions(${(pages - 1) * limit})">${pages}</button>`;
  }
  html += `<button class="page-btn" ${cur >= pages - 1 ? 'disabled' : ''} onclick="loadTransactions(${(cur + 1) * limit})">›</button>`;
  bar.innerHTML = html;
}

document.getElementById('filterTxBtn').addEventListener('click', () => loadTransactions(0));

/* ══════════════════════════════════════════════
   PAYOUTS PAGE
══════════════════════════════════════════════ */
const debouncedPayoutSearch = debounce(async (q) => {
  if (q.length < 2) { document.getElementById('payoutUserDropdown').classList.add('hidden'); return; }
  try {
    const res   = await api.listUsers({ search: q });
    const users = (res.data || []).slice(0, 8);
    const dd    = document.getElementById('payoutUserDropdown');
    if (!users.length) { dd.classList.add('hidden'); return; }
    dd.innerHTML = users.map(u => `
      <div class="dropdown-item" onclick="selectPayoutUser(${u.id}, '${escHtml(u.full_name)}', '${escHtml(u.phone || u.email || '')}')">
        <div class="d-name">${escHtml(u.full_name)}</div>
        <div class="d-sub">${escHtml(u.phone || '')} ${escHtml(u.email || '')}</div>
      </div>
    `).join('');
    dd.classList.remove('hidden');
  } catch {}
}, 350);

document.getElementById('payoutUserSearch').addEventListener('input', e => debouncedPayoutSearch(e.target.value.trim()));

function selectPayoutUser(id, name, sub) {
  selectedPayoutUser = id;
  document.getElementById('payoutUserSearch').value = '';
  document.getElementById('payoutUserDropdown').classList.add('hidden');
  document.getElementById('selectedUserChip').classList.remove('hidden');
  document.getElementById('selectedUserName').textContent = `${name}${sub ? ' — ' + sub : ''}`;
  document.getElementById('submitPayoutBtn').disabled = false;
}
window.selectPayoutUser = selectPayoutUser;

document.getElementById('clearSelectedUser').addEventListener('click', () => {
  selectedPayoutUser = null;
  document.getElementById('selectedUserChip').classList.add('hidden');
  document.getElementById('submitPayoutBtn').disabled = true;
});

document.getElementById('submitPayoutBtn').addEventListener('click', async () => {
  if (!selectedPayoutUser) return;
  const amount      = parseFloat(document.getElementById('payoutAmount').value);
  const title       = document.getElementById('payoutTitle').value.trim() || 'Бойова виплата';
  const payout_type = document.getElementById('payoutType').value;
  const msgEl       = document.getElementById('payoutFormMsg');
  if (!amount || amount <= 0) {
    msgEl.textContent = 'Вкажіть коректну суму.';
    msgEl.className   = 'form-msg error';
    return;
  }
  try {
    const res = await api.createPayout({ user_id: selectedPayoutUser, amount, title, payout_type });
    msgEl.textContent = `✓ Виплату ${fmtMoney(amount)} нараховано успішно.`;
    msgEl.className   = 'form-msg success';
    document.getElementById('payoutAmount').value = '';
    document.getElementById('payoutTitle').value  = '';
    showToast('Виплату нараховано', 'success');
  } catch (err) {
    msgEl.textContent = err.message;
    msgEl.className   = 'form-msg error';
  }
});

/* ══════════════════════════════════════════════
   AUDIT LOG
══════════════════════════════════════════════ */
async function loadAuditLogs() {
  try {
    const res  = await api.listAuditLogs({ limit: 200 });
    const logs = res.data || [];
    const eventLabels = {
      login: 'Вхід', logout: 'Вихід', register: 'Реєстрація',
      payout_received: 'Виплата', admin_payout: 'Адмін: виплата',
      admin_role_change: 'Зміна ролі', donation: 'Донат',
      transfer_out: 'Переказ (вих.)', transfer_in: 'Переказ (вх.)',
      withdrawal: 'Зняття', deposit: 'Депозит',
    };
    document.getElementById('auditBody').innerHTML = logs.map(l => `
      <tr>
        <td style="color:var(--text-muted);font-size:.8rem;white-space:nowrap">${fmt(l.created_at)}</td>
        <td style="color:var(--text-muted);font-size:.82rem">${l.user_id || '—'}</td>
        <td><span class="badge" style="background:rgba(255,255,255,.06);color:var(--text)">${eventLabels[l.action] || escHtml(l.action)}</span></td>
        <td style="font-size:.82rem;color:var(--text-muted);max-width:350px;overflow:hidden;text-overflow:ellipsis">${escHtml(l.details || '—')}</td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Помилка: ' + err.message, 'error');
  }
}

document.getElementById('refreshAudit').addEventListener('click', loadAuditLogs);

/* ══════════════════════════════════════════════
   NAV BINDINGS
══════════════════════════════════════════════ */
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => { e.preventDefault(); navigate(item.dataset.page); });
});

document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.contains('open') ? closeSidebar() : openSidebar();
});

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
tryAutoLogin();
