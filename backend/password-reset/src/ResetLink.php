<?php
declare(strict_types=1);

namespace DABubble;

use RuntimeException;

/** Converts Firebase password-reset links into the application's reset route. */
final class ResetLink
{
    /**
     * Converts only Firebase password-reset action links into the Angular route.
     *
     * @param string $firebaseLink Firebase-generated action link.
     * @param string $site Canonical HTTPS frontend URL.
     * @return string URL for the Angular password-reset screen.
     * @throws RuntimeException If required Firebase action parameters are missing.
     */
    public static function fromFirebase(string $firebaseLink, string $site): string
    {
        $code = self::resetCode($firebaseLink);
        return rtrim($site, '/').'/reset-password?'.http_build_query([
            'mode' => 'resetPassword', 'oobCode' => $code,
        ], '', '&', PHP_QUERY_RFC3986);
    }

    /**
     * Extracts only the one-time code of a Firebase password-reset action.
     *
     * @param string $firebaseLink Firebase-generated action URL.
     * @return string Verified reset action code.
     * @throws RuntimeException If the link has no valid reset query or code.
     */
    private static function resetCode(string $firebaseLink): string
    {
        $query = parse_url($firebaseLink, PHP_URL_QUERY);
        if (!is_string($query)) throw new RuntimeException('Missing action query');
        parse_str($query, $params);
        if (($params['mode'] ?? null) !== 'resetPassword') {
            throw new RuntimeException('Unexpected Firebase action mode');
        }
        $code = $params['oobCode'] ?? null;
        if (!is_string($code) || !$code) {
            throw new RuntimeException('Missing reset code');
        }
        return $code;
    }
}
