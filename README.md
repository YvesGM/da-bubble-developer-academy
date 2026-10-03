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
