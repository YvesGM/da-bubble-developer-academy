# DABubble

DABubble is an Angular and Firebase business chat application created as the final frontend project for the Developer Akademie.

## Stack

- Angular 20
- TypeScript
- Firebase Authentication
- Cloud Firestore
- SCSS
- GitHub Actions
- FTP deployment

## Development

Install dependencies:

```bash
npm ci
```

Start the local development server:

```bash
npm start
```

The application is available at `http://localhost:4200/`.

## Production build

Create a production build with:

```bash
npm run build
```

The browser bundle is written to:

```text
dist/dabubble/browser/
```

## Firebase rules

Deploy Firestore rules with:

```bash
npx firebase-tools deploy --only firestore:rules
```

## Deployment

Pushes to `main` trigger the production GitHub Actions workflow. The workflow
builds Angular, installs PHP mail dependencies with Composer, stages the PHP API
inside `dist/dabubble/browser/api/`, and uploads the entire browser bundle over
**explicit FTPS with certificate verification** directly to ALL-INKL:

```text
/schniefs-portfolio.de/projects/dabubble/
```

The Developer Akademie is a **separate public frontend target** for the same
Angular application. Its portal lists an FTP account; the correct protocol
and port must be taken from its *Werkzeug-Guide*. An SSH banner on port 22
does **not** prove that the FTP account supports SFTP. First test FTP with
explicit TLS on port 21 using the credentials copied from the Akademie portal,
if the guide permits it.

Deploy the static Angular files from local `dist/dabubble/browser/` after
`npm run build` to the Akademie webroot once its file-transfer access works;
**do not upload `api/` or private credentials there**. The GitHub Actions
workflow currently publishes the combined Angular + PHP output only to
ALL-INKL, independently of the separate Akademie upload.

The Akademie form sends requests from
`https://yves-gildemeister.developerakademie.net` directly to
`https://dabubble.schniefs-portfolio.de/api/request-password-reset.php`.
ALL-INKL validates the origin and answers the browser's CORS preflight.
The email link always leads back to the Figma reset route on ALL-INKL.

Before merging to `main`, configure these three **GitHub Actions secrets**
in repository Settings → Secrets and variables → Actions (or in the
`production` environment's secrets):

| Secret | Value |
|---|---|
| `FTP_HOST` | FTP hostname from the working ALL-INKL account in FileZilla/KAS, **not** the Akademie host |
| `FTP_USERNAME` | ALL-INKL **FTP account** username, not the mailbox username |
| `FTP_PASSWORD` | ALL-INKL **FTP account** password, not the SMTP password |

The ALL-INKL deployment uses port **21** with explicit FTPS/TLS and its
SMTP service uses port **465**. Akademie FTP/FTPS/SFTP settings are separate
and must follow the Akademie host's documented transfer protocol. The remote path is fixed in the deployment workflow
to prevent accidental uploads to the account root.

The PHP Firebase SDK includes many small dependencies. The FTPS mirror therefore
uses up to four parallel transfers to avoid the single-file-at-a-time delay
observed in GitHub Actions run #25. If ALL-INKL rejects concurrent FTP
sessions, lower `--parallel=4` in `.github/workflows/deploy.yml` to `2`.
The previous canceled job uploaded only part of the PHP `vendor/` folder;
repeat deployment fully before testing the PHP endpoint.

Existing `FTP_HOST`, `FTP_USERNAME`, and `FTP_PASSWORD` secrets are reused:
update their values to the ALL-INKL **FTP account**, not Developer Akademie credentials.
`FTP_PORT` and `FTP_REMOTE_DIR` are ignored because the workflow fixes
port 21 and the portfolio destination. The deployment refuses a host name
containing `developerakademie`. No FTP/SMTP/Firebase private credentials belong in the
repository. The confidential `/dabubble-private/` folder is never uploaded,
overwritten or deleted by the workflow.

## Passwort-Reset über ALL-INKL (FTP, PHP und Firebase)

Der Login, die Registrierung und die Firebase-Authentifizierung bleiben unverändert.
Nur `AuthService.sendPasswordReset()` ruft auf beiden Live-Domains die
ALL-INKL-API unter `https://dabubble.schniefs-portfolio.de/api/request-password-reset.php`
auf. Der lokale Angular-Devserver nutzt weiter `/api` über den PHP-Proxy.
Der öffentliche PHP-Endpunkt verwendet serverseitig `kreait/firebase-php` zur
Erzeugung eines echten Firebase-Reset-Codes und `PHPMailer` zum Versand über
das vorhandene ALL-INKL-SMTP-Postfach. Die E-Mail verlinkt direkt auf
`https://dabubble.schniefs-portfolio.de/reset-password?mode=resetPassword&oobCode=...`.
Die Angular-Seite verarbeitet diesen Code wie bisher mit Firebase Authentication.

### Vor dem ersten produktiven Einsatz

1. Stelle sicher, dass ALL-INKL PHP 8.5 und Composer-Abhängigkeiten unterstützt.
   Die GitHub-Action installiert Composer-Pakete bei jedem Build und legt PHP-Dateien
   samt `vendor` im FTP-Bundle unter `api/` ab. `api/_internal/.htaccess`
   sperrt öffentliche Zugriffe auf Implementierung und Libraries.
2. Erstelle in Firebase / Google Cloud unter **Service Accounts** einen privaten
   Service-Account-Schlüssel mit den nötigen Firebase Authentication Rechten.
   Niemals in `public/`, im Repository oder im Angular-Bundle ablegen.
3. Lege im FTP-Hauptverzeichnis den Ordner `dabubble-private/` an,
   auf derselben Ebene wie `schniefs-portfolio/` (nicht innerhalb der Domain).
   Der PHP-Endpunkt sucht die private Konfiguration von seinem eigenen Pfad
   aus in den übergeordneten Verzeichnissen. Auch für lokale Tests funktioniert
   ein `dabubble-private/` direkt oberhalb des Angular-Webroots.
   **Prüfe auch die Document Roots anderer Domains:** Das Verzeichnis darf über
   keine Domain öffentlich erreichbar sein. Kopiere
   `backend/password-reset/private-dir.htaccess` als `.htaccess` dorthin.
4. Kopiere `backend/password-reset/config.example.php` als `config.php` in
   diesen privaten Ordner und setze SMTP-Host, Port, Postfach und Passwort ein.
   Lege den privaten Firebase-Schlüssel dort als `service-account.json` ab.
   Setze die Zugriffsrechte so restriktiv wie beim Provider möglich.
5. Erstelle im KAS unter **E-Mail → E-Mail-Postfach** ein Absenderpostfach.
   ALL-INKL-SMTP-Host: `<KAS-Login>.kasserver.com`, Port 465 mit TLS
   (alternativ Port 587 mit STARTTLS). Sender und SMTP-Benutzer in `config.php`
   konfigurieren. **Keine Zugangsdaten in GitHub Secrets für den Browser-Build.**
6. Erst dann `chatgpt` in den vorgesehenen Review-Branch übernehmen und
   regulär deployen. Die Anwendung muss zwingend über HTTPS erreichbar sein.
7. Mit einem dedizierten Testkonto einen neuen Reset-Link anfordern, aufrufen,
   Passwort ändern und anschließend mit dem neuen Passwort anmelden.

**Wichtig: Private ALL-INKL-Konfiguration ergänzen.** In
`/dabubble-private/config.php` muss `allowed_origins` beide öffentlichen
Origins enthalten (ohne abschließenden Slash):

```php
'allowed_origins' => [
    'https://dabubble.schniefs-portfolio.de',
    'https://yves-gildemeister.developerakademie.net',
],
```

Bei einer Akademie-Adresse ohne HTTPS den tatsächlich im Browser angezeigten
Origin prüfen und nur diesen zusätzlich freigeben. Kein `*` verwenden.
Die Datei wird nur **privat per FTP** aktualisiert und nie in GitHub hochgeladen.

Die Konsoleinstellung **Authentication → Vorlagen → Aktions-URL** bleibt unverändert.
Die eigene E-Mail wird ausschließlich über den PHP-Endpunkt generiert.

### Lokal entwickeln

Im Angular-Entwicklungsserver ist PHP nicht ausführbar. Für einen lokalen
End-to-End-Test nach `npm run build` und `composer install`:

1. `node scripts/stage-password-reset.mjs` erstellt `dist/dabubble/browser/api/`.
2. Erstelle `dist/dabubble/dabubble-private/` mit der privaten `config.php`,
   `service-account.json` und der sperrenden `.htaccess`; alles bleibt unter `dist/`
   und wird nicht in Git eingecheckt.
3. Ergänze **nur in der lokalen** `config.php` bei `allowed_origins`
   `http://localhost:4200`. `site_url` bleibt die HTTPS-Produktionsdomain,
   sodass der versendete Link im bereitgestellten Reset-Frontend endet.
4. Terminal A: `npm run serve:reset`. Terminal B: `npm run start:reset`.
5. Im normalen `npm start` ohne Proxy ist die PHP-Route nicht verfügbar.

Im Produktionsbetrieb **kein** `localhost` in `allowed_origins` aufnehmen.

Zum Testen des Packaging-Skripts: `npm run test:reset`.
Zum manuellen Staging nach `npm run build`:
`cd backend/password-reset && composer install --no-dev && cd ../..`
und danach `node scripts/stage-password-reset.mjs`.

### Sicherheitsverhalten

- Keine Admin-Zugangsdaten im Frontend und keine Schlüssel im FTP-Webroot.
- Unbekannte E-Mail-Adressen erhalten eine neutrale Antwort.
- IP-, E-Mail- und Gesamt-Limits werden in einer privaten Datei verwaltet.
- Das PHP-Skript akzeptiert nur JSON-POST-Anfragen vom eigenen Origin.
- Der Endpunkt antwortet absichtlich auch bei unbekannten Konten und Versandfehlern
  mit HTTP 200. Das verhindert die Kontoermittlung über HTTP-Antworten.
- Der Header `X-DABubble-Request-Id` benennt die Anfrage. Dazu steht das Ergebnis
  in `/dabubble-private/reset-events.log`: `smtp_accepted`, `smtp_auth_error`,
  `smtp_connection_error`, `smtp_error`, `firebase_error` oder
  `unknown_account`. Die Logdatei enthält **keine** E-Mail-Adressen,
  SMTP-Passwörter oder Firebase-Reset-Links.
- `smtp_accepted` bedeutet SMTP-Serverannahme, keine Garantie für Zustellung
  im Zielpostfach. Bei diesem Ergebnis Spamordner und Zustellprotokolle prüfen.
- Wenn die Logdatei fehlt: Schreibrechte auf `dabubble-private` und PHP-Fehlerlog
  kontrollieren; niemals `display_errors` im Produktivsystem aktivieren.
- Die Firebase-Realtime-Database-Regeln sind eine **separate** Sicherheitsfrage.

### Diagnose: HTTP 200 ohne E-Mail

Beim FTP-Deployment muss `api/request-password-reset.php` mit seinem
`api/_internal/vendor/autoload.php` vorhanden sein. Ein fehlender PHP-Endpunkt
kann sonst durch die Angular-`.htaccess` als `index.html` mit HTTP 200
beantwortet werden. Deshalb akzeptiert Angular ab jetzt ausschließlich eine
erwartete JSON-Antwort. Bei erfolgreicher Bearbeitung wird nicht zwingend eine
E-Mail zugestellt: Die Antwort bleibt zur Vermeidung von Kontoermittlung neutral.

Auf dem Server zeigt `/dabubble-private/reset-events.log` mit
`id` und `outcome`, ob Firebase oder SMTP die Anfrage verarbeitet hat.
Im Browser findet man dieselbe Kennung im Response-Header
`X-DABubble-Request-Id`. Niemals private Schlüssel, SMTP-Passwörter
oder Reset-Codes für die Fehlersuche weitergeben.
