<?php
/**
 * Course applications: public submission with real sequential IDs, and the
 * admin actions (list, status changes, notes, candidate emails, delete).
 */

declare(strict_types=1);

if (!defined('PAWPAD_API')) {
    http_response_code(404);
    exit;
}

const APPLICATION_STATUSES = ['pending_review', 'interview_scheduled', 'approved', 'rejected', 'enrolled'];

const STATUS_LABELS = [
    'pending_review' => 'Pending Review',
    'interview_scheduled' => 'Interview Scheduled',
    'approved' => 'Approved & Accepted',
    'rejected' => 'Declined',
    'enrolled' => 'Enrolled & Payment Confirmed',
];

/**
 * The admissions workflow: which status each step may start from, and who may
 * take it. New → interview (Manager or Admin) → Approved / Declined (Owner or
 * Administrator, after the interview) → payment → Enrolled (Manager or Admin).
 */
const APPLICATION_STEPS = [
    'interview_scheduled' => ['from' => ['pending_review', 'interview_scheduled'], 'roles' => STAFF_ROLES],
    'approved' => ['from' => ['pending_review', 'interview_scheduled'], 'roles' => ADMIN_ROLES],
    'rejected' => ['from' => ['pending_review', 'interview_scheduled', 'approved'], 'roles' => ADMIN_ROLES],
    'pending_review' => ['from' => ['rejected'], 'roles' => ADMIN_ROLES],
    'enrolled' => ['from' => ['approved'], 'roles' => STAFF_ROLES],
];

function application_step_verb(string $step): string
{
    $verbs = [
        'interview_scheduled' => 'schedule the interview',
        'approved' => 'approve applications',
        'rejected' => 'decline applications',
        'pending_review' => 'reopen applications',
        'enrolled' => 'enrol this candidate',
    ];
    return $verbs[$step] ?? 'do this';
}

/** "2026-09-26T10:30" (from the admin panel) → "Sat 26 Sep 2026, 10:30 AM". */
function friendly_interview(string $value): string
{
    try {
        return (new DateTimeImmutable($value, new DateTimeZone(STUDIO_TIMEZONE)))->format('D j M Y, g:i A');
    } catch (Exception $e) {
        return $value;
    }
}

/** A short note to every Owner and Administrator (from courses@) that an interview was scheduled. */
function notify_interview_scheduled(array $row, string $interviewDate, array $admin): bool
{
    $recipients = report_recipients();
    if (!$recipients) {
        return false;
    }
    $subject = 'Interview scheduled: ' . $row['applicant_name'] . ', ' . $row['course_name'];
    $text = 'Interview scheduled: ' . $row['applicant_name'] . ', ' . $row['course_name'] . ', ' . friendly_interview($interviewDate)
        . ', scheduled by ' . $admin['email'] . ".\n\nApplication " . $row['id'] . ' · ' . $row['applicant_phone'] . ' · ' . $row['applicant_email']
        . "\n\nAfter the interview, approve or decline it in the Pawpad admin panel (Course Applications).\n";
    $html = '<p style="font-family:Arial,sans-serif;font-size:14px">' . nl2br(html_text($text)) . '</p>';
    return send_html_mail('courses', $recipients, $subject, $html, $text)['sent'];
}

// How a payment was made. "not_paid" is only used in the daily closing.
const PAYMENT_MODES = ['upi' => 'UPI', 'cash' => 'Cash', 'card' => 'Card', 'bank_transfer' => 'Bank transfer'];

/** "1,500.50" or 1500.5 → 1500.5; null when it isn't a sensible amount. */
function parse_amount($value): ?float
{
    if (is_int($value) || is_float($value)) {
        $amount = (float) $value;
    } else {
        $text = str_replace([',', '₹', ' '], '', (string) $value);
        if (!preg_match('/^\d+(\.\d{1,2})?$/', $text)) {
            return null;
        }
        $amount = (float) $text;
    }
    return ($amount >= 0 && $amount <= 10000000) ? round($amount, 2) : null;
}

function format_rupees(float $amount): string
{
    return '₹' . number_format($amount, fmod($amount, 1.0) == 0.0 ? 0 : 2);
}

function decode_list(?string $json): array
{
    $value = json_decode((string) $json, true);
    return is_array($value) ? $value : [];
}

function encode_json($value): string
{
    return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

/**
 * Database row → the same shape the admin panel already uses.
 */
function payment_to_array(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'amount' => (float) $row['amount'],
        'paidOn' => $row['paid_on'],
        'mode' => $row['mode'],
        'modeLabel' => PAYMENT_MODES[$row['mode']] ?? $row['mode'],
        'reference' => $row['reference'],
        'invoiceNo' => $row['invoice_no'] ?? '',
        'adjustmentNos' => $row['adjustment_nos'] ?? [],
        'recordedBy' => $row['recorded_by'],
        'createdAt' => to_iso($row['created_at']),
    ];
}

/** Payments per application id, for one application or (null) all of them. */
function payments_by_application(?string $id = null): array
{
    if ($id === null) {
        $stmt = db()->query("SELECT p.*, s.id AS invoice_sale_id, s.issued_no AS invoice_no FROM course_payments p LEFT JOIN invoice_source_links l ON l.kind='course' AND l.source_id=p.id LEFT JOIN invoice_sales s ON s.id=l.sale_id ORDER BY p.paid_on, p.id");
    } else {
        $stmt = db()->prepare("SELECT p.*, s.id AS invoice_sale_id, s.issued_no AS invoice_no FROM course_payments p LEFT JOIN invoice_source_links l ON l.kind='course' AND l.source_id=p.id LEFT JOIN invoice_sales s ON s.id=l.sale_id WHERE p.application_id = ? ORDER BY p.paid_on, p.id");
        $stmt->execute([$id]);
    }
    $byApp = [];
    $rows = $stmt->fetchAll();
    $noteNumbers = invoice_adjustment_numbers(array_column($rows, 'invoice_sale_id'));
    foreach ($rows as $row) {
        $row['adjustment_nos'] = $noteNumbers[(int) ($row['invoice_sale_id'] ?? 0)] ?? [];
        $byApp[$row['application_id']][] = payment_to_array($row);
    }
    return $byApp;
}

function application_to_array(array $row, ?array $payments = null): array
{
    if ($payments === null) {
        $payments = payments_by_application($row['id'])[$row['id']] ?? [];
    }
    return [
        'payments' => $payments,
        'paidTotal' => array_sum(array_column($payments, 'amount')),
        'id' => $row['id'],
        'courseKey' => $row['course_key'],
        'courseCode' => $row['course_code'],
        'courseName' => $row['course_name'],
        'courseFee' => $row['course_fee'],
        'createdAt' => to_iso($row['created_at']),
        'status' => $row['status'],
        'enrolledAt' => to_iso($row['enrolled_at'] ?? null),
        'interviewDate' => $row['interview_date'],
        'applicant' => [
            'name' => $row['applicant_name'],
            'phone' => $row['applicant_phone'],
            'email' => $row['applicant_email'],
            'city' => $row['applicant_city'],
        ],
        'responses' => decode_list($row['responses']),
        'acknowledgments' => decode_list($row['acknowledgments']),
        'staffNotes' => decode_list($row['staff_notes']),
        'communications' => decode_list($row['communications']),
    ];
}

function find_application(string $id): array
{
    $stmt = db()->prepare('SELECT * FROM applications WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Application not found.', 404);
    }
    return $row;
}

/**
 * Next number for a course prefix, e.g. PCGEC → 7, in one atomic statement.
 * The row stays locked until COMMIT, so two people applying at the same
 * moment always get different numbers, and a failed save leaves no gap.
 */
function next_sequence(PDO $pdo, string $prefix): int
{
    $pdo->prepare(
        'INSERT INTO course_sequences (prefix, last_number) VALUES (?, LAST_INSERT_ID(1))
         ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)'
    )->execute([$prefix]);
    return (int) $pdo->query('SELECT LAST_INSERT_ID()')->fetchColumn();
}

function is_retryable_lock_error(Throwable $e): bool
{
    // 1213 = deadlock, 1205 = lock wait timeout: MySQL asks us to simply try again.
    return $e instanceof PDOException && isset($e->errorInfo[1]) && in_array((int) $e->errorInfo[1], [1205, 1213], true);
}

function submit_application(array $input): array
{
    if (!empty($input['botcheck'])) {
        json_error('Submission rejected.');
    }
    rate_limit('submit', 30, 3600);

    $applicant = is_array($input['applicant'] ?? null) ? $input['applicant'] : [];
    $name = clean_text($applicant['name'] ?? '', 255);
    $email = clean_text($applicant['email'] ?? '', 255);
    $phone = clean_text($applicant['phone'] ?? '', 60);
    if ($name === '' || $phone === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_error('Please fill in your name, phone number and a valid email address.');
    }

    $prefix = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) ($input['courseCode'] ?? '')));
    $prefix = substr($prefix, 0, 12) ?: 'APP';
    if (course_applications_closed($prefix, (string) ($input['courseKey'] ?? ''))) {
        json_error('Sorry, we are not accepting new course applications right now. Please WhatsApp us on +91 91484 43330 to hear when the next batch opens.', 403);
    }

    $responses = [];
    if (is_array($input['responses'] ?? null)) {
        foreach (array_slice($input['responses'], 0, 40, true) as $key => $value) {
            $cleanKey = preg_replace('/[^A-Za-z0-9_]/', '', (string) $key);
            if ($cleanKey !== '') {
                $responses[substr($cleanKey, 0, 60)] = clean_text($value, 5000);
            }
        }
    }
    $acks = [];
    if (is_array($input['acknowledgments'] ?? null)) {
        foreach (array_slice($input['acknowledgments'], 0, 30, true) as $key => $value) {
            $cleanKey = preg_replace('/[^A-Za-z0-9_]/', '', (string) $key);
            if ($cleanKey !== '') {
                $acks[substr($cleanKey, 0, 60)] = true;
            }
        }
    }

    $now = now_utc();
    $notes = [['author' => 'System', 'date' => to_iso($now), 'text' => 'Application submitted online.']];

    $pdo = db();
    for ($attempt = 1; ; $attempt++) {
        $pdo->beginTransaction();
        try {
            $number = next_sequence($pdo, $prefix);
            $id = $prefix . ' - ' . str_pad((string) $number, 3, '0', STR_PAD_LEFT);
            $pdo->prepare(
                'INSERT INTO applications (id, course_key, course_code, course_name, course_fee, status, interview_date,
                    applicant_name, applicant_phone, applicant_email, applicant_city, responses, acknowledgments,
                    staff_notes, communications, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([
                $id,
                clean_text($input['courseKey'] ?? '', 60),
                $prefix,
                clean_text($input['courseName'] ?? '', 255),
                clean_text($input['courseFee'] ?? '', 60),
                'pending_review',
                '',
                $name,
                $phone,
                $email,
                clean_text($applicant['city'] ?? '', 120),
                encode_json((object) $responses),
                encode_json((object) $acks),
                encode_json($notes),
                '[]',
                $now,
                $now,
            ]);
            $pdo->commit();
            return ['id' => $id];
        } catch (Throwable $e) {
            $pdo->rollBack();
            if ($attempt < 5 && is_retryable_lock_error($e)) {
                usleep(random_int(20000, 120000));
                continue;
            }
            error_log('Pawpad API submit failed: ' . $e->getMessage());
            json_error('Could not save your application. Please try again.', 500);
        }
    }
}

/**
 * "Accept New Candidate Applications Online" (Website Content CMS → Courses) is off.
 * Studio setup consulting (GSSC) has its own form and is not affected.
 */
function course_applications_closed(string $prefix, string $courseKey): bool
{
    $stmt = db()->prepare("SELECT data FROM site_content WHERE page_key = 'courses'");
    $stmt->execute();
    $courses = json_decode((string) $stmt->fetchColumn(), true);
    if (!is_array($courses) || !array_key_exists('allowSubmissions', $courses) || $courses['allowSubmissions'] !== false) {
        return false;
    }
    return $prefix !== 'GSSC' && stripos($courseKey, 'gssc') === false && stripos($courseKey, 'consult') === false;
}

function list_applications(): array
{
    $rows = db()->query('SELECT * FROM applications ORDER BY created_at DESC, id DESC')->fetchAll();
    $payments = payments_by_application();
    return ['applications' => array_map(function (array $row) use ($payments): array {
        return application_to_array($row, $payments[$row['id']] ?? []);
    }, $rows)];
}

/**
 * Change status / interview date, add a note, and optionally email the candidate.
 * The email always goes to the address stored on the application, never to an
 * address sent by the browser.
 */
function update_application(array $admin, array $input): array
{
    $row = find_application(clean_text($input['id'] ?? '', 40));
    $notes = decode_list($row['staff_notes']);
    $communications = decode_list($row['communications']);
    $status = $row['status'];
    $interviewDate = $row['interview_date'];
    $now = to_iso(now_utc());
    $author = $admin['email'];
    $isManager = !in_array($admin['role'], ADMIN_ROLES, true);

    $step = null;
    if (array_key_exists('status', $input)) {
        $newStatus = (string) $input['status'];
        if (!in_array($newStatus, APPLICATION_STATUSES, true)) {
            json_error('Unknown status.');
        }
        // Scheduling again (a new interview time) is a step too; other "same status" saves are not.
        if ($newStatus !== $status || $newStatus === 'interview_scheduled') {
            $step = $newStatus;
        }
    }
    if (array_key_exists('interviewDate', $input)) {
        $interviewDate = clean_text($input['interviewDate'], 40);
    }
    if ($step === null && $interviewDate !== $row['interview_date']) {
        json_error('The interview time can only be changed by scheduling the interview.');
    }

    if ($step !== null) {
        $rule = APPLICATION_STEPS[$step] ?? null;
        if (!$rule || !in_array($admin['role'], $rule['roles'], true)) {
            json_error('Not allowed: a ' . role_label($admin['role']) . ' cannot ' . application_step_verb($step) . '.', 403);
        }
        if (!in_array($status, $rule['from'], true)) {
            json_error('This candidate is "' . (STATUS_LABELS[$status] ?? $status) . '", so you cannot ' . application_step_verb($step) . ' now.'
                . ($step === 'enrolled' ? ' An Owner or Administrator must approve the application first.' : ''), 409);
        }
        if ($step === 'interview_scheduled' && $interviewDate === '') {
            json_error('Please choose the interview date and time.');
        }
        if ($step === 'enrolled') {
            $paid = db()->prepare('SELECT COUNT(*) FROM course_payments WHERE application_id = ?');
            $paid->execute([$row['id']]);
            if ((int) $paid->fetchColumn() === 0) {
                json_error('Record the payment first: a candidate can only be enrolled after a payment is recorded.', 409);
            }
        }
        $notes[] = [
            'author' => $author,
            'date' => $now,
            'text' => $step === 'interview_scheduled'
                ? 'Interview scheduled for ' . friendly_interview($interviewDate) . ' by ' . $author . '.'
                : "Status changed from '" . (STATUS_LABELS[$status] ?? $status) . "' to '" . (STATUS_LABELS[$step] ?? $step) . "' by " . $author . '.',
        ];
        $status = $step;
    }
    $noteText = clean_text($input['note'] ?? '', 5000);
    if ($noteText !== '') {
        $notes[] = ['author' => $author, 'date' => $now, 'text' => $noteText];
    }

    $emailResult = null;
    if (is_array($input['email'] ?? null)) {
        $subject = clean_text(str_replace(["\r", "\n"], ' ', (string) ($input['email']['subject'] ?? '')), 300);
        $body = clean_text($input['email']['body'] ?? '', 20000);
        $type = preg_replace('/[^a-z_]/', '', (string) ($input['email']['type'] ?? 'notification'));
        // Managers send only the interview invitation, together with scheduling it.
        if ($isManager && !($type === 'interview_scheduled' && $step === 'interview_scheduled')) {
            json_error('Not allowed: a Manager can only send the interview invitation.', 403);
        }
        if ($subject === '' || $body === '') {
            json_error('The email needs a subject and a message.');
        }
        $emailResult = send_candidate_email($row['applicant_email'], $row['applicant_name'], $subject, $body);
        $communications[] = [
            'type' => $type,
            'date' => $now,
            'recipient' => $row['applicant_email'],
            'subject' => $subject,
            'body' => $body,
            'status' => $emailResult['sent'] ? 'sent' : 'failed',
        ];
        $notes[] = [
            'author' => $author,
            'date' => $now,
            'text' => $emailResult['sent']
                ? 'Email "' . $subject . '" sent to ' . $row['applicant_email'] . ' from courses@pawpad.in.'
                : 'Email "' . $subject . '" could NOT be sent: ' . $emailResult['error'],
        ];
    }

    if ($step === 'interview_scheduled') {
        $notified = notify_interview_scheduled($row, $interviewDate, $admin);
        $notes[] = ['author' => 'System', 'date' => $now, 'text' => $notified
            ? 'Owner and Administrators were emailed that the interview is scheduled.'
            : 'Owner and Administrators could NOT be emailed about the interview.'];
    }

    db()->prepare(
        'UPDATE applications SET status = ?, interview_date = ?, staff_notes = ?, communications = ?, updated_at = ?,
            enrolled_at = ' . ($step === 'enrolled' ? '?' : 'enrolled_at') . ' WHERE id = ?'
    )->execute(array_merge(
        [$status, $interviewDate, encode_json($notes), encode_json($communications), now_utc()],
        $step === 'enrolled' ? [now_utc()] : [],
        [$row['id']]
    ));

    return [
        'application' => application_to_array(find_application($row['id'])),
        'email' => $emailResult,
    ];
}

function delete_applications(array $input): array
{
    $ids = is_array($input['ids'] ?? null) ? $input['ids'] : [];
    $ids = array_values(array_filter(array_map(function ($id) {
        return clean_text($id, 40);
    }, $ids)));
    if (!$ids) {
        json_error('No applications selected.');
    }
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $paymentCheck = db()->prepare("SELECT COUNT(*) FROM course_payments WHERE application_id IN ($placeholders)");
    $paymentCheck->execute($ids);
    if ((int) $paymentCheck->fetchColumn() > 0) json_error('Applications with recorded payments cannot be deleted. Keep the payment and invoice audit trail.', 409);
    $stmt = db()->prepare("DELETE FROM applications WHERE id IN ($placeholders)");
    $stmt->execute($ids);
    return ['deleted' => $stmt->rowCount()];
}

/**
 * Records a course fee payment (amount, date, mode, reference) on an application.
 */
function record_payment(array $admin, array $input): array
{
    $row = find_application(clean_text($input['applicationId'] ?? '', 40));
    if (!in_array($row['status'], ['approved', 'enrolled'], true)) {
        json_error('A payment can only be recorded after an Owner or Administrator has approved the application.', 409);
    }
    $amount = parse_amount($input['amount'] ?? '');
    if ($amount === null || $amount <= 0) {
        json_error('Please enter the amount received (for example 25000).');
    }
    $paidOn = (string) ($input['paidOn'] ?? '');
    $day = DateTimeImmutable::createFromFormat('!Y-m-d', $paidOn, new DateTimeZone(STUDIO_TIMEZONE));
    $today = new DateTimeImmutable('today', new DateTimeZone(STUDIO_TIMEZONE));
    if (!$day || $day->format('Y-m-d') !== $paidOn || $day > $today || $day < $today->modify('-1 year')) {
        json_error('Please choose the date the payment was received (today or earlier).');
    }
    $mode = (string) ($input['mode'] ?? '');
    if (!isset(PAYMENT_MODES[$mode])) {
        json_error('Please choose how it was paid: UPI, cash, card or bank transfer.');
    }
    $reference = clean_text(str_replace(["\r", "\n"], ' ', (string) ($input['reference'] ?? '')), 120);
    $now = now_utc();

    $pdo = db();
    $pdo->beginTransaction();
    $lock = $pdo->prepare('SELECT status FROM applications WHERE id=? FOR UPDATE');
    $lock->execute([$row['id']]);
    if (!in_array($lock->fetchColumn(), ['approved', 'enrolled'], true)) json_error('This application is no longer ready for a payment.', 409);
    $invoice = $pdo->prepare("SELECT s.status FROM invoice_source_links l JOIN course_payments p ON p.id=l.source_id JOIN invoice_sales s ON s.id=l.sale_id WHERE l.kind='course' AND p.application_id=? LIMIT 1");
    $invoice->execute([$row['id']]);
    if ($invoice->fetchColumn() === 'issued') json_error('This course already has a final invoice. Use a reviewed debit note and record the additional payment in the invoice register.', 409);
    $pdo->prepare('INSERT INTO course_payments (application_id, amount, paid_on, mode, reference, recorded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        ->execute([$row['id'], $amount, $paidOn, $mode, $reference, $admin['email'], $now]);
    $notes = decode_list($row['staff_notes']);
    $notes[] = [
        'author' => $admin['email'],
        'date' => to_iso($now),
        'text' => 'Payment recorded: ' . format_rupees($amount) . ' received on ' . $paidOn . ' by ' . PAYMENT_MODES[$mode]
            . ($reference !== '' ? ' (ref. ' . $reference . ')' : '') . '.',
    ];
    $pdo->prepare('UPDATE applications SET staff_notes = ?, updated_at = ? WHERE id = ?')
        ->execute([encode_json($notes), $now, $row['id']]);
    $pdo->commit();
    return ['application' => application_to_array(find_application($row['id']))];
}

/** Owner/Administrator: removes a payment recorded by mistake. */
function delete_payment(array $admin, array $input): array
{
    $pdo = db();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('SELECT * FROM course_payments WHERE id = ? FOR UPDATE');
    $stmt->execute([(int) ($input['id'] ?? 0)]);
    $payment = $stmt->fetch();
    if (!$payment) {
        json_error('Payment not found.', 404);
    }
    if (invoice_source_issued('course', (int) $payment['id'])) {
        json_error('This payment belongs to an issued invoice and cannot be deleted. Record an audited correction instead.', 409);
    }
    $row = find_application($payment['application_id']);
    $now = now_utc();
    $notes = decode_list($row['staff_notes']);
    $notes[] = [
        'author' => $admin['email'],
        'date' => to_iso($now),
        'text' => 'Payment removed: ' . format_rupees((float) $payment['amount']) . ' of ' . $payment['paid_on'] . ' (' . (PAYMENT_MODES[$payment['mode']] ?? $payment['mode']) . ').',
    ];
    $pdo->prepare('DELETE FROM course_payments WHERE id = ?')->execute([$payment['id']]);
    $pdo->prepare('UPDATE applications SET staff_notes = ?, updated_at = ? WHERE id = ?')
        ->execute([encode_json($notes), $now, $row['id']]);
    $pdo->commit();
    return ['application' => application_to_array(find_application($row['id']))];
}
