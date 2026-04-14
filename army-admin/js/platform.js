// Сторінка платформенного адміна
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function showToast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2600);
}

function formatMoney(v) {
  return `₴${Number(v || 0).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function basePath() {
  return (typeof window !== 'undefined' && window.ARMY_BANK_BASE) || '';
}

async function checkPlatformAdmin() {
  if (!api.token) {
    window.location.href = basePath() || '/';
    return null;
  }
  try {
    const user = await api.request('/api/auth/me');
    if (user.role !== 'platform_admin') {
      window.location.href = (basePath() || '') + '/dashboard';
      return null;
    }
    return user;
  } catch (_) {
    api.setToken('');
    window.location.href = basePath() || '/';
    return null;
  }
}

function switchTab(tabId) {
  $$('.admin-tab').forEach((el) => el.classList.add('hidden'));
  $(`#${tabId}Tab`)?.classList.remove('hidden');
  $$('.menu-btn[data-tab]').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tabId));
  if (tabId === 'overview') loadOverview();
  if (tabId === 'users') loadPlatformUsers();
  if (tabId === 'transactions') loadPlatformTransactions();
  if (tabId === 'audit') loadPlatformAudit();
}

async function loadOverview() {
  const el = $('#overviewStats');
  el.classList.add('loading');
  el.innerHTML = '<div class="empty-state">Завантаження…</div>';
  try {
    const stats = await api.request('/api/platform/overview');
    const txByType = (stats.transactions_by_type || []).reduce((acc, r) => {
      const k = `${r.tx_type}:${r.direction}`;
      acc[k] = acc[k] || { count: 0, total: 0 };
      acc[k].count += r.count;
      acc[k].total += r.total;
      return acc;
    }, {});
    el.classList.remove('loading');
    el.innerHTML = `
      <div class="stat-card"><div class="stat-val">${stats.users_count}</div><div class="stat-label">Користувачів</div></div>
      <div class="stat-card"><div class="stat-val">${stats.accounts_count}</div><div class="stat-label">Рахунків</div></div>
      <div class="stat-card"><div class="stat-val">${formatMoney(stats.total_balance)}</div><div class="stat-label">Сумарний баланс</div></div>
      <div class="stat-card"><div class="stat-val">${stats.transactions_count}</div><div class="stat-label">Транзакцій</div></div>
      <div class="stat-card"><div class="stat-val">${stats.donations_count}</div><div class="stat-label">Донатів</div></div>
      <div class="stat-card"><div class="stat-val">${stats.payouts_count}</div><div class="stat-label">Виплат</div></div>
    `;
  } catch (e) {
    el.classList.remove('loading');
    el.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}

async function loadPlatformUsers() {
  const body = $('#platformUsersBody');
  const wrap = body?.closest('.card');
  if (wrap) wrap.classList.add('loading');
  try {
    const users = await api.request('/api/platform/users');
    if (wrap) wrap.classList.remove('loading');
    const roleLabels = { soldier: 'Військовий', operator: 'Оператор', admin: 'Адмін', platform_admin: 'Платформа' };
    body.innerHTML = users.map((u) => `
      <tr>
        <td><strong>#${u.id}</strong></td>
        <td><div><strong>${u.full_name}</strong></div><div class="subtle">${u.military_status || ''}</div></td>
        <td class="subtle">${u.phone}<br>${u.email}</td>
        <td>${roleLabels[u.role] || u.role}</td>
        <td>${u.account_number || '—'}</td>
        <td>${u.balance != null ? formatMoney(u.balance) : '—'}</td>
      </tr>
    `).join('') || '<tr><td colspan="6" class="subtle">Немає даних</td></tr>';
  } catch (e) {
    if (wrap) wrap.classList.remove('loading');
    body.innerHTML = `<tr><td colspan="6" class="subtle">${e.message}</td></tr>`;
  }
}

async function loadPlatformTransactions() {
  const list = $('#platformTxList');
  list.classList.add('loading');
  const txType = $('#txTypeFilter')?.value || '';
  let url = '/api/platform/transactions?limit=200';
  if (txType) url += '&tx_type=' + encodeURIComponent(txType);
  try {
    const txs = await api.request(url);
    list.classList.remove('loading');
    list.innerHTML = txs.map((t) => `
      <div class="item">
        <div class="item-header">
          <strong>#${t.id} ${t.description}</strong>
          <span class="amount ${t.direction}">${t.direction === 'in' ? '+' : '-'}${formatMoney(t.amount)}</span>
        </div>
        <div class="muted">${t.tx_type} · ${t.account_number || ''} · ${t.created_at}${t.related_account ? ` · ${t.related_account}` : ''}</div>
      </div>
    `).join('') || '<div class="empty-state">Транзакцій немає</div>';
  } catch (e) {
    list.classList.remove('loading');
    list.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}

async function loadPlatformAudit() {
  const list = $('#platformAuditList');
  list.classList.add('loading');
  try {
    const logs = await api.request('/api/platform/audit-logs?limit=100');
    list.classList.remove('loading');
    list.innerHTML = logs.map((l) => `
      <div class="item">
        <div class="item-header"><strong>${l.action}</strong><span class="muted">${l.created_at}</span></div>
        <div class="muted">user_id: ${l.user_id ?? '—'} · ${l.full_name || ''} · ${l.details || '—'}</div>
      </div>
    `).join('') || '<div class="empty-state">Логів немає</div>';
  } catch (e) {
    list.classList.remove('loading');
    list.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}

(async function () {
  const user = await checkPlatformAdmin();
  if (!user) return;
  const roleLabels = { soldier: 'Військовий', operator: 'Оператор', admin: 'Адмін', platform_admin: 'Платформа' };
  $('#platformUser').textContent = user.email + ' · ' + (roleLabels[user.role] || user.role);

  $$('.menu-btn[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  $('#txTypeFilter')?.addEventListener('change', () => loadPlatformTransactions());

  $('#seedForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const btn = form.querySelector('button[type="submit"]');
    const resultEl = $('#seedResult');
    try {
      btn.disabled = true;
      btn.textContent = 'Генерація…';
      const payload = {
        users_count: parseInt(form.users_count.value, 10) || 10,
        transactions_per_user: parseInt(form.transactions_per_user.value, 10) || 15,
      };
      const res = await api.request('/api/platform/seed-demo', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      resultEl.style.display = 'block';
      resultEl.innerHTML = `
        <strong>Готово.</strong><br>
        Створено користувачів: ${res.created}<br>
        Транзакцій: ~${res.transactions || 0}
      `;
      showToast('Демо-дані згенеровано.');
      loadOverview();
      loadPlatformUsers();
      loadPlatformTransactions();
      loadPlatformAudit();
    } catch (err) {
      showToast(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Згенерувати';
    }
  });

  $('#logoutBtn').addEventListener('click', () => {
    api.setToken('');
    window.location.href = basePath() || '/';
  });

  switchTab('overview');
})();
