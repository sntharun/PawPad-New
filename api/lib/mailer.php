<?php
/**
 * Sends email over SMTP (PHPMailer) from one of Pawpad's mailboxes:
 * courses@ for admissions emails, info@ for booking confirmations.
 */

declare(strict_types=1);

if (!defined('PAWPAD_API')) {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/PHPMailer/Exception.php';
require_once __DIR__ . '/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;

/**
 * SMTP settings for a mailbox. "courses" uses the smtp_* settings; "info"
 * uses info_email / info_password and the same mail server unless
 * info_smtp_* settings say otherwise.
 */
function mail_account(string $which): array
{
    $c = pawpad_config();
    if ($which === 'info') {
        $email = (string) ($c['info_email'] ?? 'info@pawpad.in');
        return [
            'host' => $c['info_smtp_host'] ?? $c['smtp_host'] ?? '',
            'port' => (int) ($c['info_smtp_port'] ?? $c['smtp_port'] ?? 465),
            'secure' => $c['info_smtp_secure'] ?? $c['smtp_secure'] ?? 'ssl',
            'user' => $email,
            'password' => (string) ($c['info_password'] ?? ''),
            'from' => $email,
            'from_name' => $c['info_from_name'] ?? 'Pawpad Grooming Studio',
            'bcc' => $email,
            'setting' => 'info_password',
        ];
    }
    return [
        'host' => $c['smtp_host'] ?? '',
        'port' => (int) ($c['smtp_port'] ?? 465),
        'secure' => $c['smtp_secure'] ?? 'ssl',
        'user' => $c['smtp_user'] ?? '',
        'password' => (string) ($c['smtp_password'] ?? ''),
        'from' => $c['mail_from'] ?? ($c['smtp_user'] ?? ''),
        'from_name' => $c['mail_from_name'] ?? 'Pawpad Academy',
        'bcc' => $c['mail_bcc'] ?? '',
        'setting' => 'smtp_password',
    ];
}

function mail_configured(string $which = 'courses'): bool
{
    $a = mail_account($which);
    return $a['host'] !== '' && $a['user'] !== '' && $a['password'] !== '';
}

/**
 * @return array{sent: bool, error: string}
 */
function send_mail(string $which, string $toEmail, string $toName, string $subject, string $body): array
{
    if (!filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
        return ['sent' => false, 'error' => 'There is no valid email address to send to.'];
    }
    if (!mail_configured($which)) {
        $a = mail_account($which);
        return ['sent' => false, 'error' => 'Email is not set up yet (' . $a['setting'] . ' in config.php).'];
    }

    $a = mail_account($which);
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = $a['host'];
        $mail->Port = $a['port'];
        $mail->SMTPAuth = true;
        $mail->Username = $a['user'];
        $mail->Password = $a['password'];
        if ($a['secure'] === 'tls') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        } elseif ($a['secure'] === 'ssl') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        } else {
            $mail->SMTPSecure = '';
            $mail->SMTPAutoTLS = false;
        }
        $mail->Timeout = 20;
        $mail->CharSet = PHPMailer::CHARSET_UTF8;

        $mail->setFrom($a['from'], $a['from_name']);
        $mail->addReplyTo($a['from'], $a['from_name']);
        $mail->addAddress($toEmail, $toName);
        if (!empty($a['bcc']) && strcasecmp($a['bcc'], $toEmail) !== 0) {
            $mail->addBCC($a['bcc']);
        }

        $mail->isHTML(false);
        $mail->Subject = $subject;
        $mail->Body = $body;
        $mail->send();
        return ['sent' => true, 'error' => ''];
    } catch (Throwable $e) {
        error_log('Pawpad API email failed (' . $which . '): ' . $mail->ErrorInfo);
        return ['sent' => false, 'error' => 'The mail server refused the email. Check the ' . $a['setting'] . ' setting in config.php.'];
    }
}

/**
 * An HTML email (with a plain-text copy) to several people at once, e.g. the
 * daily report from info@ to every Owner and Administrator.
 * @return array{sent: bool, error: string}
 */
function send_html_mail(string $which, array $toEmails, string $subject, string $html, string $text): array
{
    $toEmails = array_values(array_filter($toEmails, function ($email): bool {
        return (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
    }));
    if (!$toEmails) {
        return ['sent' => false, 'error' => 'There is no valid email address to send to.'];
    }
    if (!mail_configured($which)) {
        $a = mail_account($which);
        return ['sent' => false, 'error' => 'Email is not set up yet (' . $a['setting'] . ' in config.php).'];
    }
    $a = mail_account($which);
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = $a['host'];
        $mail->Port = $a['port'];
        $mail->SMTPAuth = true;
        $mail->Username = $a['user'];
        $mail->Password = $a['password'];
        if ($a['secure'] === 'tls') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        } elseif ($a['secure'] === 'ssl') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        } else {
            $mail->SMTPSecure = '';
            $mail->SMTPAutoTLS = false;
        }
        $mail->Timeout = 20;
        $mail->CharSet = PHPMailer::CHARSET_UTF8;
        $mail->setFrom($a['from'], $a['from_name']);
        $mail->addReplyTo($a['from'], $a['from_name']);
        foreach ($toEmails as $email) {
            $mail->addAddress($email);
        }
        $inList = array_filter($toEmails, function ($email) use ($a): bool {
            return strcasecmp($email, (string) $a['bcc']) === 0;
        });
        if (!empty($a['bcc']) && !$inList) {
            $mail->addBCC($a['bcc']);
        }
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $html;
        $mail->AltBody = $text;
        $mail->send();
        return ['sent' => true, 'error' => ''];
    } catch (Throwable $e) {
        error_log('Pawpad API email failed (' . $which . '): ' . $mail->ErrorInfo);
        return ['sent' => false, 'error' => 'The mail server refused the email. Check the ' . $a['setting'] . ' setting in config.php.'];
    }
}

/**
 * Admissions emails, sent from courses@ with a copy to courses@.
 */
function send_candidate_email(string $toEmail, string $toName, string $subject, string $body): array
{
    return send_mail('courses', $toEmail, $toName, $subject, $body);
}

/** Sends an already-issued invoice from info@. A failed send never changes its number or PDF. */
function send_invoice_attachment(string $toEmail, string $toName, string $number, string $pdfPath, string $document = 'invoice'): array
{
    if (!filter_var($toEmail, FILTER_VALIDATE_EMAIL)) return ['sent' => false, 'error' => 'There is no valid customer email address.'];
    if (!mail_configured('info')) return ['sent' => false, 'error' => 'The info@ SMTP mailbox is not configured.'];
    $a = mail_account('info');
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = $a['host']; $mail->Port = $a['port']; $mail->SMTPAuth = true;
        $mail->Username = $a['user']; $mail->Password = $a['password'];
        if ($a['secure'] === 'tls') $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        elseif ($a['secure'] === 'ssl') $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        else { $mail->SMTPSecure = ''; $mail->SMTPAutoTLS = false; }
        $mail->Timeout = 20; $mail->CharSet = PHPMailer::CHARSET_UTF8;
        $mail->setFrom($a['from'], $a['from_name']);
        $mail->addReplyTo($a['from'], $a['from_name']);
        $mail->addAddress($toEmail, $toName);
        $mail->Subject = 'Your Pawpad ' . $document . ' ' . $number;
        $mail->isHTML(false);
        $mail->Body = "Hello {$toName},\n\nAttached is your Pawpad {$document} {$number}. Please reply to this email if you have any questions.\n\nPawpad Team";
        $mail->addAttachment($pdfPath, preg_replace('/[^A-Za-z0-9_.-]/', '-', $number) . '.pdf', 'base64', 'application/pdf');
        $mail->send();
        return ['sent' => true, 'error' => ''];
    } catch (Throwable $e) {
        error_log('Pawpad invoice email failed: ' . $mail->ErrorInfo);
        return ['sent' => false, 'error' => 'The mail server refused the invoice email. Retry from the invoice register.'];
    }
}
