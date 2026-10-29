<?php
declare(strict_types=1);

/**
 * Copy to FTP root/dabubble-private/config.php, next to schniefs-portfolio/.
 * Keep service-account.json next to this private config. Never commit secrets.
 */
return [
    'site_url' => 'https://dabubble.schniefs-portfolio.de',
    // For local PHP development only, add 'http://localhost:4200' here.
    'allowed_origins' => ['https://dabubble.schniefs-portfolio.de'],
    'service_account_file' => __DIR__.'/service-account.json',
    'smtp' => [
        'host' => 'YOUR_KAS_LOGIN.kasserver.com',
        'port' => 465,
        'username' => 'YOUR_SENDER_MAILBOX',
        'password' => 'YOUR_SMTP_PASSWORD',
        'from' => 'YOUR_SENDER_MAILBOX',
        'from_name' => 'DABubble',
    ],
];
