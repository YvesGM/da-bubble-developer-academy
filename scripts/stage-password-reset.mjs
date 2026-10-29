import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Stages server-side PHP files after Angular builds without copying credentials. */
export function stageResetApi(projectRoot) {
  const base = resolve(projectRoot, 'backend/password-reset');
  const output = resolve(projectRoot, 'dist/dabubble/browser/api');
  // Composer packages are installed once in ALL-INKL's protected API directory.
  // They must never be included in the regularly deployed Angular bundle.
  rmSync(resolve(output, '_internal/vendor'), { recursive: true, force: true });
  mkdirSync(resolve(output, '_internal'), { recursive: true });
  cpSync(resolve(base, 'public/request-password-reset.php'),
    resolve(output, 'request-password-reset.php'));
  cpSync(resolve(base, 'src'), resolve(output, '_internal/src'), { recursive: true });
  cpSync(resolve(base, 'internal.htaccess'), resolve(output, '_internal/.htaccess'));
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) stageResetApi(process.cwd());
