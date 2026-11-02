<?php
declare(strict_types=1);

namespace DABubble;

/** Allowlisted cross-origin calls from the Developer Akademie frontend. */
final class ResetCors
{
    /**
     * Accepts only explicitly configured browser origins.
     *
     * @param list<string> $allowedOrigins Explicit CORS origin allowlist.
     * @param string $origin Origin sent by the requesting browser.
     * @return bool Whether the origin may access the reset endpoint.
     */
    public static function permits(array $allowedOrigins, string $origin): bool
    {
        return $origin !== '' && in_array($origin, $allowedOrigins, true);
    }

    /**
     * Responds to the JSON request's CORS preflight without opening other origins.
     *
     * @param string $origin Previously validated browser origin.
     */
    public static function writeHeaders(string $origin): void
    {
        header('Access-Control-Allow-Origin: '.$origin);
        header('Access-Control-Allow-Methods: POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
        header('Access-Control-Expose-Headers: X-DABubble-Request-Id');
        header('Vary: Origin');
    }
}
