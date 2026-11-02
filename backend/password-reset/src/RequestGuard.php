<?php
declare(strict_types=1);

namespace DABubble;

use RuntimeException;

/** Validates password-reset requests and enforces atomic shared-hosting rate limits. */
final class RequestGuard
{
    private const WINDOW = 900;
    private const IP_LIMIT = 8;
    private const EMAIL_LIMIT = 3;
    private const GLOBAL_LIMIT = 120;

    /**
     * Reads a validated email address without contacting Firebase or SMTP.
     *
     * @param string $origin Canonical frontend origin.
     * @param array $allowedOrigins Permitted browser origins.
     * @return string Normalized email address.
     */
    public static function readEmail(string $origin, array $allowedOrigins = []): string
    {
        self::validateRequest($origin, $allowedOrigins);
        $data = json_decode(file_get_contents('php://input', false, null, 0, 1025) ?: '', true);
        return self::validatedEmail(is_array($data) ? ($data['email'] ?? null) : null);
    }

    /**
     * Rejects unexpected origins, content types, and oversized JSON payloads.
     *
     * @param string $origin Canonical frontend origin.
     * @param list<string> $allowedOrigins Permitted browser origins.
     */
    private static function validateRequest(string $origin, array $allowedOrigins): void
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
    }

    /**
     * Returns a normalized address or rejects malformed and oversized values.
     *
     * @param mixed $email Untrusted JSON value from the request body.
     * @return string Validated lowercase email address.
     */
    private static function validatedEmail(mixed $email): string
    {
        if (!is_string($email) || strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            self::fail(422, 'Invalid email address');
        }
        return strtolower(trim($email));
    }

    /**
     * Enforces atomic shared-hosting rate limits for IP, email, and application.
     *
     * @param string $file Private rate-limit state file.
     * @param string $email Validated email address used only for hashing.
     * @throws RuntimeException When the rate-limit file cannot be locked.
     */
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

    /**
     * Persists only hashed identifiers and timestamps while holding an exclusive lock.
     *
     * @param resource $handle Locked rate-limit file handle.
     * @param string $email Validated address, never written to the file.
     */
    private static function checkAndSave($handle, string $email): void
    {
        $entries = self::recentEntries($handle);
        $keys = self::rateLimitKeys($email);
        self::enforceLimits($entries, $keys);
        foreach ($keys as $key) $entries[$key][] = time();
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode($entries, JSON_THROW_ON_ERROR));
        fflush($handle);
    }

    /**
     * Keeps only timestamps within the configured rate-limit window.
     *
     * @param resource $handle Opened rate-limit state file.
     * @return array<string, list<int>> Timestamp buckets indexed by hashed key.
     */
    private static function recentEntries($handle): array
    {
        $cutoff = time() - self::WINDOW;
        $entries = json_decode(stream_get_contents($handle) ?: '{}', true) ?: [];
        $entries = array_filter($entries, static fn($timestamps) => is_array($timestamps));
        foreach ($entries as $key => $times) {
            $entries[$key] = array_values(array_filter($times, static fn($t) => is_int($t) && $t > $cutoff));
            if (!$entries[$key]) unset($entries[$key]);
        }
        return $entries;
    }

    /**
     * Uses hashed IP and email identifiers plus an application-wide bucket.
     *
     * @param string $email Validated address used solely to derive a hash.
     * @return list<string> Rate-limit keys in threshold order.
     */
    private static function rateLimitKeys(string $email): array
    {
        return ['ip:'.hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown'),
            'email:'.hash('sha256', $email), 'global'];
    }

    /**
     * Rejects requests that exceed per-IP, per-email, or global thresholds.
     *
     * @param array<string, list<int>> $entries Recent rate-limit timestamps.
     * @param list<string> $keys Rate-limit keys ordered by threshold.
     */
    private static function enforceLimits(array $entries, array $keys): void
    {
        $limits = [self::IP_LIMIT, self::EMAIL_LIMIT, self::GLOBAL_LIMIT];
        foreach ($keys as $i => $key) {
            if (count($entries[$key] ?? []) >= $limits[$i]) self::fail(429, 'Too many requests');
        }
    }

    /**
     * Terminates a request with a deterministic JSON error.
     *
     * @param int $status HTTP status code returned to the caller.
     * @param string $message Neutral error description.
     * @return never
     */
    private static function fail(int $status, string $message): never
    {
        http_response_code($status);
        echo json_encode(['message' => $message], JSON_THROW_ON_ERROR);
        exit;
    }
}
