<?php
declare(strict_types=1);

namespace DABubble;

use Kreait\Firebase\Factory;
use Kreait\Firebase\Exception\Auth\EmailNotFound;
use PHPMailer\PHPMailer\PHPMailer;
use RuntimeException;
use Throwable;

final class ResetMailer
{
    public function __construct(private array $config, private string $privateDir) {}

    /** Handles one neutral reset request. Unknown users are never disclosed. */
    public function handle(): void
    {
        $site = rtrim((string) ($this->config['site_url'] ?? ''), '/');
        if (!str_starts_with($site, 'https://')) throw new RuntimeException('HTTPS site required');
        $email = RequestGuard::readEmail($site);
        RequestGuard::throttle($this->privateDir.'/reset-rate-limit.json', $email);
        try {
            $link = $this->generateAppLink($email, $site);
            $this->sendEmail($email, $link);
        } catch (EmailNotFound) {
            // Intentionally do not disclose whether the Firebase user exists.
        } catch (Throwable $error) {
            error_log('DABubble reset delivery failure: '.get_class($error));
        }
        http_response_code(200);
        echo json_encode(['message' => 'If an account exists, a reset email will be sent'], JSON_THROW_ON_ERROR);
    }

    /** Firebase Admin SDK generates a real one-time action code, not a custom token. */
    private function generateAppLink(string $email, string $site): string
    {
        $file = (string) ($this->config['service_account_file'] ?? '');
        if (!is_file($file)) throw new RuntimeException('Service account missing');
        $auth = (new Factory())->withServiceAccount($file)->createAuth();
        $firebaseLink = $auth->getPasswordResetLink($email);
        return ResetLink::fromFirebase($firebaseLink, $site);
    }

    /** Sends the reset link using the dedicated ALL-INKL SMTP mailbox. */
    private function sendEmail(string $email, string $url): void
    {
        $smtp = $this->config['smtp'] ?? [];
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = (string) $smtp['host'];
        $mail->Port = (int) $smtp['port'];
        $mail->SMTPAuth = true;
        $mail->SMTPSecure = $mail->Port === 465
            ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Username = (string) $smtp['username'];
        $mail->Password = (string) $smtp['password'];
        $mail->Timeout = 10;
        $mail->CharSet = 'UTF-8';
        $mail->setFrom((string) $smtp['from'], (string) ($smtp['from_name'] ?? 'DABubble'));
        $mail->addAddress($email);
        $mail->Subject = 'DABubble – Passwort zurücksetzen';
        $safe = htmlspecialchars($url, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $mail->isHTML(true);
        $mail->Body = '<p>Du hast eine Passwortzurücksetzung angefordert.</p>'
            .'<p><a href="'.$safe.'">Passwort zurücksetzen</a></p>'
            .'<p>Wenn du das nicht warst, ignoriere diese Nachricht.</p>';
        $mail->AltBody = "DABubble Passwort zurücksetzen:\n".$url
            ."\nWenn du das nicht warst, ignoriere diese Nachricht.";
        $mail->send();
    }
}
