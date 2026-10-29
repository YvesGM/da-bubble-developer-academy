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

Pushes to `main` trigger the production GitHub Actions workflow. The workflow builds the Angular application and uploads the browser bundle to the configured FTP environment.

Production credentials are stored as GitHub environment secrets and are not committed to the repository.

## Passwort-Reset über ALL-INKL (FTP, PHP und Firebase)

Der Login, die Registrierung und die Firebase-Authentifizierung bleiben unverändert.
Nur \`AuthService.sendPasswordReset()\` ruft \`/api/request-password-reset.php\` auf.
Der öffentliche PHP-Endpunkt verwendet serverseitig \`kreait/firebase-php\` zur
Erzeugung eines echten Firebase-Reset-Codes und \`PHPMailer\` zum Versand über
das vorhandene ALL-INKL-SMTP-Postfach. Die E-Mail verlinkt direkt auf
\`https://dabubble.schniefs-portfolio.de/reset-password?mode=resetPassword&oobCode=...\`.
Die Angular-Seite verarbeitet diesen Code wie bisher mit Firebase Authentication.

### Vor dem ersten produktiven Einsatz

1. Stelle sicher, dass ALL-INKL PHP 8.5 und Composer-Abhängigkeiten unterstützt.
   Die GitHub-Action installiert Composer-Pakete bei jedem Build und legt PHP-Dateien
   samt \`vendor\` im FTP-Bundle unter \`api/\` ab. \`api/_internal/.htaccess\`
   sperrt öffentliche Zugriffe auf Implementierung und Libraries.
2. Erstelle in Firebase / Google Cloud unter **Service Accounts** einen privaten
   Service-Account-Schlüssel mit den nötigen Firebase Authentication Rechten.
   Niemals in \`public/\`, im Repository oder im Angular-Bundle ablegen.
3. Lege im FTP-Webspace **neben**, nicht **innerhalb** des DABubble-Webroots
   den Ordner \`dabubble-private/\` an. Beispiel bei Webroot \`.../dabubble/\`:
   \`.../dabubble-private/\`. Der PHP-Endpunkt sucht hier \`config.php\`.
4. Kopiere \`backend/password-reset/config.example.php\` als \`config.php\` in
   diesen privaten Ordner und setze SMTP-Host, Port, Postfach und Passwort ein.
   Lege den privaten Firebase-Schlüssel dort als \`service-account.json\` ab.
   Setze die Zugriffsrechte so restriktiv wie beim Provider möglich.
5. Erstelle im KAS unter **E-Mail → E-Mail-Postfach** ein Absenderpostfach.
   ALL-INKL-SMTP-Host: \`<KAS-Login>.kasserver.com\`, Port 465 mit TLS
   (alternativ Port 587 mit STARTTLS). Sender und SMTP-Benutzer in \`config.php\`
   konfigurieren. **Keine Zugangsdaten in GitHub Secrets für den Browser-Build.**
6. Erst dann \`chatgpt\` in den vorgesehenen Review-Branch übernehmen und
   regulär deployen. Die Anwendung muss zwingend über HTTPS erreichbar sein.
7. Mit einem dedizierten Testkonto einen neuen Reset-Link anfordern, aufrufen,
   Passwort ändern und anschließend mit dem neuen Passwort anmelden.

Die Konsoleinstellung **Authentication → Vorlagen → Aktions-URL** bleibt unverändert.
Die eigene E-Mail wird ausschließlich über den PHP-Endpunkt generiert.

### Lokal entwickeln

Im Angular-Entwicklungsserver ist PHP nicht ausführbar. Für echte lokale
E-Mail-Tests zusätzlich den PHP-Server und einen Angular-Proxy konfigurieren
oder den bereits bereitgestellten HTTPS-Endpunkt verwenden. Nicht einfach
\`localhost\` als produktive Reset-URL eintragen.

Zum Testen des Packaging-Skripts: \`npm run test:reset\`.
Zum manuellen Staging nach \`npm run build\`:
\`cd backend/password-reset && composer install --no-dev && cd ../..\`
und danach \`node scripts/stage-password-reset.mjs\`.

### Sicherheitsverhalten

- Keine Admin-Zugangsdaten im Frontend und keine Schlüssel im FTP-Webroot.
- Unbekannte E-Mail-Adressen erhalten eine neutrale Antwort.
- IP-, E-Mail- und Gesamt-Limits werden in einer privaten Datei verwaltet.
- Das PHP-Skript akzeptiert nur JSON-POST-Anfragen vom eigenen Origin.
- SMTP-Fehler landen nur als Exception-Klasse im Serverlog, ohne Reset-Link.
- Die Firebase-Realtime-Database-Regeln sind eine **separate** Sicherheitsfrage.
