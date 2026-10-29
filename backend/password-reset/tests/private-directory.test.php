<?php
declare(strict_types=1);

use DABubble\PrivateDirectory;

require dirname(__DIR__).'/src/PrivateDirectory.php';

$base = sys_get_temp_dir().'/dabubble-path-test-'.bin2hex(random_bytes(8));
$api = $base.'/schniefs-portfolio/projects/dabubble/api';
$private = $base.'/dabubble-private';
if (!mkdir($api, 0700, true) || !mkdir($private, 0700)) {
    throw new RuntimeException('Cannot create test fixture');
}
try {
    if (PrivateDirectory::find($api) !== null) {
        throw new RuntimeException('Nonexistent private config was accepted');
    }
    if (file_put_contents($private.'/config.php', '<?php return [];') === false) {
        throw new RuntimeException('Cannot create test config');
    }
    if (PrivateDirectory::find($api) !== $private) {
        throw new RuntimeException('FTP-root private directory was not found');
    }
    echo "FTP-root private config lookup passed\n";
} finally {
    @unlink($private.'/config.php');
    @rmdir($private);
    @rmdir($api);
    @rmdir(dirname($api));
    @rmdir(dirname(dirname($api)));
    @rmdir(dirname(dirname(dirname($api))));
    @rmdir($base);
}
