import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Stages server-side PHP files after Angular builds without copying credentials. */
export function stageResetApi(projectRoot) {
  const base = resolve(projectRoot, 'backend/password-reset');
  const output = resolve(projectRoot, 'dist/dabubble/browser/api');
  const vendor = resolve(base, 'vendor/autoload.php');
  if (!existsSync(vendor)) throw new Error('Run composer install in backend/password-reset');
  mkdirSync(resolve(output, '_internal'), { recursive: true });
  cpSync(resolve(base, 'public/request-password-reset.php'),
    resolve(output, 'request-password-reset.php'));
  cpSync(resolve(base, 'src'), resolve(output, '_internal/src'), { recursive: true });
  cpSync(resolve(base, 'vendor'), resolve(output, '_internal/vendor'), { recursive: true });
  cpSync(resolve(base, 'internal.htaccess'), resolve(output, '_internal/.htaccess'));
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) stageResetApi(process.cwd());
