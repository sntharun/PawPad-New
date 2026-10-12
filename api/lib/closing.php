<?php
/**
 * Daily closing: what happened with each grooming booking of a day (status,
 * amount collected, payment mode), walk-in / phone bookings, and the daily
 * report emailed from info@ to every Owner and Administrator.
 */

declare(strict_types=1);

if (!defined('PAWPAD_API')) {
    http_response_code(404);
    exit;
}

const CLOSING_STATUSES = ['completed' => 'Completed', 'no_show' => 'No-show', 'cancelled' => 'Cancelled'];

function closing_modes(): array
{
    return PAYMENT_MODES + ['not_paid' => 'Not paid'];
}

/** The closing date: today by default, up to a year back (or 30 days ahead for phone bookings). */
function closing_date(array $input, bool $allowFuture = false): DateTimeImmutable
{
    $date = (string) ($input['date'] ?? '');
    $day = $date === '' ? studio_today() : parse_studio_date($date);
    if (!$day || $day < studio_today()->modify('-1 year')) {
        json_error('Please choose a valid date (up to a year back).');
    }
    $latest = $allowFuture ? studio_today()->modify('+' . booking_days_ahead() . ' days') : studio_today();
    if ($day > $latest) {
        json_error($allowFuture ? 'Please choose a date up to ' . booking_days_ahead() . ' days ahead.' : 'The closing can only be done for today or an earlier day.');
    }
    return $day;
}

/**
 * Every booking of the day in time order, with its closing details. A booking
 * cancelled in the admin panel starts as "Cancelled"; the amount starts as
 * the service price (the admin panel may fill in the price list's price).
 */
function closing_rows(string $date): array
{
    $stmt = db()->prepare(
        "SELECT b.*, c.status AS c_status, c.amount AS c_amount, c.mode AS c_mode, c.reference AS c_reference,
                c.note AS c_note, c.updated_by AS c_updated_by, c.updated_at AS c_updated_at, s.id AS invoice_sale_id, s.issued_no AS invoice_no
         FROM bookings b LEFT JOIN booking_closing c ON c.booking_id = b.id
         LEFT JOIN invoice_source_links l ON l.kind = 'grooming' AND l.source_id = b.id
         LEFT JOIN invoice_sales s ON s.id = l.sale_id
         WHERE b.slot_date = ? ORDER BY b.slot_time, b.id"
    );
    $stmt->execute([$date]);
    $rows = $stmt->fetchAll();
    $groupInvoices = [];
    foreach ($rows as $row) {
        if ($row['invoice_no']) $groupInvoices[$row['ref']] = ['number' => $row['invoice_no'], 'saleId' => $row['invoice_sale_id']];
    }
    foreach ($rows as &$row) {
        if (!$row['invoice_no'] && isset($groupInvoices[$row['ref']])) {
            $row['invoice_no'] = $groupInvoices[$row['ref']]['number'];
            $row['invoice_sale_id'] = $groupInvoices[$row['ref']]['saleId'];
        }
    }
    unset($row);
    $noteNumbers = invoice_adjustment_numbers(array_column($rows, 'invoice_sale_id'));
    return array_map(function (array $row) use ($noteNumbers): array {
        $b = booking_to_array($row);
        $saved = $row['c_updated_at'] !== null;
        $b['closing'] = [
            'saved' => $saved,
            'status' => $saved ? $row['c_status'] : ($row['status'] === 'cancelled' ? 'cancelled' : ''),
            'amount' => $saved && $row['c_amount'] !== null ? (float) $row['c_amount'] : ($saved ? null : $b['price']),
            'mode' => $saved ? $row['c_mode'] : '',
            'reference' => $saved ? $row['c_reference'] : '',
            'note' => $saved ? $row['c_note'] : '',
            'updatedBy' => $saved ? $row['c_updated_by'] : '',
            'updatedAt' => $saved ? to_iso($row['c_updated_at']) : null,
            'invoiceNo' => $row['invoice_no'] ?? '',
            'adjustmentNos' => $noteNumbers[(int) ($row['invoice_sale_id'] ?? 0)] ?? [],
        ];
        return $b;
    }, $rows);
}

function course_payments_on(string $date): array
{
    $stmt = db()->prepare(
        "SELECT p.*, a.applicant_name, a.course_name, s.id AS invoice_sale_id, s.issued_no AS invoice_no FROM course_payments p
         LEFT JOIN applications a ON a.id = p.application_id
         LEFT JOIN invoice_source_links l ON l.kind='course' AND l.source_id=p.id
         LEFT JOIN invoice_sales s ON s.id=l.sale_id WHERE p.paid_on = ? ORDER BY p.id"
    );
    $stmt->execute([$date]);
    $rows = $stmt->fetchAll();
    $noteNumbers = invoice_adjustment_numbers(array_column($rows, 'invoice_sale_id'));
    return array_map(function (array $row) use ($noteNumbers): array {
        $row['adjustment_nos'] = $noteNumbers[(int) ($row['invoice_sale_id'] ?? 0)] ?? [];
        return payment_to_array($row) + [
            'applicationId' => $row['application_id'],
            'candidate' => (string) ($row['applicant_name'] ?? ''),
            'course' => (string) ($row['course_name'] ?? ''),
        ];
    }, $rows);
}

function closing_totals(array $rows, array $coursePayments): array
{
    $counts = ['completed' => 0, 'no_show' => 0, 'cancelled' => 0, 'none' => 0];
    $perMode = array_fill_keys(array_keys(PAYMENT_MODES), 0.0);
    $collected = 0.0;
    $notPaid = [];
    $missing = [];
    foreach ($rows as $b) {
        $c = $b['closing'];
        $counts[$c['status'] !== '' ? $c['status'] : 'none']++;
        if ($c['status'] === '') {
            $missing[] = $b;
        }
        if (isset(PAYMENT_MODES[$c['mode']]) && $c['amount'] !== null) {
            $perMode[$c['mode']] += $c['amount'];
            $collected += $c['amount'];
        }
        if ($c['status'] === 'completed' && !isset(PAYMENT_MODES[$c['mode']])) {
            $notPaid[] = $b;
        }
    }
    $courseTotal = array_sum(array_column($coursePayments, 'amount'));
    return [
        'counts' => $counts,
        'collected' => $collected,
        'perMode' => $perMode,
        'notPaid' => $notPaid,
        'missing' => $missing,
        'courseTotal' => (float) $courseTotal,
        'grandTotal' => $collected + $courseTotal,
    ];
}

/**
 * Admissions for the report: applications waiting for an Owner/Administrator's
 * decision, interviews on the next day, and candidates enrolled on this day.
 */
function course_report_sections(string $date): array
{
    $next = parse_studio_date($date)->modify('+1 day')->format('Y-m-d');
    $awaiting = db()->query("SELECT * FROM applications WHERE status = 'interview_scheduled' ORDER BY interview_date, id")->fetchAll();
    $stmt = db()->prepare("SELECT * FROM applications WHERE status = 'interview_scheduled' AND interview_date LIKE ? ORDER BY interview_date, id");
    $stmt->execute([$next . '%']);
    $tomorrow = $stmt->fetchAll();
    // enrolled_at is stored in UTC; the day is the studio's (IST) day.
    $from = slot_start($date, '00:00')->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    $to = slot_start($next, '00:00')->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    $stmt = db()->prepare("SELECT * FROM applications WHERE status = 'enrolled' AND enrolled_at >= ? AND enrolled_at < ? ORDER BY enrolled_at");
    $stmt->execute([$from, $to]);
    $payments = payments_by_application();
    $enrolled = array_map(function (array $row) use ($payments): array {
        $list = $payments[$row['id']] ?? [];
        return $row + ['paid_total' => array_sum(array_column($list, 'amount')), 'paid_modes' => implode(', ', array_unique(array_column($list, 'modeLabel')))];
    }, $stmt->fetchAll());
    return ['next' => $next, 'awaiting' => $awaiting, 'tomorrow' => $tomorrow, 'enrolled' => $enrolled];
}

function daily_report_versions(string $date): array
{
    $stmt = db()->prepare('SELECT id, report_date, version, sent_at, sent_by, recipients, subject FROM daily_reports WHERE report_date = ? ORDER BY version');
    $stmt->execute([$date]);
    return array_map('daily_report_meta', $stmt->fetchAll());
}

function daily_report_meta(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'date' => $row['report_date'],
        'version' => (int) $row['version'],
        'corrected' => (int) $row['version'] > 1,
        'sentAt' => to_iso($row['sent_at']),
        'sentBy' => $row['sent_by'],
        'recipients' => json_decode((string) $row['recipients'], true) ?: [],
        'subject' => $row['subject'],
    ];
}

function closing_day(array $input): array
{
    $day = closing_date($input, true);
    $date = $day->format('Y-m-d');
    $rows = closing_rows($date);
    $payments = course_payments_on($date);
    $totals = closing_totals($rows, $payments);
    return [
        'date' => $date,
        'label' => $day->format('l, j F Y'),
        'isFuture' => $day > studio_today(),
        'bookings' => $rows,
        'coursePayments' => $payments,
        'totals' => [
            'counts' => $totals['counts'],
            'collected' => $totals['collected'],
            'perMode' => $totals['perMode'],
            'courseTotal' => $totals['courseTotal'],
            'grandTotal' => $totals['grandTotal'],
            'notPaidCount' => count($totals['notPaid']),
            'missingCount' => count($totals['missing']),
        ],
        'reports' => daily_report_versions($date),
        'statuses' => CLOSING_STATUSES,
        'modes' => closing_modes(),
    ];
}

function save_closing(array $admin, array $input): array
{
    $booking = find_booking((int) ($input['bookingId'] ?? 0));
    if (parse_studio_date($booking['slot_date']) > studio_today()) {
        json_error('This booking is in the future. Its closing can be filled in on the day.');
    }
    $status = (string) ($input['status'] ?? '');
    if ($status !== '' && !isset(CLOSING_STATUSES[$status])) {
        json_error('Unknown status.');
    }
    $mode = (string) ($input['mode'] ?? '');
    if ($mode !== '' && !isset(closing_modes()[$mode])) {
        json_error('Unknown payment mode.');
    }
    $amountInput = $input['amount'] ?? '';
    $amount = null;
    if ($amountInput !== '' && $amountInput !== null) {
        $amount = parse_amount($amountInput);
        if ($amount === null) {
            json_error('The amount must be a number, for example 1500.');
        }
    }
    $reference = clean_text(str_replace(["\r", "\n"], ' ', (string) ($input['reference'] ?? '')), 120);
    $note = clean_text(str_replace(["\r", "\n"], ' ', (string) ($input['note'] ?? '')), 500);
    $pdo = db();
    $pdo->beginTransaction();
    $bookingLock = $pdo->prepare('SELECT id FROM bookings WHERE id=? FOR UPDATE');
    $bookingLock->execute([$booking['id']]); $bookingLock->fetch();
    $lock = $pdo->prepare('SELECT booking_id FROM booking_closing WHERE booking_id=? FOR UPDATE');
    $lock->execute([$booking['id']]);
    if (invoice_source_issued('grooming', (int) $booking['id'])) {
        json_error('This closing belongs to an issued invoice and cannot be changed. Record an audited correction instead.', 409);
    }
    $pdo->prepare(
        'INSERT INTO booking_closing (booking_id, status, amount, mode, reference, note, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), amount = VALUES(amount), mode = VALUES(mode), reference = VALUES(reference),
            note = VALUES(note), updated_by = VALUES(updated_by), updated_at = VALUES(updated_at)'
    )->execute([$booking['id'], $status, $amount, $mode, $reference, $note, $admin['email'], now_utc()]);
    $pdo->commit();

    foreach (closing_rows($booking['slot_date']) as $row) {
        if ($row['id'] === (int) $booking['id']) {
            return ['booking' => $row];
        }
    }
    return [];
}

/**
 * A walk-in or phone booking. If its time is free (not booked, blocked,
 * closed or busy in the calendar) the slot is taken and a calendar event added.
 */
function add_walkin(array $admin, array $input): array
{
    $day = closing_date($input, true);
    $date = $day->format('Y-m-d');
    $time = (string) ($input['time'] ?? '');
    if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $time)) {
        json_error('Please choose the time.');
    }
    $name = clean_text($input['customerName'] ?? '', 255);
    $phone = clean_text($input['phone'] ?? '', 60);
    if ($name === '') {
        json_error('Please enter the customer\'s name.');
    }
    $serviceTitle = clean_text($input['serviceTitle'] ?? '', 255) ?: 'Grooming';
    $serviceId = substr(strtolower(preg_replace('/[^A-Za-z0-9-]/', '', (string) ($input['serviceId'] ?? ''))), 0, 60) ?: 'grooming-unspecified';
    $petType = clean_text($input['petType'] ?? '', 10);
    $pet = clean_pet(['name' => $input['petName'] ?? '', 'type' => $petType, 'breed' => $input['breed'] ?? '']);
    $amount = null;
    if (($input['amount'] ?? '') !== '' && ($input['amount'] ?? null) !== null) {
        $amount = parse_amount($input['amount']);
        if ($amount === null) {
            json_error('The amount must be a number, for example 1500.');
        }
    }
    $mode = (string) ($input['mode'] ?? '');
    if ($mode !== '' && !isset(closing_modes()[$mode])) {
        json_error('Unknown payment mode.');
    }
    $status = (string) ($input['status'] ?? '');
    if ($status !== '' && !isset(CLOSING_STATUSES[$status])) {
        json_error('Unknown status.');
    }
    if ($day > studio_today()) {
        $status = ''; // a phone booking for a later day has not happened yet
    }
    $notes = clean_text($input['notes'] ?? '', 2000);

    // Free in the calendar? (Read fresh; if it can't be read the slot is not taken.)
    $calendar = calendar_busy($day, $day->modify('+1 day'), true);
    $calendarFree = $calendar['ok'] && !slot_is_busy_in_calendar($calendar['busy'], $date, $time);

    $now = now_utc();
    $pdo = db();
    for ($attempt = 1; ; $attempt++) {
        $pdo->beginTransaction();
        try {
            $ref = 'PAW-' . str_pad((string) next_sequence($pdo, '#GROOMING'), 4, '0', STR_PAD_LEFT);
            $log = json_encode([['date' => to_iso($now), 'by' => $admin['email'], 'text' => 'Walk-in / phone booking added from the daily closing.']], JSON_UNESCAPED_UNICODE);
            $pdo->prepare(
                'INSERT INTO bookings (ref, slot_date, slot_time, status, service_id, service_title, pet, customer_name,
                    customer_email, customer_phone, customer_area, contact_method, notes, created_at, price, source, admin_log, email_status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([$ref, $date, $time, 'booked', $serviceId, $serviceTitle, json_encode($pet, JSON_UNESCAPED_UNICODE),
                $name, '', $phone, '', 'walk-in', $notes, $now, $amount, 'walkin', $log, 'not_needed']);
            $id = (int) $pdo->lastInsertId();

            $taken = false;
            if ($calendarFree) {
                $blocked = $pdo->prepare("SELECT COUNT(*) FROM slot_blocks WHERE slot_date = ? AND (slot_time = '' OR slot_time = ?)");
                $blocked->execute([$date, $time]);
                if ((int) $blocked->fetchColumn() === 0 && !slot_is_closed($pdo, $date, $time)) {
                    $lock = $pdo->prepare('INSERT IGNORE INTO slot_locks (slot_date, slot_time, booking_id) VALUES (?, ?, ?)');
                    $lock->execute([$date, $time, $id]);
                    $taken = $lock->rowCount() === 1;
                }
            }
            if ($status !== '' || $amount !== null || $mode !== '') {
                $pdo->prepare('INSERT INTO booking_closing (booking_id, status, amount, mode, reference, note, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                    ->execute([$id, $status, $amount, $mode, clean_text($input['reference'] ?? '', 120), '', $admin['email'], $now]);
            }
            $pdo->commit();
            break;
        } catch (Throwable $e) {
            $pdo->rollBack();
            if ($attempt < 5 && is_retryable_lock_error($e)) {
                usleep(random_int(20000, 120000));
                continue;
            }
            throw $e;
        }
    }

    $href = '';
    if ($taken) {
        $href = add_booking_event(['id' => $id, 'ref' => $ref, 'date' => $date, 'time' => $time, 'pet' => $pet, 'serviceTitle' => $serviceTitle],
            $name, $phone, '(walk-in / phone)', $notes);
        forget_calendar_cache();
    }
    $pdo->prepare('UPDATE bookings SET calendar_href = ?, calendar_status = ? WHERE id = ?')
        ->execute([$href, $href !== '' ? 'synced' : ($taken ? 'failed' : 'not_blocked'), $id]);

    return closing_day(['date' => $date]) + [
        'added' => ['id' => $id, 'ref' => $ref],
        'slotBlocked' => $taken,
        'calendarSynced' => $href !== '',
        'slotMessage' => $taken
            ? 'The ' . $time . ' slot is now taken' . ($href !== '' ? ' and added to the info@ calendar.' : ', but the calendar event could not be added.')
            : ($calendar['ok'] ? 'That time was not free, so the booking was only recorded (no slot blocked, no calendar event).'
                : 'The calendar could not be read, so the booking was only recorded (no slot blocked, no calendar event).'),
    ];
}

// ---------------------------------------------------------------------------
// The daily report
// ---------------------------------------------------------------------------

function report_recipients(): array
{
    $stmt = db()->query("SELECT email FROM admin_users WHERE role IN ('owner', 'admin') ORDER BY FIELD(role, 'owner', 'admin'), email");
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

function html_text(string $text): string
{
    return htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function booking_pet_label(array $b): string
{
    $pet = $b['pet'];
    return trim(($pet['name'] ?? '') . (($pet['type'] ?? '') !== '' ? ' (' . $pet['type'] . ')' : '')) ?: '—';
}

/**
 * The report for one day as an email: subject, HTML and plain text.
 */
function build_daily_report(string $date, array $sender, int $version): array
{
    $day = parse_studio_date($date);
    $rows = closing_rows($date);
    $payments = course_payments_on($date);
    $t = closing_totals($rows, $payments);
    $modes = closing_modes();
    $corrected = $version > 1;
    $dayLabel = $day->format('l, j F Y');
    $sentAt = (new DateTimeImmutable('now', studio_tz()))->format('j M Y, g:i A');
    $senderLabel = $sender['email'] . ' (' . role_label($sender['role']) . ')';
    $subject = ($corrected ? 'Corrected report: ' : '') . 'Pawpad daily report · ' . $day->format('D j M Y');

    $cell = 'padding:6px 8px;border:1px solid #ddd;text-align:left;vertical-align:top;';
    $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;max-width:900px">';
    if ($corrected) {
        $html .= '<p style="background:#fff3cd;border:1px solid #e0b100;padding:8px 12px;font-weight:bold">Corrected report (version ' . $version
            . ') — this replaces the report sent earlier for this day.</p>';
    }
    $html .= '<h2 style="margin:0 0 4px">Pawpad daily closing — ' . html_text($dayLabel) . '</h2>'
        . '<p style="margin:0 0 16px;color:#555">Sent by ' . html_text($senderLabel) . ' on ' . html_text($sentAt) . ' (IST)</p>';

    $html .= '<h3 style="margin:16px 0 6px">Grooming</h3>';
    if (!$rows) {
        $html .= '<p>No grooming bookings on this day.</p>';
    } else {
        $html .= '<table style="border-collapse:collapse;width:100%"><tr style="background:#f3f0ea">';
        foreach (['Time', 'Ref', 'Customer', 'Pet', 'Service', 'Status', 'Amount', 'Payment mode', 'Note'] as $th) {
            $html .= '<th style="' . $cell . '">' . $th . '</th>';
        }
        $html .= '</tr>';
        foreach ($rows as $b) {
            $c = $b['closing'];
            $status = $c['status'] !== '' ? CLOSING_STATUSES[$c['status']] : 'NOT SET';
            $mode = $c['mode'] !== '' ? $modes[$c['mode']] : '—';
            $note = trim(($c['reference'] !== '' ? 'Ref: ' . $c['reference'] . ' ' : '') . $c['note']);
            $html .= '<tr>'
                . '<td style="' . $cell . '">' . html_text($b['time']) . '</td>'
                . '<td style="' . $cell . '">' . html_text($b['ref']) . ($b['source'] === 'walkin' ? '<br><small>walk-in / phone</small>' : '') . '</td>'
                . '<td style="' . $cell . '">' . html_text($b['customer']['name']) . ($b['customer']['phone'] !== '' ? '<br><small>' . html_text($b['customer']['phone']) . '</small>' : '') . '</td>'
                . '<td style="' . $cell . '">' . html_text(booking_pet_label($b)) . '</td>'
                . '<td style="' . $cell . '">' . html_text($b['serviceTitle']) . '</td>'
                . '<td style="' . $cell . ($c['status'] === '' ? 'color:#b00;font-weight:bold;' : '') . '">' . html_text($status) . '</td>'
                . '<td style="' . $cell . 'text-align:right">' . ($c['amount'] !== null ? html_text(format_rupees($c['amount'])) : '—') . '</td>'
                . '<td style="' . $cell . '">' . html_text($mode) . '</td>'
                . '<td style="' . $cell . '">' . html_text($note) . '</td>'
                . '</tr>';
        }
        $html .= '</table>';
    }

    $html .= '<h3 style="margin:16px 0 6px">Totals</h3><table style="border-collapse:collapse">'
        . '<tr><td style="' . $cell . '">Completed</td><td style="' . $cell . '">' . $t['counts']['completed'] . '</td></tr>'
        . '<tr><td style="' . $cell . '">No-shows</td><td style="' . $cell . '">' . $t['counts']['no_show'] . '</td></tr>'
        . '<tr><td style="' . $cell . '">Cancelled</td><td style="' . $cell . '">' . $t['counts']['cancelled'] . '</td></tr>'
        . ($t['counts']['none'] > 0 ? '<tr><td style="' . $cell . 'color:#b00">No status set</td><td style="' . $cell . 'color:#b00">' . $t['counts']['none'] . '</td></tr>' : '');
    foreach (PAYMENT_MODES as $key => $label) {
        $html .= '<tr><td style="' . $cell . '">Grooming by ' . html_text($label) . '</td><td style="' . $cell . 'text-align:right">' . html_text(format_rupees($t['perMode'][$key])) . '</td></tr>';
    }
    $html .= '<tr><td style="' . $cell . 'font-weight:bold">Grooming total collected</td><td style="' . $cell . 'text-align:right;font-weight:bold">' . html_text(format_rupees($t['collected'])) . '</td></tr>'
        . '<tr><td style="' . $cell . '">Course payments</td><td style="' . $cell . 'text-align:right">' . html_text(format_rupees($t['courseTotal'])) . '</td></tr>'
        . '<tr><td style="' . $cell . 'font-weight:bold">Total received today</td><td style="' . $cell . 'text-align:right;font-weight:bold">' . html_text(format_rupees($t['grandTotal'])) . '</td></tr>'
        . '</table>';

    $html .= '<h3 style="margin:16px 0 6px">Not paid</h3>';
    if (!$t['notPaid']) {
        $html .= '<p>None — every completed grooming was paid.</p>';
    } else {
        $html .= '<ul>';
        foreach ($t['notPaid'] as $b) {
            $html .= '<li>' . html_text($b['time'] . ' · ' . $b['customer']['name'] . ' · ' . booking_pet_label($b) . ' · ' . $b['serviceTitle']
                . ($b['closing']['amount'] !== null ? ' · ' . format_rupees($b['closing']['amount']) : '')
                . ($b['closing']['mode'] === '' ? ' (payment mode not set)' : '')) . '</li>';
        }
        $html .= '</ul>';
    }

    $html .= '<h3 style="margin:16px 0 6px">Course payments</h3>';
    if (!$payments) {
        $html .= '<p>No course payments recorded on this day.</p>';
    } else {
        $html .= '<table style="border-collapse:collapse;width:100%"><tr style="background:#f3f0ea">';
        foreach (['Application', 'Candidate', 'Course', 'Amount', 'Mode', 'Reference', 'Recorded by'] as $th) {
            $html .= '<th style="' . $cell . '">' . $th . '</th>';
        }
        $html .= '</tr>';
        foreach ($payments as $p) {
            $html .= '<tr><td style="' . $cell . '">' . html_text($p['applicationId']) . '</td><td style="' . $cell . '">' . html_text($p['candidate'] ?: '(application deleted)')
                . '</td><td style="' . $cell . '">' . html_text($p['course']) . '</td><td style="' . $cell . 'text-align:right">' . html_text(format_rupees($p['amount']))
                . '</td><td style="' . $cell . '">' . html_text($p['modeLabel']) . '</td><td style="' . $cell . '">' . html_text($p['reference'])
                . '</td><td style="' . $cell . '">' . html_text($p['recordedBy']) . '</td></tr>';
        }
        $html .= '</table>';
    }
    // Admissions
    $adm = course_report_sections($date);
    $nextLabel = parse_studio_date($adm['next'])->format('l, j F');
    $sections = [
        ['Applications waiting for Admin approval', $adm['awaiting'], 'None.', function (array $a): string {
            return $a['applicant_name'] . ' · ' . $a['course_name'] . ' · interview ' . friendly_interview($a['interview_date']) . ' (' . $a['id'] . ')';
        }],
        ['Interviews on ' . $nextLabel, $adm['tomorrow'], 'No interviews.', function (array $a): string {
            return friendly_interview($a['interview_date']) . ' · ' . $a['applicant_name'] . ' · ' . $a['course_name'];
        }],
        ['Enrolled today', $adm['enrolled'], 'Nobody enrolled today.', function (array $a): string {
            return $a['applicant_name'] . ' · ' . $a['course_name'] . ' · paid ' . format_rupees((float) $a['paid_total']) . ($a['paid_modes'] !== '' ? ' (' . $a['paid_modes'] . ')' : '');
        }],
    ];
    foreach ($sections as [$title, $items, $empty, $line]) {
        $html .= '<h3 style="margin:16px 0 6px">' . html_text($title) . '</h3>';
        if (!$items) {
            $html .= '<p>' . html_text($empty) . '</p>';
        } else {
            $html .= '<ul>';
            foreach ($items as $item) {
                $html .= '<li>' . html_text($line($item)) . '</li>';
            }
            $html .= '</ul>';
        }
    }
    $html .= '<p style="color:#777;font-size:12px;margin-top:20px">Sent from the Pawpad admin panel. Owners and Administrators can see every report under “Daily Reports”.</p></div>';

    // Plain-text version for mail apps that don't show HTML.
    $lines = [];
    if ($corrected) {
        $lines[] = 'CORRECTED REPORT (version ' . $version . ') - this replaces the report sent earlier for this day.';
        $lines[] = '';
    }
    $lines[] = 'Pawpad daily closing - ' . $dayLabel;
    $lines[] = 'Sent by ' . $senderLabel . ' on ' . $sentAt . ' (IST)';
    $lines[] = '';
    $lines[] = 'GROOMING';
    if (!$rows) {
        $lines[] = 'No grooming bookings on this day.';
    }
    foreach ($rows as $b) {
        $c = $b['closing'];
        $lines[] = $b['time'] . ' | ' . $b['ref'] . ' | ' . $b['customer']['name'] . ' | ' . booking_pet_label($b) . ' | ' . $b['serviceTitle']
            . ' | ' . ($c['status'] !== '' ? CLOSING_STATUSES[$c['status']] : 'NOT SET')
            . ' | ' . ($c['amount'] !== null ? format_rupees($c['amount']) : '-')
            . ' | ' . ($c['mode'] !== '' ? $modes[$c['mode']] : '-')
            . ($c['reference'] !== '' ? ' | Ref: ' . $c['reference'] : '') . ($c['note'] !== '' ? ' | ' . $c['note'] : '');
    }
    $lines[] = '';
    $lines[] = 'TOTALS';
    $lines[] = 'Completed: ' . $t['counts']['completed'] . ' · No-shows: ' . $t['counts']['no_show'] . ' · Cancelled: ' . $t['counts']['cancelled']
        . ($t['counts']['none'] > 0 ? ' · No status set: ' . $t['counts']['none'] : '');
    foreach (PAYMENT_MODES as $key => $label) {
        $lines[] = 'Grooming by ' . $label . ': ' . format_rupees($t['perMode'][$key]);
    }
    $lines[] = 'Grooming total collected: ' . format_rupees($t['collected']);
    $lines[] = 'Course payments: ' . format_rupees($t['courseTotal']);
    $lines[] = 'Total received today: ' . format_rupees($t['grandTotal']);
    $lines[] = '';
    $lines[] = 'NOT PAID';
    if (!$t['notPaid']) {
        $lines[] = 'None.';
    }
    foreach ($t['notPaid'] as $b) {
        $lines[] = '- ' . $b['time'] . ' · ' . $b['customer']['name'] . ' · ' . booking_pet_label($b) . ' · ' . $b['serviceTitle'];
    }
    $lines[] = '';
    $lines[] = 'COURSE PAYMENTS';
    if (!$payments) {
        $lines[] = 'None.';
    }
    foreach ($payments as $p) {
        $lines[] = '- ' . $p['applicationId'] . ' · ' . ($p['candidate'] ?: '(application deleted)') . ' · ' . format_rupees($p['amount']) . ' · ' . $p['modeLabel']
            . ($p['reference'] !== '' ? ' · Ref: ' . $p['reference'] : '');
    }
    foreach ($sections as [$title, $items, $empty, $line]) {
        $lines[] = '';
        $lines[] = strtoupper($title);
        if (!$items) {
            $lines[] = $empty;
        }
        foreach ($items as $item) {
            $lines[] = '- ' . $line($item);
        }
    }

    return [
        'subject' => $subject,
        'html' => $html,
        'text' => implode("\n", $lines) . "\n",
        'missing' => array_map(function (array $b): array {
            return ['id' => $b['id'], 'time' => $b['time'], 'ref' => $b['ref'], 'customer' => $b['customer']['name'], 'pet' => booking_pet_label($b), 'service' => $b['serviceTitle']];
        }, $t['missing']),
    ];
}

function next_report_version(string $date): int
{
    $stmt = db()->prepare('SELECT COALESCE(MAX(version), 0) FROM daily_reports WHERE report_date = ?');
    $stmt->execute([$date]);
    return (int) $stmt->fetchColumn() + 1;
}

function preview_report(array $admin, array $input): array
{
    $date = closing_date($input)->format('Y-m-d');
    $version = next_report_version($date);
    return build_daily_report($date, $admin, $version) + [
        'date' => $date,
        'version' => $version,
        'corrected' => $version > 1,
        'recipients' => report_recipients(),
    ];
}

/**
 * Emails the report from info@ to every Owner and Administrator and saves it.
 * Stops with the list of bookings that have no status, unless "force" is set.
 */
function send_report(array $admin, array $input): array
{
    $date = closing_date($input)->format('Y-m-d');
    $version = next_report_version($date);
    $report = build_daily_report($date, $admin, $version);
    if ($report['missing'] && empty($input['force'])) {
        send_json([
            'ok' => false,
            'error' => count($report['missing']) . ' booking' . (count($report['missing']) > 1 ? 's have' : ' has') . ' no status yet.',
            'missing' => $report['missing'],
        ], 409);
    }
    $recipients = report_recipients();
    if (!$recipients) {
        json_error('There is no Owner or Administrator email to send the report to.');
    }
    $mail = send_html_mail('info', $recipients, $report['subject'], $report['html'], $report['text']);
    if (!$mail['sent']) {
        json_error('The report could not be emailed: ' . $mail['error'], 502);
    }
    db()->prepare('INSERT INTO daily_reports (report_date, version, sent_at, sent_by, recipients, subject, html, text_body) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([$date, $version, now_utc(), $admin['email'], json_encode($recipients), $report['subject'], $report['html'], $report['text']]);
    return [
        'report' => daily_report_meta(db()->query('SELECT * FROM daily_reports WHERE id = ' . (int) db()->lastInsertId())->fetch()),
        'reports' => daily_report_versions($date),
    ];
}

/** Owner / Administrator: every report that was sent, newest first. */
function list_daily_reports(): array
{
    $rows = db()->query('SELECT id, report_date, version, sent_at, sent_by, recipients, subject FROM daily_reports ORDER BY report_date DESC, version DESC LIMIT 500')->fetchAll();
    return ['reports' => array_map('daily_report_meta', $rows)];
}

function get_daily_report(array $input): array
{
    $stmt = db()->prepare('SELECT * FROM daily_reports WHERE id = ?');
    $stmt->execute([(int) ($input['id'] ?? 0)]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Report not found.', 404);
    }
    return ['report' => daily_report_meta($row) + ['html' => $row['html'], 'text' => $row['text_body']]];
}
