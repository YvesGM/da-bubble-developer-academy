<?php
declare(strict_types=1);

namespace DABubble;

use RuntimeException;

final class ResetLink
{
    /** Converts only verified Firebase reset-action URLs into the Angular route. */
    public static function fromFirebase(string $firebaseLink, string $site): string
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
        return rtrim($site, '/').'/reset-password?'.http_build_query([
            'mode' => 'resetPassword', 'oobCode' => $code,
        ], '', '&', PHP_QUERY_RFC3986);
    }
}
