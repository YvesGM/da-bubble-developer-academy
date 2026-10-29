<?php
declare(strict_types=1);

use DABubble\ResetCors;

require dirname(__DIR__).'/src/ResetCors.php';

$origins = [
    'https://dabubble.schniefs-portfolio.de',
    'https://yves-gildemeister.developerakademie.net',
];
foreach ($origins as $origin) {
    if (!ResetCors::permits($origins, $origin)) {
        throw new RuntimeException('Expected origin rejected: '.$origin);
    }
}
foreach (['', 'null', 'https://evil.invalid',
    'https://yves-gildemeister.developerakademie.net.evil.invalid',
    'http://yves-gildemeister.developerakademie.net',
] as $origin) {
    if (ResetCors::permits($origins, $origin)) {
        throw new RuntimeException('Disallowed origin accepted: '.$origin);
    }
}
echo "Reset CORS allowlist tests passed\n";
