// Malé falešné IndexedDB pro testy uložených her (F2): open s upgradem, transakce nad sklady, get/getAll/put/delete, volitelně „plné úložiště“.
export function fakeIndexedDB(opts = {}) {
  const dbs = new Map();
  const later = (fn) => setTimeout(fn, 0);
  const request = () => ({ result: undefined, error: null, onsuccess: null, onerror: null });
  const makeDb = (stores) => ({
    objectStoreNames: { contains: (n) => stores.has(n) },
    createObjectStore: (n) => { stores.set(n, new Map()); },
    transaction() {
      const t = { oncomplete: null, onerror: null, onabort: null, error: null };
      let pending = 0, failed = null;
      const finish = () => later(() => { if (failed) { t.error = failed; if (t.onerror) t.onerror(); } else if (t.oncomplete) t.oncomplete(); });
      t.objectStore = (n) => {
        const m = stores.get(n);
        const op = (fn) => {
          const rq = request();
          pending++;
          later(() => {
            try { rq.result = fn(); if (rq.onsuccess) rq.onsuccess(); } catch (e) { failed = e; rq.error = e; if (rq.onerror) rq.onerror(); }
            if (--pending === 0) finish();
          });
          return rq;
        };
        return {
          get: (k) => op(() => m.get(k)),
          getAll: () => op(() => [...m.values()]),
          put: (v, k) => op(() => { if (opts.full) throw new Error('QuotaExceededError'); m.set(k, v); }),
          delete: (k) => op(() => { m.delete(k); }),
        };
      };
      return t;
    },
  });
  return {
    open(name) {
      const rq = request();
      later(() => {
        let st = dbs.get(name);
        const fresh = !st;
        if (fresh) { st = new Map(); dbs.set(name, st); }
        rq.result = makeDb(st);
        if (fresh && rq.onupgradeneeded) rq.onupgradeneeded();
        if (rq.onsuccess) rq.onsuccess();
      });
      return rq;
    },
    _dbs: dbs,
  };
}
