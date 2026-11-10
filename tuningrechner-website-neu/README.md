# Tuningrechner – Rechnung (Render, Node)

Gleiche Dateistruktur wie vorher (`server.js`, `package.json`, `render.yaml`, `public/index.html`), aber mit der neuen Rechnungs-Seite. Kein Login, kein Admin, keine Datenbank, kein Passwort nötig.

## Auf eine bestehende Render-Seite aufspielen
1. ZIP entpacken.
2. GitHub-Repository öffnen → „Add file → Upload files“. Die entpackten Dateien und den Ordner `public` hochladen. Gleichnamige Dateien werden überschrieben. Die Dateien müssen ganz oben im Repository liegen, nicht in einem Unterordner. „Commit changes“.
3. Render deployt automatisch neu. Falls nicht: Dienst öffnen → „Manual Deploy → Deploy latest commit“.
4. In Render muss „Root Directory“ leer sein und der Start-Befehl `node server.js` lauten (wie bisher).

## Als neue Render-Seite
„New → Web Service“, Repository wählen, Runtime Node, Build Command `echo ok`, Start Command `node server.js`.

## Hinweise
- Die Umgebungsvariablen `ADMIN_USER`, `ADMIN_PASSWORD` und `DATA_DIR` werden nicht mehr gebraucht. Du kannst sie löschen.
- Die frühere Festplatte (Disk) wird nicht mehr benötigt. Wenn du sie in Render nicht mehr brauchst, kannst du sie dort entfernen, um Kosten zu sparen. Alte Admin-Daten darauf bleiben bis dahin unverändert liegen.
- Rechnungen und Teile werden im Browser des jeweiligen Besuchers gespeichert. Über „🗄️ Sicherung“ in der Seite lassen sich Daten auf ein anderes Gerät mitnehmen.
- Im kostenlosen Render-Tarif schläft der Dienst nach einiger Zeit ohne Besucher ein. Der erste Aufruf dauert dann etwas länger.
