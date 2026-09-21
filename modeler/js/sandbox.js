// In-browser SQL sandbox: runs the model's schema against sql.js (SQLite compiled to WASM),
// so you can write real SELECT/INSERT/UPDATE against your model with no backend and no real Oracle.
// sql.js is vendored in js/vendor/sqljs/ (MIT license, see LICENSE there) to keep the app
// self-contained and offline-capable, same as every other module here.
import { sqliteSchema } from './sqlite-gen.js?v=202609210933';
import { sqliteSeed } from './sqlite-seed.js?v=202609210933';

let engine = null;
let loading = null;

function loadEngine() {
  if (engine) return Promise.resolve(engine);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'js/vendor/sqljs/sql-wasm.js';
    s.onload = () => {
      window.initSqlJs({ locateFile: f => `js/vendor/sqljs/${f}` })
        .then(sql => { engine = sql; resolve(sql); }, reject);
    };
    s.onerror = () => reject(new Error('sql-wasm.js failed to load'));
    document.head.append(s);
  });
  return loading;
}

export class Sandbox {
  // (Re)builds the sandbox database from the model's current schema. Returns a list of
  // "label: message" strings for statements that failed (unsupported Oracle-only SQL etc.).
  async open(model, { seed = true } = {}) {
    const sql = await loadEngine();
    this.db?.close();
    this.db = new sql.Database();
    const failed = [];
    for (const { sql: stmt, label } of sqliteSchema(model)) {
      try { this.db.run(stmt); } catch (e) { failed.push(`${label}: ${e.message}`); }
    }
    // Схема без строк не отвечает на запрос: SELECT по пустой базе возвращает
    // ничего, и песочница выглядит сломанной. Поэтому сеем примерные строки —
    // молча, ошибки посева не выносим в предупреждения о схеме.
    this.seeded = 0;
    if (seed) {
      for (const { sql: stmt } of sqliteSeed(model)) {
        try { this.db.run(stmt); this.seeded += this.db.getRowsModified(); } catch {}
      }
    }
    return failed;
  }
  // sql.js exec() format: [{ columns: string[], values: any[][] }, ...], one entry per
  // statement that produced rows (SELECT). DDL/DML statements run but return nothing.
  run(sql) {
    if (!this.db) throw new Error('sandbox not open');
    return this.db.exec(sql);
  }
  get changes() { return this.db?.getRowsModified() ?? 0; }
  close() { this.db?.close(); this.db = null; }
}
