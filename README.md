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

## Custom Firebase password-reset page

DABubble already handles Firebase reset codes at `/reset-password`.
After deploying the application to its HTTPS domain, configure Firebase Console →
Authentication → Templates → Password reset → Edit → **Customize action URL** with:

```text
https://<your-deployed-app-domain>/reset-password
```

This Firebase setting applies across email action templates. The Angular reset route
hands non-password-reset actions back to the standard Firebase hosted action handler.
The `public/.htaccess` SPA fallback must remain deployed for direct email-link visits.
Do not point the production email template at `localhost` or change Firebase settings
before the new deployment is live.
