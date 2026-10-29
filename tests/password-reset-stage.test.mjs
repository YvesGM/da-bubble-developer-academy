import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { stageResetApi } from '../scripts/stage-password-reset.mjs';

/** The credential directory's protective template must remain versioned. */
test('private credential directory has a deny-all .htaccess template', () => {
  const file = new URL('../backend/password-reset/private-dir.htaccess', import.meta.url);
  const contents = readFileSync(file, 'utf8');
  assert.match(contents, /Require all denied/);
  assert.match(contents, /Deny from all/);
});

/** Packaging requires no local Composer install; vendor is managed separately on FTP. */
test('staging succeeds without vendor, staging only the PHP sources', () => {
  const root = mkdtempSync(join(tmpdir(), 'dabubble-reset-'));
  const base = join(root, 'backend/password-reset');
  mkdirSync(join(base, 'public'), { recursive: true });
  mkdirSync(join(base, 'src'), { recursive: true });
  writeFileSync(join(base, 'public/request-password-reset.php'), '<?php');
  writeFileSync(join(base, 'src/ResetMailer.php'), '<?php');
  writeFileSync(join(base, 'internal.htaccess'), 'Require all denied');
  stageResetApi(root);
  const deployed = join(root, 'dist/dabubble/browser/api');
  assert.equal(existsSync(join(deployed, '_internal/vendor')), false);
  assert.equal(existsSync(join(deployed, '_internal/src/ResetMailer.php')), true);
});

/** Existing local vendor files and private credentials must not enter the bundle. */
test('staging only copies the public handler and protected backend', () => {
  const root = mkdtempSync(join(tmpdir(), 'dabubble-reset-'));
  const base = join(root, 'backend/password-reset');
  const dirs = ['public', 'src', 'vendor'];
  dirs.forEach(dir => mkdirSync(join(base, dir), { recursive: true }));
  for (const [file, value] of [
    ['public/request-password-reset.php', '<?php'],
    ['src/ResetMailer.php', '<?php'],
    ['vendor/autoload.php', '<?php'],
    ['internal.htaccess', 'Require all denied'],
  ]) writeFileSync(join(base, file), value);
  writeFileSync(join(base, 'config.php'), 'SECRET');
  writeFileSync(join(base, 'service-account.json'), 'SECRET');
  stageResetApi(root);
  const deployed = join(root, 'dist/dabubble/browser/api');
  assert.equal(readFileSync(join(deployed, 'request-password-reset.php'), 'utf8'), '<?php');
  assert.equal(readFileSync(join(deployed, '_internal/.htaccess'), 'utf8'), 'Require all denied');
  assert.equal(existsSync(join(deployed, '_internal/vendor')), false);
  assert.equal(existsSync(join(deployed, 'config.php')), false);
  assert.equal(existsSync(join(deployed, 'service-account.json')), false);
});

/** Apache's SPA fallback can return HTTP 200 HTML for an absent API route. */
test('frontend rejects non-JSON responses from the password-reset endpoint', () => {
  const root = new URL('../src/app/core/services/auth.service.ts', import.meta.url);
  const source = readFileSync(root, 'utf8');
  assert.match(source, /response\.headers\.get\('content-type'\)/);
  assert.match(source, /response\.json\(\)/);
  assert.match(source, /Invalid password reset endpoint response/);
});
