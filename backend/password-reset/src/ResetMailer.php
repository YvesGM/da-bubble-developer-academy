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
        $email = RequestGuard::readEmail($site, $this->config['allowed_origins'] ?? [$site]);
        RequestGuard::throttle($this->privateDir.'/reset-rate-limit.json', $email);
        $requestId = bin2hex(random_bytes(8));
        header('X-DABubble-Request-Id: '.$requestId);
        $phase = 'firebase';
        try {
            $link = $this->generateAppLink($email, $site);
            $phase = 'smtp';
            $this->sendEmail($email, $link);
            $this->recordOutcome($requestId, 'smtp_accepted');
        } catch (EmailNotFound) {
            $this->recordOutcome($requestId, 'unknown_account');
        } catch (Throwable $error) {
            $status = $this->failureCategory($phase, $error);
            $this->recordOutcome($requestId, $status);
        }
        http_response_code(200);
        echo json_encode(['message' => 'If an account exists, a reset email will be sent'], JSON_THROW_ON_ERROR);
    }

    /** Records only a generated request ID and coarse outcome, never addresses or tokens. */
    private function recordOutcome(string $id, string $status): void
    {
        $line = gmdate('c').' id='.$id.' outcome='.$status."\n";
        $file = $this->privateDir.'/reset-events.log';
        if (@error_log($line, 3, $file) === false) {
            error_log('DABubble reset diagnostic logging unavailable');
        }
    }

    /** Groups failures without exposing Firebase responses or SMTP credentials. */
    private function failureCategory(string $phase, Throwable $error): string
    {
        if ($phase !== 'smtp') return 'firebase_error';
        $description = strtolower($error->getMessage());
        if (str_contains($description, 'authenticat')) return 'smtp_auth_error';
        if (str_contains($description, 'connect')) return 'smtp_connection_error';
        return 'smtp_error';
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
