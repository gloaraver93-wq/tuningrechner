'use strict';
// Eigenständiger Server – keine externen Pakete nötig (Node.js >= 22.13).
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const PORT = process.env.PORT || 3000;
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA, { recursive: true });
const db = new DatabaseSync(path.join(DATA, 'shop.db'));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(h TEXT PRIMARY KEY, exp INTEGER);
CREATE TABLE IF NOT EXISTS history(id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, v TEXT, t INTEGER);`);
const kvGet = k => { const r = db.prepare('SELECT v FROM kv WHERE k=?').get(k); return r ? JSON.parse(r.v) : null; };
const kvSet = (k, v) => db.prepare('INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run(k, JSON.stringify(v));

// ---------- Passwort-Hashing (scrypt) ----------
const hashPw = pw => { const s = crypto.randomBytes(16).toString('hex'); return 's1$' + s + '$' + crypto.scryptSync(pw, s, 64).toString('hex'); };
const checkPw = (pw, st) => { const [, s, h] = String(st).split('$'); if (!s || !h) return false;
  const a = crypto.scryptSync(pw, s, 64), b = Buffer.from(h, 'hex'); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const DUMMY = hashPw('dummy-' + crypto.randomBytes(8).toString('hex'));
let admin = kvGet('admin');
if (!admin || process.env.ADMIN_RESET === '1') {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || pw.length < 10) { console.error('FEHLER: Setze die Umgebungsvariable ADMIN_PASSWORD (mind. 10 Zeichen) für den ersten Start.'); process.exit(1); }
  admin = { user: (process.env.ADMIN_USER || 'admin').trim(), hash: hashPw(pw) }; kvSet('admin', admin);
  console.log('Admin-Konto angelegt/zurückgesetzt:', admin.user);
}
if (!kvGet('published')) { const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8')); kvSet('published', seed); kvSet('draft', seed); }

// ---------- Hilfen ----------
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const send = (res, code, obj, extra = {}) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra }); res.end(JSON.stringify(obj)); };
const readBody = (req, max = 6e6) => new Promise((ok, no) => { let n = 0; const c = [];
  req.on('data', d => { n += d.length; if (n > max) { no({ code: 413, error: 'Datei/Anfrage zu groß.' }); req.destroy(); } else c.push(d); });
  req.on('end', () => { try { ok(c.length ? JSON.parse(Buffer.concat(c).toString()) : {}); } catch { no({ code: 400, error: 'Ungültiges JSON.' }); } });
  req.on('error', () => no({ code: 400, error: 'Fehler.' })); });
const ip = req => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
const secure = req => req.headers['x-forwarded-proto'] === 'https' || process.env.COOKIE_SECURE === '1';
const cookie = req => Object.fromEntries((req.headers.cookie || '').split(';').map(x => x.trim().split('=')).filter(x => x[0]));
function isAdmin(req) { const t = cookie(req).sid; if (!t) return false; const r = db.prepare('SELECT exp FROM sessions WHERE h=?').get(sha(t)); return !!r && r.exp > Date.now(); }
const fails = new Map(), rate = new Map();
function limited(map, key, max, ms) { const n = Date.now(), e = map.get(key); if (!e || e.until < n) { map.set(key, { c: 1, until: n + ms }); return false; } e.c++; return e.c > max; }
setInterval(() => { const n = Date.now(); for (const m of [fails, rate]) for (const [k, v] of m) if (v.until < n) m.delete(k); db.prepare('DELETE FROM sessions WHERE exp<?').run(n); }, 6e4).unref();

function cleanItems(items) {
  if (!Array.isArray(items) || items.length > 300) return null;
  const out = [], seen = new Set();
  for (const d of items) {
    if (!Array.isArray(d) || typeof d[0] !== 'string' || typeof d[2] !== 'string' || typeof d[3] !== 'string') return null;
    const n = d[0].trim().slice(0, 80), p = Number(d[1]);
    if (!n || seen.has(n) || !(p >= 0 && p <= 1e8) || d[3].length > 200000) return null;
    if (d[3].startsWith('data:') && !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(d[3])) return null;
    seen.add(n); out.push([n, p, d[2].trim().slice(0, 40), d[3]]);
  }
  return out;
}
// Sicherungen: vor jedem Überschreiben der veröffentlichten Version (und alle 10 Min. beim Entwurf) wird der alte Stand abgelegt.
function snap(kind, v) { if (!v || !v.items) return;
  db.prepare('INSERT INTO history(kind,v,t) VALUES(?,?,?)').run(kind, JSON.stringify(v), Date.now());
  db.prepare('DELETE FROM history WHERE kind=? AND id NOT IN (SELECT id FROM history WHERE kind=? ORDER BY id DESC LIMIT 50)').run(kind, kind); }
const pct = v => Math.min(100, Math.max(0, Number(v) || 0));

// ---------- API ----------
async function api(req, res, u) {
  const m = req.method, p = u.pathname;
  if (m !== 'GET' && !(req.headers['content-type'] || '').startsWith('application/json')) return send(res, 415, { error: 'Nur JSON erlaubt.' });
  if (p === '/api/catalog' && m === 'GET') return send(res, 200, kvGet('published'));
  if (p === '/api/me' && m === 'GET') return send(res, 200, { admin: isAdmin(req) });

  if (p === '/api/login' && m === 'POST') {
    const k = ip(req); if ((fails.get(k) || { c: 0, until: 0 }).c >= 5 && fails.get(k).until > Date.now()) return send(res, 429, { error: 'Zu viele Versuche. Bitte in 10 Minuten erneut versuchen.' });
    const b = await readBody(req, 1e4), a = kvGet('admin');
    const okUser = String(b.user || '') === a.user, okPw = checkPw(String(b.pass || ''), okUser ? a.hash : DUMMY);
    if (!(okUser && okPw)) { const e = fails.get(k); fails.set(k, { c: (e && e.until > Date.now() ? e.c : 0) + 1, until: Date.now() + 6e5 }); return send(res, 401, { error: 'Benutzername oder Passwort falsch.' }); }
    fails.delete(k); const t = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions(h,exp) VALUES(?,?)').run(sha(t), Date.now() + 12 * 36e5);
    return send(res, 200, { ok: true }, { 'Set-Cookie': `sid=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure(req) ? '; Secure' : ''}` });
  }
  if (p === '/api/logout' && m === 'POST') { const t = cookie(req).sid; if (t) db.prepare('DELETE FROM sessions WHERE h=?').run(sha(t));
    return send(res, 200, { ok: true }, { 'Set-Cookie': 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' }); }

  // ---- ab hier nur Admin (serverseitig geprüft) ----
  if (!p.startsWith('/api/admin/')) return send(res, 404, { error: 'Nicht gefunden.' });
  if (!isAdmin(req)) return send(res, 401, { error: 'Nicht angemeldet.' });
  if (p === '/api/admin/draft' && m === 'GET') return send(res, 200, kvGet('draft') || kvGet('published'));
  if (p === '/api/admin/draft' && m === 'PUT') { const b = await readBody(req), items = cleanItems(b.items); if (!items) return send(res, 400, { error: 'Ungültige Teileliste.' });
    const cur = kvGet('draft') || {}, rev = cur.rev || 0;
    if (b.rev !== undefined && Number(b.rev) !== rev) return send(res, 409, { error: 'Auf einem anderen Gerät wurde inzwischen gespeichert.', code: 'conflict' });
    const last = db.prepare("SELECT MAX(t) AS t FROM history WHERE kind='draft'").get().t || 0; if (Date.now() - last > 6e5) snap('draft', cur);
    kvSet('draft', { items, mk: pct(b.mk), dc: pct(b.dc), rev: rev + 1 }); return send(res, 200, { ok: true, rev: rev + 1, savedAt: Date.now() }); }
  if (p === '/api/admin/publish' && m === 'POST') { const b = await readBody(req), items = cleanItems(b.items); if (!items) return send(res, 400, { error: 'Ungültige Teileliste.' });
    const cur = kvGet('draft') || {}, rev = cur.rev || 0;
    if (b.rev !== undefined && Number(b.rev) !== rev) return send(res, 409, { error: 'Auf einem anderen Gerät wurde inzwischen gespeichert.', code: 'conflict' });
    snap('published', kvGet('published')); const v = { items, mk: pct(b.mk), dc: pct(b.dc) };
    kvSet('published', v); kvSet('draft', { ...v, rev: rev + 1 }); return send(res, 200, { ok: true, rev: rev + 1, savedAt: Date.now() }); }
  if (p === '/api/admin/state' && m === 'GET') return send(res, 200, kvGet('state') || { cart: {} });
  if (p === '/api/admin/state' && m === 'PUT') { const c = (await readBody(req, 5e4)).cart, out = {};
    if (!c || typeof c !== 'object' || Object.keys(c).length > 200) return send(res, 400, { error: 'Ungültiger Warenkorb.' });
    for (const [k, q] of Object.entries(c)) { if (k.length > 80 || !Number.isInteger(q) || q < 1 || q > 999) return send(res, 400, { error: 'Ungültiger Warenkorb.' }); out[k] = q; }
    kvSet('state', { cart: out }); return send(res, 200, { ok: true, savedAt: Date.now() }); }
  if (p === '/api/admin/history' && m === 'GET') return send(res, 200, { list: db.prepare('SELECT id,kind,v,t FROM history ORDER BY id DESC LIMIT 60').all().map(r => ({ id: r.id, kind: r.kind, t: r.t, n: (JSON.parse(r.v).items || []).length })) });
  if (p === '/api/admin/restore' && m === 'POST') { const r = db.prepare('SELECT v FROM history WHERE id=?').get(Number((await readBody(req, 1e3)).id)); if (!r) return send(res, 404, { error: 'Sicherung nicht gefunden.' });
    const cur = kvGet('draft') || {}, v = JSON.parse(r.v); snap('draft', cur); kvSet('draft', { items: v.items, mk: pct(v.mk), dc: pct(v.dc), rev: (cur.rev || 0) + 1 }); return send(res, 200, { ok: true }); }
  if (p === '/api/admin/password' && m === 'POST') { const pw = String((await readBody(req, 1e3)).pass || ''); if (pw.length < 10) return send(res, 400, { error: 'Mindestens 10 Zeichen.' });
    kvSet('admin', { ...kvGet('admin'), hash: hashPw(pw) }); db.prepare('DELETE FROM sessions').run(); return send(res, 200, { ok: true }); }
  return send(res, 404, { error: 'Nicht gefunden.' });
}

const INDEX = path.join(__dirname, 'public', 'index.html');
http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (u.pathname.startsWith('/api/')) return await api(req, res, u);
    if (u.pathname === '/healthz') return send(res, 200, { ok: true });
    if (u.pathname === '/' || u.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' });
      return fs.createReadStream(INDEX).pipe(res);
    }
    send(res, 404, { error: 'Nicht gefunden.' });
  } catch (e) { if (!res.headersSent) send(res, e.code >= 400 && e.code < 600 ? e.code : 500, { error: e.error || 'Serverfehler.' }); else res.end(); }
}).listen(PORT, () => console.log('Läuft auf Port ' + PORT));
