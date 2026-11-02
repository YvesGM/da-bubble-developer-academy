<?php
declare(strict_types=1);

namespace DABubble;

/** Locates server-only credentials in an ancestor's private sibling folder. */
final class PrivateDirectory
{
    /**
     * Supports FTP-root/schniefs-portfolio/.../api and local Angular layouts.
     * Never reads secrets from inside the web application itself.
     *
     * @param string $apiDirectory Public API entry directory.
     * @return string|null Private configuration directory, if one exists.
     */
    public static function find(string $apiDirectory): ?string
    {
        $current = realpath($apiDirectory) ?: $apiDirectory;
        do {
            $parent = dirname($current);
            $candidate = $parent.'/dabubble-private';
            if (is_file($candidate.'/config.php')) return $candidate;
            if ($parent === $current) return null;
            $current = $parent;
        } while (true);
    }
}
