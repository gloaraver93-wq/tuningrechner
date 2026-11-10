'use strict';
// Sehr kleiner Webserver: liefert die Rechnungs-Website aus. Keine Datenbank, kein Login, keine Pakete nötig.
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 3000;
const FILE = path.join(__dirname, 'public', 'index.html');
const HEAD = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' };
http.createServer((req, res) => {
  let p = '/';
  try { p = new URL(req.url, 'http://x').pathname; } catch (e) {}
  if (p === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  if (p === '/' || p === '/index.html') {
    const s = fs.createReadStream(FILE);
    s.on('error', () => { if (!res.headersSent) res.writeHead(500); res.end('Datei fehlt'); });
    s.once('open', () => { res.writeHead(200, HEAD); s.pipe(res); });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Nicht gefunden');
}).listen(PORT, () => console.log('Läuft auf Port ' + PORT));
