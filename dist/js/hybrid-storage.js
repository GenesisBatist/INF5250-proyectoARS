(function () {
  function resolveApiBaseUrl() {
    if (window.ARS_HYBRID_API_URL) {
      return String(window.ARS_HYBRID_API_URL).replace(/\/+$/, '');
    }

    if (window.API_URL) {
      return String(window.API_URL).replace(/\/+$/, '');
    }

    const currentScript = document.currentScript;
    const scriptUrl = currentScript && currentScript.src
      ? currentScript.src
      : new URL('../dist/js/hybrid-storage.js', window.location.href).href;

    return new URL('../../api', scriptUrl).href.replace(/\/+$/, '');
  }

  const API_BASE_URL = resolveApiBaseUrl();
  const storage = window.localStorage;
  const storageProto = window.Storage && window.Storage.prototype;
  if (!storage || !storageProto) return;

  const originalGetItem = storageProto.getItem.bind(storage);
  const originalSetItem = storageProto.setItem.bind(storage);
  const originalRemoveItem = storageProto.removeItem.bind(storage);
  const originalClear = storageProto.clear.bind(storage);
  const originalKey = storageProto.key ? storageProto.key.bind(storage) : null;
  const pendingWrites = new Map();
  const pendingDeletes = new Map();
  const sqlCache = new Map();
  const IMMEDIATE_SYNC_KEYS = new Set(['ars_auditoria', 'ars_current_user', 'usuario', 'nombre']);
  let lastRefreshAt = 0;
  let refreshPromise = null;

  const EXPLICIT_TRACKED_KEYS = new Set([
    'token',
    'usuario',
    'nombre',
    'reclamaciones',
    'ars_reclamaciones',
    'ars_reclamos'
  ]);

  function isTrackedKey(key) {
    const normalized = String(key || '').trim();
    if (!normalized) return false;
    return normalized.startsWith('ars_') || EXPLICIT_TRACKED_KEYS.has(normalized);
  }

  function isBrowserStorageCall(context) {
    try {
      return context === storage || context instanceof Storage;
    } catch {
      return context === storage;
    }
  }

  function dispatchStorageRefresh(detail) {
    window.dispatchEvent(new CustomEvent('ars:storage-sync', { detail }));
  }

  function queueRequest(map, key, action) {
    if (map.has(key)) {
      clearTimeout(map.get(key));
    }

    const timeoutId = setTimeout(async function () {
      map.delete(key);
      try {
        await action();
      } catch (error) {
        console.warn('No se pudo sincronizar la clave SQL:', key, error);
      }
    }, 80);

    map.set(key, timeoutId);
  }

  function getTrackedKeysInCache() {
    return Array.from(sqlCache.keys()).filter(isTrackedKey);
  }

  function applySnapshot(data, options) {
    const settings = options || {};
    if (settings.replace !== false) {
      sqlCache.clear();
    }
    if (!data || typeof data !== 'object') return;

    Object.keys(data).forEach(function (key) {
      const payload = data[key];
      const value = payload && typeof payload === 'object' ? payload.value : payload;
      if (typeof value === 'string') {
        sqlCache.set(key, value);
      }
    });
  }

  async function hydrateAsync(keys) {
    const url = new URL(`${API_BASE_URL}/storage/snapshot.php`, window.location.href);
    if (Array.isArray(keys) && keys.length) {
      url.searchParams.set('keys', keys.join(','));
    }

    const response = await fetch(url.toString(), { cache: 'no-store' });
    if (!response.ok) {
      const payload = await response.json().catch(function () { return {}; });
      throw new Error(payload.message || `HTTP ${response.status}`);
    }

    const payload = await response.json();
    applySnapshot(payload.data, { replace: !(Array.isArray(keys) && keys.length) });
    return payload.data || {};
  }

  function refreshNow(keys) {
    const normalizedKeys = Array.isArray(keys) && keys.length
      ? keys.map(function (key) { return String(key || '').trim(); }).filter(Boolean)
      : [];

    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = hydrateAsync(normalizedKeys).then(function (data) {
      lastRefreshAt = Date.now();
      dispatchStorageRefresh({ type: 'refresh', keys: normalizedKeys, data: data });
      return data;
    }).catch(function (error) {
      console.warn('No se pudo refrescar el almacenamiento SQL.', error);
      throw error;
    }).finally(function () {
      refreshPromise = null;
    });

    return refreshPromise;
  }

  function refreshIfStale() {
    if (Date.now() - lastRefreshAt < 250) return;
    refreshNow().catch(function () {});
  }

  function hydrateSync() {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `${API_BASE_URL}/storage/snapshot.php`, false);
      xhr.send();

      if (xhr.status < 200 || xhr.status >= 300 || !xhr.responseText) {
        return false;
      }

      const response = JSON.parse(xhr.responseText);
      applySnapshot(response.data);
      return true;
    } catch (error) {
      console.warn('No se pudo hidratar el almacenamiento SQL.', error);
      return false;
    }
  }

  function purgeTrackedLocalCopies() {
    if (!originalKey) return;

    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = originalKey(index);
      if (isTrackedKey(key)) {
        const localValue = originalGetItem.call(storage, key);
        if (!sqlCache.has(key) && typeof localValue === 'string') {
          sqlCache.set(key, localValue);
          syncRemoteSet(key, localValue).catch(function (error) {
            console.warn('No se pudo migrar la clave local a SQL:', key, error);
          });
        }
        originalRemoveItem.call(storage, key);
      }
    }
  }

  async function syncRemoteSet(key, value, options) {
    const settings = options || {};
    const response = await fetch(`${API_BASE_URL}/storage/item.php`, {
      method: 'POST',
      keepalive: !!settings.keepalive,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });

    if (!response.ok) {
      const payload = await response.json().catch(function () { return {}; });
      throw new Error(payload.message || `HTTP ${response.status}`);
    }
  }

  async function syncRemoteDelete(key, options) {
    const settings = options || {};
    const response = await fetch(`${API_BASE_URL}/storage/item.php?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
      keepalive: !!settings.keepalive
    });

    if (!response.ok) {
      const payload = await response.json().catch(function () { return {}; });
      throw new Error(payload.message || `HTTP ${response.status}`);
    }
  }

  async function syncRemoteClear(keys) {
    const response = await fetch(`${API_BASE_URL}/storage/clear.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys })
    });

    if (!response.ok) {
      const payload = await response.json().catch(function () { return {}; });
      throw new Error(payload.message || `HTTP ${response.status}`);
    }
  }

  if (hydrateSync()) {
    lastRefreshAt = Date.now();
  }
  purgeTrackedLocalCopies();

  window.addEventListener('focus', refreshIfStale);
  window.addEventListener('pageshow', refreshIfStale);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      refreshIfStale();
    }
  });

  storageProto.getItem = function (key) {
    if (isBrowserStorageCall(this) && isTrackedKey(key)) {
      return sqlCache.has(String(key)) ? sqlCache.get(String(key)) : null;
    }

    return originalGetItem.call(this, key);
  };

  storageProto.setItem = function (key, value) {
    if (isBrowserStorageCall(this) && isTrackedKey(key)) {
      const normalizedKey = String(key);
      const normalizedValue = String(value);
      sqlCache.set(normalizedKey, normalizedValue);
      if (IMMEDIATE_SYNC_KEYS.has(normalizedKey)) {
        syncRemoteSet(normalizedKey, normalizedValue, { keepalive: true }).catch(function (error) {
          console.warn('No se pudo sincronizar inmediatamente la clave SQL:', normalizedKey, error);
        });
      } else {
        queueRequest(pendingWrites, normalizedKey, function () {
          return syncRemoteSet(normalizedKey, normalizedValue);
        });
      }
      dispatchStorageRefresh({ type: 'set', key: normalizedKey });
      return;
    }

    originalSetItem.call(this, key, value);
  };

  storageProto.removeItem = function (key) {
    if (isBrowserStorageCall(this) && isTrackedKey(key)) {
      const normalizedKey = String(key);
      sqlCache.delete(normalizedKey);
      if (IMMEDIATE_SYNC_KEYS.has(normalizedKey)) {
        syncRemoteDelete(normalizedKey, { keepalive: true }).catch(function (error) {
          console.warn('No se pudo eliminar inmediatamente la clave SQL:', normalizedKey, error);
        });
      } else {
        queueRequest(pendingDeletes, normalizedKey, function () {
          return syncRemoteDelete(normalizedKey);
        });
      }
      dispatchStorageRefresh({ type: 'remove', key: normalizedKey });
      return;
    }

    originalRemoveItem.call(this, key);
  };

  storageProto.clear = function () {
    if (isBrowserStorageCall(this)) {
      const trackedKeys = getTrackedKeysInCache();
      trackedKeys.forEach(function (key) {
        sqlCache.delete(key);
      });

      syncRemoteClear(trackedKeys).catch(function (error) {
        console.warn('No se pudo limpiar el almacenamiento SQL', error);
      });

      originalClear.call(this);
      dispatchStorageRefresh({ type: 'clear', keys: trackedKeys });
      return;
    }

    originalClear.call(this);
  };

  window.ARSHybridStorage = {
    apiBaseUrl: API_BASE_URL,
    hydrateSync,
    status: 'sql-only',
    isTrackedKey,
    trackedKeys: getTrackedKeysInCache,
    refreshNow,
    syncNow: function (key) {
      const normalizedKey = String(key || '');
      if (!isTrackedKey(normalizedKey)) {
        return Promise.resolve(false);
      }

      if (!sqlCache.has(normalizedKey)) {
        return refreshNow([normalizedKey]).then(function () {
          return sqlCache.has(normalizedKey);
        }).catch(function () {
          return false;
        });
      }

      return syncRemoteSet(normalizedKey, sqlCache.get(normalizedKey)).then(function () {
        return true;
      });
    }
  };
})();
