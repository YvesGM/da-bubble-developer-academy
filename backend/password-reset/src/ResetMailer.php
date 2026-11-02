<?php
declare(strict_types=1);

namespace DABubble;

use Kreait\Firebase\Factory;
use Kreait\Firebase\Exception\Auth\EmailNotFound;
use PHPMailer\PHPMailer\PHPMailer;
use RuntimeException;
use Throwable;

/** Coordinates Firebase reset-link generation and SMTP delivery without account disclosure. */
final class ResetMailer
{
    /**
     * Stores the reset-delivery configuration and private diagnostic directory.
     *
     * @param array<string, mixed> $config Firebase, SMTP, and frontend settings.
     * @param string $privateDir Server-only directory for diagnostics and throttling.
     */
    public function __construct(private array $config, private string $privateDir) {}

    /**
     * Handles one neutral reset request without revealing whether an account exists.
     *
     * @return void Writes the same accepted response for known and unknown accounts.
     */
    public function handle(): void
    {
        $site = rtrim((string) ($this->config['site_url'] ?? ''), '/');
        if (!str_starts_with($site, 'https://')) throw new RuntimeException('HTTPS site required');
        $email = RequestGuard::readEmail($site, $this->config['allowed_origins'] ?? [$site]);
        RequestGuard::throttle($this->privateDir.'/reset-rate-limit.json', $email);
        $requestId = bin2hex(random_bytes(8));
        header('X-DABubble-Request-Id: '.$requestId);
        $this->processReset($email, $site, $requestId);
        $this->writeNeutralResponse();
    }

    /**
     * Generates and delivers a reset link while recording only coarse outcomes.
     *
     * @param string $email Validated recipient address.
     * @param string $site Canonical HTTPS frontend origin.
     * @param string $requestId Random identifier for privacy-safe diagnostics.
     */
    private function processReset(string $email, string $site, string $requestId): void
    {
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
    }

    /**
     * Sends an identical response regardless of account existence or delivery outcome.
     *
     * @return void Writes the account-neutral response body.
     */
    private function writeNeutralResponse(): void
    {
        http_response_code(200);
        echo json_encode(['message' => 'If an account exists, a reset email will be sent'], JSON_THROW_ON_ERROR);
    }

    /**
     * Records only a generated request ID and coarse outcome, never addresses or tokens.
     *
     * @param string $id Generated diagnostic request identifier.
     * @param string $status Coarse Firebase or SMTP delivery result.
     */
    private function recordOutcome(string $id, string $status): void
    {
        $line = gmdate('c').' id='.$id.' outcome='.$status."\n";
        $file = $this->privateDir.'/reset-events.log';
        if (@error_log($line, 3, $file) === false) {
            error_log('DABubble reset diagnostic logging unavailable');
        }
    }

    /**
     * Groups failures without exposing Firebase responses or SMTP credentials.
     *
     * @param string $phase Processing phase in which delivery failed.
     * @param Throwable $error Failure used only to select a coarse category.
     * @return string Privacy-safe error category for server diagnostics.
     */
    private function failureCategory(string $phase, Throwable $error): string
    {
        if ($phase !== 'smtp') return 'firebase_error';
        $description = strtolower($error->getMessage());
        if (str_contains($description, 'authenticat')) return 'smtp_auth_error';
        if (str_contains($description, 'connect')) return 'smtp_connection_error';
        return 'smtp_error';
    }

    /**
     * Generates a Firebase one-time password-reset action URL.
     *
     * @param string $email Validated account email address.
     * @param string $site Canonical frontend URL to receive the action code.
     * @return string Application URL containing the Firebase action code.
     * @throws RuntimeException If the service-account configuration is missing.
     */
    private function generateAppLink(string $email, string $site): string
    {
        $file = (string) ($this->config['service_account_file'] ?? '');
        if (!is_file($file)) throw new RuntimeException('Service account missing');
        $auth = (new Factory())->withServiceAccount($file)->createAuth();
        $firebaseLink = $auth->getPasswordResetLink($email);
        return ResetLink::fromFirebase($firebaseLink, $site);
    }

    /**
     * Sends the reset link using the dedicated ALL-INKL SMTP mailbox.
     *
     * @param string $email Recipient address validated by the request guard.
     * @param string $url Firebase-generated reset destination.
     */
    private function sendEmail(string $email, string $url): void
    {
        $mail = $this->configuredMailer();
        $mail->addAddress($email);
        $mail->Subject = 'DABubble – Passwort zurücksetzen';
        $this->setMessageBody($mail, $url);
        $mail->send();
    }

    /**
     * Creates the SMTP transport configuration without attaching recipient data.
     *
     * @return PHPMailer Transport configured with the private SMTP credentials.
     */
    private function configuredMailer(): PHPMailer
    {
        $smtp = $this->config['smtp'] ?? [];
        $mail = new PHPMailer(true);
        $this->configureSmtp($mail, $smtp);
        return $mail;
    }

    /**
     * Applies the existing authenticated SMTP settings to a mailer instance.
     *
     * @param PHPMailer $mail Transport to configure.
     * @param array<string, mixed> $smtp Private SMTP connection settings.
     */
    private function configureSmtp(PHPMailer $mail, array $smtp): void
    {
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
    }

    /**
     * Builds both HTML and plain-text reset messages with an escaped HTML URL.
     *
     * @param PHPMailer $mail Mailer receiving the message body.
     * @param string $url Firebase reset URL to include in both alternatives.
     */
    private function setMessageBody(PHPMailer $mail, string $url): void
    {
        $safe = htmlspecialchars($url, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $mail->isHTML(true);
        $mail->Body = '<p>Du hast eine Passwortzurücksetzung angefordert.</p>'
            .'<p><a href="'.$safe.'">Passwort zurücksetzen</a></p>'
            .'<p>Wenn du das nicht warst, ignoriere diese Nachricht.</p>';
        $mail->AltBody = "DABubble Passwort zurücksetzen:\n".$url
            ."\nWenn du das nicht warst, ignoriere diese Nachricht.";
    }
}
