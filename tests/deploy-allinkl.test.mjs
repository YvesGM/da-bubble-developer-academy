import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');

/** Production must upload both Angular and the staged PHP API to ALL-INKL only. */
test('FTPS targets the DABubble portfolio directory, not Developer Akademie', () => {
  assert.match(workflow, /secrets\.FTP_HOST/);
  assert.match(workflow, /secrets\.FTP_USERNAME/);
  assert.match(workflow, /secrets\.FTP_PASSWORD/);
  assert.match(workflow, /set ftp:ssl-force true/);
  assert.match(workflow, /set ftp:ssl-protect-data true/);
  assert.match(workflow, /set ssl:verify-certificate true/);
  assert.match(workflow, /-p 21 "ftp:\/\/\$FTP_HOST"/);
  assert.match(workflow, /mirror --reverse --verbose --parallel=4 --exclude=/);
  assert.match(workflow, /\^api\/_internal\/vendor\(\/\|\$\)/);
  assert.doesNotMatch(workflow, /composer install/);
  assert.doesNotMatch(workflow, /ALLINKL_FTP_/);
});
