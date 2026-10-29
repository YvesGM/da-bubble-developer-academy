<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['message' => $message], JSON_THROW_ON_ERROR);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, 'Method not allowed');
}

$privateDir = dirname(__DIR__, 2).'/dabubble-private';
$configFile = $privateDir.'/config.php';
$internal = __DIR__.'/_internal';
if (!is_file($configFile) || !is_file($internal.'/vendor/autoload.php')) {
    respond(503, 'Reset mail service is not configured');
}

try {
    $config = require $configFile;
    if (!is_array($config)) {
        throw new RuntimeException('Invalid private config');
    }
    $accountFile = (string) ($config['service_account_file'] ?? '');
    $smtp = $config['smtp'] ?? [];
    $required = ['host', 'username', 'password', 'from'];
    if (!is_file($accountFile) || !is_array($smtp)) {
        respond(503, 'Reset mail service is not configured');
    }
    foreach ($required as $key) {
        if (empty($smtp[$key])) respond(503, 'Reset mail service is not configured');
    }
    require $internal.'/vendor/autoload.php';
    require $internal.'/src/RequestGuard.php';
    require $internal.'/src/ResetLink.php';
    require $internal.'/src/ResetMailer.php';
    (new \DABubble\ResetMailer($config, $privateDir))->handle();
} catch (Throwable $error) {
    error_log('DABubble password-reset: '.get_class($error));
    respond(503, 'Password reset is temporarily unavailable');
}
