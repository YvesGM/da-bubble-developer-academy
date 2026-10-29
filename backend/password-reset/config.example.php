<?php
declare(strict_types=1);

/** Store as /dabubble-private/config.php outside every public document root. */
return [
    'site_url' => 'https://dabubble.schniefs-portfolio.de',
    'allowed_origins' => [
        'https://dabubble.schniefs-portfolio.de',
        'https://yves-gildemeister.developerakademie.net',
    ],
    'service_account_file' => __DIR__.'/service-account.json',
    'smtp' => [
        'host' => 'YOUR_KAS_LOGIN.kasserver.com',
        'port' => 465,
        'username' => 'YOUR_FULL_MAILBOX_EMAIL',
        'password' => 'YOUR_SMTP_PASSWORD',
        'from' => 'YOUR_FULL_MAILBOX_EMAIL',
        'from_name' => 'DABubble',
    ],
];
