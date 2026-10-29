<?php
declare(strict_types=1);

namespace DABubble;

use RuntimeException;

final class RequestGuard
{
    private const WINDOW = 900;
    private const IP_LIMIT = 8;
    private const EMAIL_LIMIT = 3;
    private const GLOBAL_LIMIT = 120;

    /** Rejects invalid requests before touching Firebase or SMTP. */
    public static function readEmail(string $origin, array $allowedOrigins = []): string
    {
        $sentOrigin = $_SERVER['HTTP_ORIGIN'] ?? $origin;
        $type = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
        $allowedOrigins = $allowedOrigins ?: [$origin];
        if (!in_array($sentOrigin, $allowedOrigins, true) || $type !== 'application/json') {
            self::fail(403, 'Forbidden');
        }
        if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 1024) {
            self::fail(413, 'Request too large');
        }
        $data = json_decode(file_get_contents('php://input', false, null, 0, 1025) ?: '', true);
        $email = is_array($data) ? ($data['email'] ?? null) : null;
        if (!is_string($email) || strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            self::fail(422, 'Invalid email address');
        }
        return strtolower(trim($email));
    }

    /** Atomic shared-hosting rate limits: per IP, email, and application. */
    public static function throttle(string $file, string $email): void
    {
        $handle = fopen($file, 'c+');
        if (!$handle || !flock($handle, LOCK_EX)) {
            throw new RuntimeException('Rate limiter unavailable');
        }
        try {
            self::checkAndSave($handle, $email);
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    /** Stores only hashed identifiers, never email addresses or tokens. */
    private static function checkAndSave($handle, string $email): void
    {
        $cutoff = time() - self::WINDOW;
        $entries = json_decode(stream_get_contents($handle) ?: '{}', true) ?: [];
        $entries = array_filter($entries, static fn($timestamps) => is_array($timestamps));
        foreach ($entries as $key => $times) {
            $entries[$key] = array_values(array_filter($times, static fn($t) => is_int($t) && $t > $cutoff));
            if (!$entries[$key]) unset($entries[$key]);
        }
        $keys = ['ip:'.hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown'),
            'email:'.hash('sha256', $email), 'global'];
        $limits = [self::IP_LIMIT, self::EMAIL_LIMIT, self::GLOBAL_LIMIT];
        foreach ($keys as $i => $key) {
            if (count($entries[$key] ?? []) >= $limits[$i]) self::fail(429, 'Too many requests');
        }
        foreach ($keys as $key) $entries[$key][] = time();
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode($entries, JSON_THROW_ON_ERROR));
        fflush($handle);
    }

    /** Produces deterministic JSON errors without exposing account existence. */
    private static function fail(int $status, string $message): never
    {
        http_response_code($status);
        echo json_encode(['message' => $message], JSON_THROW_ON_ERROR);
        exit;
    }
}
