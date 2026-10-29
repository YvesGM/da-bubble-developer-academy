<?php
declare(strict_types=1);

use DABubble\ResetLink;

require dirname(__DIR__).'/src/ResetLink.php';

function check(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException($message);
}

$site = 'https://dabubble.schniefs-portfolio.de';
$code = 'A+Bc/123=';
$firebase = 'https://dabubble-48de7.firebaseapp.com/__/auth/action?'
    .http_build_query(['apiKey' => 'unused', 'mode' => 'resetPassword', 'oobCode' => $code]);
$result = ResetLink::fromFirebase($firebase, $site);
check(str_starts_with($result, $site.'/reset-password?'), 'Wrong Angular route');
parse_str((string) parse_url($result, PHP_URL_QUERY), $params);
check(($params['oobCode'] ?? '') === $code, 'Action code changed');
check(($params['mode'] ?? '') === 'resetPassword', 'Action mode changed');

foreach (['mode=verifyEmail&oobCode=abc', 'mode=resetPassword', ''] as $query) {
    $failed = false;
    try {
        ResetLink::fromFirebase('https://example.com/action?'.$query, $site);
    } catch (RuntimeException) {
        $failed = true;
    }
    check($failed, 'Accepted invalid Firebase action: '.$query);
}
echo "ResetLink tests passed\n";
