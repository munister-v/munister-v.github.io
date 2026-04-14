// Army Bank — REST API клієнт
// При розміщенні на сайті під /bank (наприклад munister.com.ua/bank) використовується window.ARMY_BANK_BASE.
// Для статичних сторінок (marketplace тощо) base зберігається в localStorage під ключем 'army_bank_base'.
const BASE = (typeof window !== 'undefined' && window.ARMY_BANK_BASE)
  || (typeof localStorage !== 'undefined' && localStorage.getItem('army_bank_base'))
  || '';

function buildApiError(message, status, payload) {
  const error = new Error(message || 'Помилка запиту до сервера.');
  if (typeof status === 'number') error.status = status;
  if (payload && typeof payload === 'object') {
    if (payload.code) error.code = payload.code;
    if (payload.error) error.serverMessage = payload.error;
  }
  return error;
}

const api = {
  // ── Token ──────────────────────────────────────────────────────────────────
  // Читаємо з localStorage — зберігається назавжди до явного виходу
  token: localStorage.getItem('army_bank_token') || localStorage.getItem('msng_token') || '',

  setToken(token) {
    this.token = token || '';
    if (this.token) {
      localStorage.setItem('army_bank_token', this.token);
      localStorage.setItem('msng_token', this.token);
    } else {
      localStorage.removeItem('army_bank_token');
      localStorage.removeItem('msng_token');
    }
  },

  // ── HTTP ───────────────────────────────────────────────────────────────────
  async request(url, options = {}) {
    const fullUrl = (url.startsWith('http') || url.startsWith('//')) ? url : BASE + url;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(fullUrl, { ...options, headers });

    // Автооновлення токену — якщо сервер повернув X-Refresh-Token
    const refreshed = response.headers.get('X-Refresh-Token');
    if (refreshed && refreshed !== this.token) {
      this.setToken(refreshed);
    }

    let payload;
    try {
      const text = await response.text();
      payload = text ? JSON.parse(text) : {};
    } catch {
      throw buildApiError(
        response.ok ? 'Помилка читання відповіді.' : 'Помилка сервера. Спробуйте пізніше.',
        response.status
      );
    }

    if (!response.ok || payload.ok === false) {
      // При 401 — очищаємо токен щоб не ходити з невалідним
      if (response.status === 401) {
        this.setToken('');
      }
      throw buildApiError(payload.error || 'Помилка запиту до сервера.', response.status, payload);
    }

    return payload.data ?? payload;
  },

  // ── Web Push ───────────────────────────────────────────────────────────────

  _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  },

  async _getVapidKey() {
    // Fetch actual VAPID key from server so it always matches backend config
    try {
      const data = await this.request('/api/push/vapid-public-key');
      return typeof data === 'string' ? data : data.key || data;
    } catch (_) {
      return 'BBkDBdD-nffWa34kkN60vFPKbsiUhz4htDfdAQUp7eVrlLIiaAveTB_qd5xGxGaUrTOXsSk50GmdYnmOARV9wJs';
    }
  },

  async subscribePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = await this._getVapidKey();

      // Unsubscribe stale subscription if key changed
      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        // Check if key still matches (iOS creates new sub per install)
        const existingKey = sub.options?.applicationServerKey;
        if (existingKey) {
          const existingB64 = btoa(String.fromCharCode(...new Uint8Array(existingKey)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
          if (existingB64 !== vapidKey.replace(/=/g, '')) {
            await sub.unsubscribe();
            sub = null;
          }
        }
      }

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this._urlBase64ToUint8Array(vapidKey),
        });
      }

      const key  = sub.getKey('p256dh');
      const auth = sub.getKey('auth');
      await this.request('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
          auth:   btoa(String.fromCharCode(...new Uint8Array(auth))),
        }),
      });
      return true;
    } catch (err) {
      console.warn('[push] subscribePush failed:', err);
      return false;
    }
  },

  async requestPushPermission() {
    const NotificationAPI = (typeof window !== 'undefined' && window.Notification) ? window.Notification : null;
    if (!NotificationAPI) return false;
    if (NotificationAPI.permission === 'granted') return this.subscribePush();
    if (NotificationAPI.permission === 'denied') return false;
    // requestPermission must be called synchronously from a user gesture
    const perm = await NotificationAPI.requestPermission();
    if (perm === 'granted') return this.subscribePush();
    return false;
  },

  async pushStatus() {
    try {
      return await this.request('/api/push/status');
    } catch (_) {
      return null;
    }
  },

  async testPush() {
    return this.request('/api/push/test', { method: 'POST' });
  },
};
