# Tuningrechner – eigenständige Website

Ein Server (Node.js + SQLite), keine Abhängigkeit zu Claude. Besucher brauchen nur den Link. Die App ist ein reiner Rechner: keine Bestellungen, keine Kategorien, keine Pakete.

## Dateien
- `server.js` – Backend: Datenbank, Login, Admin-API
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
Wichtig: Lade die Dateien so hoch, dass `server.js`, `package.json`, `render.yaml` und der Ordner `public` direkt im obersten Verzeichnis des Repositorys liegen. In Render muss das Feld „Root Directory“ dann leer bleiben.

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
Teile ändern, hinzufügen, löschen und Icons hochladen speichern zunächst nur einen Entwurf. Besucher sehen erst nach „🚀 Veröffentlichen“ die neue Version.

## Link teilen
Schicke einfach die Adresse deiner Website. Besucher rechnen ohne Konto und können keine Preise ändern.


## Neue Startliste auf einer bereits laufenden Seite
Die Startliste (21 Teile, Aufschlag 100 %) wird nur beim allerersten Start geladen, damit deine Daten nie überschrieben werden. Auf einer schon laufenden Seite meldest du dich als Admin an, klickst „↺ Standardliste“ (zweimal bestätigen) und danach „🚀 Veröffentlichen“.

## Speichern und Datensicherheit
- **Automatisch:** Teile, Preise, Icons, Aufschlag, Rabatt und der Warenkorb des Admins werden ein paar Sekundenbruchteile nach jeder Änderung auf dem Server gespeichert. Unten rechts zeigt ein Hinweis „⏳ Wird gespeichert“, „✔ Gespeichert“ oder „⚠️ Speichern fehlgeschlagen“. Bei einem Fehler wird automatisch erneut versucht (Klick auf den Hinweis = sofort).
- **Geräteübergreifend:** Wer sich als Admin anmeldet, sieht auf jedem Gerät denselben Stand.
- **Kein versehentliches Überschreiben:** Jede Speicherung hat eine Versionsnummer. Wurde auf einem anderen Gerät schon gespeichert, meldet die Seite das und lädt nichts Altes darüber. Dann einmal neu laden.
- **Sicherungen:** Vor jedem Veröffentlichen und regelmäßig beim Entwurf legt der Server eine Sicherung an (die letzten 50 je Art). Unter „🕘 Verlauf“ stellst du einen Stand als neuen Entwurf wieder her.
- **Updates und Neustarts:** Die Startliste wird nur beim allerersten Start geladen. Spätere Versionen der Website und Neustarts überschreiben deine Daten nicht, solange die Festplatte (`DATA_DIR`) erhalten bleibt.
- **Besucher:** Haben kein Konto. Ihr Warenkorb bleibt nur in ihrem eigenen Browser erhalten und wird nicht auf dem Server gespeichert.

## Sicherung
Alle Daten liegen in `shop.db` im Ordner `DATA_DIR` (bei Render `/var/data`). Lege regelmäßig eine Sicherung an (Render-Disk-Snapshots oder Download der Datei).

## Alternative: eigener Server (z. B. Hetzner-VPS)
Node.js 22 installieren, Dateien kopieren, `ADMIN_PASSWORD=... DATA_DIR=/srv/daten node server.js` per systemd starten und Caddy oder nginx als HTTPS-Proxy davorschalten (der Server liest `X-Forwarded-Proto`).
