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

$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method !== 'POST' && $method !== 'OPTIONS') {
    header('Allow: POST, OPTIONS');
    respond(405, 'Method not allowed');
}
$secure = !empty($_SERVER['HTTPS']) && ($_SERVER['HTTPS'] !== 'off');
if (!$secure && (int) ($_SERVER['SERVER_PORT'] ?? 0) !== 443) {
    respond(403, 'HTTPS required');
}

$internal = __DIR__.'/_internal';
if (!is_file($internal.'/src/PrivateDirectory.php')) {
    respond(503, 'Reset mail service is not configured');
}
require_once $internal.'/src/PrivateDirectory.php';
$privateDir = \DABubble\PrivateDirectory::find(__DIR__);
if ($privateDir === null || !is_file($internal.'/vendor/autoload.php')) {
    respond(503, 'Reset mail service is not configured');
}
$configFile = $privateDir.'/config.php';

try {
    $config = require $configFile;
    if (!is_array($config)) {
        throw new RuntimeException('Invalid private config');
    }
    require_once $internal.'/src/ResetCors.php';
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    $allowed = (array) ($config['allowed_origins'] ?? []);
    $permitted = \DABubble\ResetCors::permits($allowed, $origin);
    if ($permitted) \DABubble\ResetCors::writeHeaders($origin);
    if ($method === 'OPTIONS') {
        if (!$permitted) respond(403, 'Forbidden');
        http_response_code(204);
        exit;
    }
    $accountFile = (string) ($config['service_account_file'] ?? '');
    $smtp = $config['smtp'] ?? [];
    $required = ['host', 'username', 'password', 'from'];
    if (!is_file($accountFile) || !is_array($smtp)) {
        respond(503, 'Reset mail service is not configured');
    }
    foreach ($required as $key) {
        $value = (string) ($smtp[$key] ?? '');
        $placeholder = str_starts_with($value, 'YOUR_')
            || str_starts_with($value, 'DEIN_') || str_starts_with($value, 'HIER_');
        if ($value === '' || $placeholder) {
            respond(503, 'Reset mail service is not configured');
        }
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
