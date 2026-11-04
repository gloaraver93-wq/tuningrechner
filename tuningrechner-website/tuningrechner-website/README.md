# Tuningrechner – eigenständige Website

Ein Server (Node.js + SQLite), keine Abhängigkeit zu Claude. Besucher brauchen nur den Link.

## Dateien
- `server.js` – Backend: Datenbank, Login, Bestell-API, Admin-API
- `public/index.html` – die Website (dein bisheriges Design, Icons, Produkte)
- `seed.json` – Startliste der 24 Teile (wird beim ersten Start in die Datenbank geladen)
- `render.yaml` – Hosting-Konfiguration für Render (inkl. dauerhafter Festplatte)
- `package.json`, `.gitignore`

## Lokal testen (optional)
Node.js 22.13 oder neuer installieren, dann im Ordner:
- Windows (PowerShell): `$env:ADMIN_PASSWORD="DeinLangesPasswort"; node server.js`
- Mac/Linux: `ADMIN_PASSWORD="DeinLangesPasswort" node server.js`

Danach `http://localhost:3000` öffnen.

## Veröffentlichen mit Render
1. **GitHub-Konto** anlegen (github.com), „New repository“ → privat → Name `tuningrechner`.
2. Im Repository „Add file → Upload files“: alle Dateien und den Ordner `public` hochladen, „Commit“.
3. **Render-Konto** anlegen (render.com), mit GitHub verbinden.
4. In Render: „New → Blueprint“ → dein Repository wählen. Render liest `render.yaml`.
5. Bei `ADMIN_PASSWORD` dein Admin-Passwort eintragen (mindestens 10 Zeichen). Es steht nur in Render, nicht im Code.
6. „Apply“ klicken und warten. Du erhältst eine Adresse wie `https://tuningrechner.onrender.com` (HTTPS inklusive).
7. Seite öffnen → „🔒 Admin“ → Benutzername `admin` und dein Passwort.

Hinweis: Die dauerhafte Festplatte (für Datenbank und Bilder) gibt es bei Render nur in einem bezahlten Tarif. Mit einem kostenlosen Tarif gehen Daten bei jedem Neustart verloren. Aktuelle Preise bitte bei Render nachsehen.

## Eigene Domain
1. Domain bei einem Anbieter kaufen (z. B. INWX, Namecheap, IONOS).
2. Render → dein Dienst → Settings → Custom Domains → „Add Custom Domain“.
3. Die angezeigten DNS-Einträge (CNAME oder A) beim Domain-Anbieter eintragen.
4. Nach einigen Minuten bis Stunden ist die Seite unter `https://meine-website.de` erreichbar. Das HTTPS-Zertifikat richtet Render automatisch ein.

## Admin-Zugang
- Benutzername: Wert von `ADMIN_USER` (Standard `admin`), Passwort: `ADMIN_PASSWORD`.
- Das Passwort wird nur als scrypt-Hash in der Datenbank gespeichert.
- Passwort ändern: im Admin-Modus „🔑 Passwort“.
- Passwort vergessen: in Render `ADMIN_RESET` = `1` und neues `ADMIN_PASSWORD` setzen, neu deployen, danach `ADMIN_RESET` wieder entfernen.
- Nach 5 falschen Anmeldungen wird die IP 10 Minuten gesperrt.

## Arbeiten im Admin-Modus
Teile ändern, hinzufügen, löschen und Icons hochladen speichern zunächst nur einen Entwurf. Besucher sehen erst nach „🚀 Veröffentlichen“ die neue Version. Bestellungen findest du unter „📦 Bestellungen“ (alle 15 Sekunden aktualisiert).

## Link teilen
Schicke einfach die Adresse deiner Website. Besucher bestellen ohne Konto. Die Preise berechnet der Server selbst, Besucher können sie nicht verändern.

## Sicherung
Alle Daten liegen in `shop.db` im Ordner `DATA_DIR` (bei Render `/var/data`). Lege regelmäßig eine Sicherung an (Render-Disk-Snapshots oder Download der Datei).

## Alternative: eigener Server (z. B. Hetzner-VPS)
Node.js 22 installieren, Dateien kopieren, `ADMIN_PASSWORD=... DATA_DIR=/srv/daten node server.js` per systemd starten und Caddy oder nginx als HTTPS-Proxy davorschalten (der Server liest `X-Forwarded-Proto`).
