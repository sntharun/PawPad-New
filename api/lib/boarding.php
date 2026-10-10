<?php
/**
 * Boarding requests: the website checkout saves every boarding order here, the
 * customer and info@ get an email, and the team confirms it in the admin panel.
 */

declare(strict_types=1);

if (!defined('PAWPAD_API')) {
    http_response_code(404);
    exit;
}

const BOARDING_STATUSES = ['new' => 'New', 'confirmed' => 'Confirmed', 'declined' => 'Declined', 'completed' => 'Completed', 'cancelled' => 'Cancelled'];
// Requests can be made from today up to this many days ahead; a stay is at most this many nights.
const BOARDING_DAYS_AHEAD = 92;
const BOARDING_MAX_NIGHTS = 60;

/** How many dogs can stay overnight at once (config: boarding_dogs_per_night, default 3). */
function boarding_dogs_per_night(): int
{
    return max(1, min(50, (int) (pawpad_config()['boarding_dogs_per_night'] ?? 3)));
}

/** Every night from check-in up to (not including) check-out, as 'Y-m-d'. */
function boarding_night_dates(string $from, string $to): array
{
    $nights = [];
    $d = parse_studio_date($from);
    $end = parse_studio_date($to);
    while ($d && $end && $d < $end && count($nights) < 400) {
        $nights[] = $d->format('Y-m-d');
        $d = $d->modify('+1 day');
    }
    return $nights;
}

/** Dogs in confirmed stays on each night between $from and $to ('Y-m-d' => dogs). */
function boarding_nights_taken(string $from, string $to, int $exceptId = 0): array
{
    $stmt = db()->prepare("SELECT check_in, check_out, dogs FROM boarding_requests
        WHERE status = 'confirmed' AND dogs > 0 AND check_in IS NOT NULL AND check_out IS NOT NULL
          AND check_in < ? AND check_out > ? AND id <> ?");
    $stmt->execute([$to, $from, $exceptId]);
    $taken = [];
    foreach ($stmt->fetchAll() as $row) {
        foreach (boarding_night_dates(max($row['check_in'], $from), min($row['check_out'], $to)) as $night) {
            $taken[$night] = ($taken[$night] ?? 0) + (int) $row['dogs'];
        }
    }
    return $taken;
}

/** Nights of a stay that have no room for $dogs more dogs. */
function boarding_full_nights(string $checkIn, string $checkOut, int $dogs, int $exceptId = 0): array
{
    $taken = boarding_nights_taken($checkIn, $checkOut, $exceptId);
    $full = [];
    foreach (boarding_night_dates($checkIn, $checkOut) as $night) {
        if (($taken[$night] ?? 0) + $dogs > boarding_dogs_per_night()) {
            $full[] = $night;
        }
    }
    return $full;
}

/** "Mon 19 Oct, Tue 20 Oct and 3 more". */
function boarding_nights_text(array $nights): string
{
    $labels = array_map(function (string $n): string {
        return parse_studio_date($n)->format('D j M');
    }, array_slice($nights, 0, 4));
    return implode(', ', $labels) . (count($nights) > 4 ? ' and ' . (count($nights) - 4) . ' more' : '');
}

/** Public: nights in the next months that are full or nearly full (confirmed stays only). */
function boarding_availability(): array
{
    $from = studio_today()->format('Y-m-d');
    $to = studio_today()->modify('+' . (BOARDING_DAYS_AHEAD + BOARDING_MAX_NIGHTS) . ' days')->format('Y-m-d');
    $cap = boarding_dogs_per_night();
    $nights = [];
    foreach (boarding_nights_taken($from, $to) as $night => $dogs) {
        $nights[] = ['date' => $night, 'left' => max(0, $cap - $dogs)];
    }
    usort($nights, function (array $a, array $b): int {
        return strcmp($a['date'], $b['date']);
    });
    return ['dogsPerNight' => $cap, 'nights' => $nights];
}

function boarding_to_array(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'ref' => $row['ref'],
        'status' => $row['status'],
        'statusLabel' => BOARDING_STATUSES[$row['status']] ?? $row['status'],
        'customer' => [
            'name' => $row['customer_name'],
            'email' => $row['customer_email'],
            'phone' => $row['customer_phone'],
            'contactMethod' => $row['contact_method'],
        ],
        'stayDate' => $row['stay_date'],
        'stayTime' => $row['stay_time'],
        'stayEnd' => $row['stay_end'] ?? '',
        'nights' => (int) ($row['nights'] ?? 0),
        'checkIn' => $row['check_in'] ?? null,
        'checkOut' => $row['check_out'] ?? null,
        'dogs' => (int) ($row['dogs'] ?? 0),
        'pets' => json_decode((string) $row['pets'], true) ?: [],
        'items' => json_decode((string) $row['items'], true) ?: [],
        'total' => $row['total'],
        'trialFee' => $row['trial_fee'],
        'notes' => $row['notes'],
        'adminLog' => json_decode((string) ($row['admin_log'] ?? ''), true) ?: [],
        'emailStatus' => $row['email_status'],
        'createdAt' => to_iso($row['created_at']),
    ];
}

/** Public: the checkout sends a boarding order. */
function create_boarding_request(array $input): array
{
    if (!empty($input['botcheck'])) {
        json_error('Request rejected.');
    }
    rate_limit('boarding', 20, 3600);
    $customer = is_array($input['customer'] ?? null) ? $input['customer'] : [];
    $name = clean_text($customer['name'] ?? '', 255);
    $email = clean_text($customer['email'] ?? '', 255);
    $phone = clean_text($customer['phone'] ?? '', 60);
    if ($name === '' || $phone === '') {
        json_error('Please fill in your name and phone number.');
    }
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_error('Please enter a valid email address.');
    }
    $pets = [];
    foreach (array_slice(is_array($input['pets'] ?? null) ? $input['pets'] : [], 0, 8) as $pet) {
        if (!is_array($pet)) {
            continue;
        }
        $trial = $pet['hasCompletedTrialDay'] ?? null;
        $pets[] = [
            'name' => clean_text($pet['name'] ?? '', 100),
            'breed' => clean_text($pet['breed'] ?? '', 100),
            'age' => clean_text($pet['age'] ?? '', 40),
            'size' => clean_text($pet['size'] ?? '', 60),
            'temperament' => clean_text($pet['temperament'] ?? '', 60),
            'healthNotes' => clean_text($pet['healthNotes'] ?? '', 1000),
            'service' => clean_text($pet['serviceTitle'] ?? '', 255),
            'trialDone' => $trial === true ? 'yes' : ($trial === false ? 'no' : ''),
        ];
    }
    $items = [];
    foreach (array_slice(is_array($input['items'] ?? null) ? $input['items'] : [], 0, 20) as $item) {
        if (is_array($item)) {
            $items[] = [
                'title' => clean_text($item['title'] ?? '', 255),
                'quantity' => max(1, min(30, (int) ($item['quantity'] ?? 1))),
                // Overnight stays: nights per dog (0 for a day visit such as the Trial Day).
                'nights' => max(0, min(90, (int) ($item['nights'] ?? 0))),
                'price' => clean_text($item['priceDisplay'] ?? ($item['price'] ?? ''), 60),
                'lineTotal' => clean_text($item['lineTotal'] ?? '', 40),
            ];
        }
    }
    if (!$items) {
        json_error('There is no boarding stay in this order.');
    }
    $date = clean_text($input['stayDate'] ?? '', 40);
    $time = clean_text($input['stayTime'] ?? '', 40);
    $end = clean_text($input['stayEnd'] ?? '', 40);
    $nights = 0;
    // An overnight stay: real dates and the number of dogs, checked against the nightly limit.
    $checkIn = null;
    $checkOut = null;
    $dogs = max(0, min(8, (int) ($input['dogs'] ?? 0)));
    if (($input['checkIn'] ?? '') !== '' || ($input['checkOut'] ?? '') !== '') {
        $in = parse_studio_date((string) ($input['checkIn'] ?? ''));
        $out = parse_studio_date((string) ($input['checkOut'] ?? ''));
        $today = studio_today();
        if (!$in || !$out || $in < $today || $in > $today->modify('+' . BOARDING_DAYS_AHEAD . ' days')) {
            json_error('Please choose a check-in date from today up to 3 months ahead.');
        }
        if ($out <= $in || $out > $in->modify('+' . BOARDING_MAX_NIGHTS . ' days')) {
            json_error('The check-out date must be after the check-in date (up to ' . BOARDING_MAX_NIGHTS . ' nights).');
        }
        $checkIn = $in->format('Y-m-d');
        $checkOut = $out->format('Y-m-d');
        $nights = count(boarding_night_dates($checkIn, $checkOut));
        if ($dogs > boarding_dogs_per_night()) {
            json_error('We can board up to ' . boarding_dogs_per_night() . ' dogs per night. Please WhatsApp us on ' . STUDIO_WHATSAPP . ' for a larger group.');
        }
        $full = $dogs > 0 ? boarding_full_nights($checkIn, $checkOut, $dogs) : [];
        if ($full) {
            send_json(['ok' => false, 'full' => $full, 'error' => 'Sorry, boarding is fully booked on ' . boarding_nights_text($full)
                . ' (up to ' . boarding_dogs_per_night() . ' dogs per night). Please choose other dates, or WhatsApp us on ' . STUDIO_WHATSAPP . '.'], 409);
        }
    }
    $total = clean_text($input['total'] ?? '', 40);
    $trialFee = clean_text($input['trialFee'] ?? '', 40);
    $notes = clean_text($input['notes'] ?? '', 2000);
    $now = now_utc();

    $pdo = db();
    $pdo->beginTransaction();
    $ref = 'BRD-' . str_pad((string) next_sequence($pdo, '#BOARDING'), 4, '0', STR_PAD_LEFT);
    $pdo->prepare(
        'INSERT INTO boarding_requests (ref, status, customer_name, customer_email, customer_phone, contact_method, stay_date, stay_time,
            stay_end, nights, check_in, check_out, dogs, pets, items, total, trial_fee, notes, admin_log, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([$ref, 'new', $name, $email, $phone, clean_text($customer['contactMethod'] ?? '', 30), $date, $time, $end, $nights,
        $checkIn, $checkOut, $checkIn ? $dogs : 0,
        json_encode($pets, JSON_UNESCAPED_UNICODE), json_encode($items, JSON_UNESCAPED_UNICODE), $total, $trialFee, $notes, '[]', $now, $now]);
    $id = (int) $pdo->lastInsertId();
    $pdo->commit();

    // One email: to the customer (if they gave an address) with a copy to info@, or to info@ only.
    $lines = array_map(function (array $i): string {
        return '• ' . boarding_item_line($i);
    }, $items);
    $petLines = array_map(function (array $p): string {
        return '• ' . ($p['name'] !== '' ? $p['name'] : 'Dog') . ($p['breed'] !== '' ? ' (' . $p['breed'] . ')' : '')
            . ($p['trialDone'] === 'no' ? ' — first stay, trial day needed' : ($p['trialDone'] === 'yes' ? ' — trial day done' : ''));
    }, $pets);
    $body = 'Dear ' . $name . ",\n\nThank you for your boarding request with Pawpad. We have received it and will confirm your dates by "
        . ($customer['contactMethod'] ?? 'phone') . " shortly. Nothing is booked until we confirm.\n\n"
        . 'Request reference: ' . $ref . "\n"
        . boarding_dates_text($date, $end, $nights, $time)
        . "\n" . implode("\n", $lines) . "\n"
        . ($petLines ? "\nDogs:\n" . implode("\n", $petLines) . "\n" : '')
        . ($trialFee !== '' && $trialFee !== '0' && $trialFee !== '₹0' ? "\nTrial day fee: " . $trialFee . "\n" : '')
        . ($total !== '' ? 'Estimated total: ' . $total . "\n" : '')
        . ($notes !== '' ? "\nNotes: " . $notes . "\n" : '')
        . "\nPayment: at the studio.\nStudio: " . STUDIO_ADDRESS . "\nQuestions? Reply to this email or WhatsApp us on " . STUDIO_WHATSAPP . ".\n\nWarm regards,\nPawpad\nhttps://pawpad.in\n";
    $to = $email !== '' ? $email : mail_account('info')['from'];
    $mail = send_mail('info', $to, $name, 'Your Pawpad boarding request (' . $ref . ')', $body);
    db()->prepare('UPDATE boarding_requests SET email_status = ? WHERE id = ?')->execute([$mail['sent'] ? 'sent' : 'failed', $id]);
    return ['ref' => $ref, 'emailSent' => $mail['sent']];
}

/** "Overnight Boarding — 1 dog × 5 nights — ₹1,000 / dog, night (₹5,000)". */
function boarding_item_line(array $i): string
{
    $count = $i['quantity'] . ' dog' . ($i['quantity'] > 1 ? 's' : '');
    $what = ($i['nights'] ?? 0) > 0
        ? $count . ' × ' . $i['nights'] . ' night' . ($i['nights'] > 1 ? 's' : '')
        : ($i['quantity'] > 1 ? $count : '');
    return $i['title'] . ($what !== '' ? ' — ' . $what : '') . ($i['price'] !== '' ? ' — ' . $i['price'] : '')
        . (($i['lineTotal'] ?? '') !== '' ? ' (' . $i['lineTotal'] . ')' : '');
}

/** The dates part of the email: check-in and check-out for a stay, or the one requested day. */
function boarding_dates_text(string $date, string $end, int $nights, string $time): string
{
    if ($date === '') {
        return '';
    }
    if ($end !== '') {
        return 'Check-in: ' . $date . ($time !== '' && $time !== 'Flexible' ? ' · ' . $time : '') . "\n"
            . 'Check-out: ' . $end . ($nights > 0 ? ' (' . $nights . ' night' . ($nights > 1 ? 's' : '') . ')' : '') . "\n";
    }
    return 'Requested: ' . $date . ($time !== '' ? ' · ' . $time : '') . "\n";
}

function list_boarding_requests(): array
{
    $rows = db()->query('SELECT * FROM boarding_requests ORDER BY created_at DESC, id DESC LIMIT 500')->fetchAll();
    return ['requests' => array_map('boarding_to_array', $rows), 'statuses' => BOARDING_STATUSES];
}

/** Staff: change the status and/or add a note; both are logged with who did it. */
function update_boarding_request(array $admin, array $input): array
{
    $stmt = db()->prepare('SELECT * FROM boarding_requests WHERE id = ?');
    $stmt->execute([(int) ($input['id'] ?? 0)]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Boarding request not found.', 404);
    }
    $status = (string) ($input['status'] ?? $row['status']);
    if (!isset(BOARDING_STATUSES[$status])) {
        json_error('Unknown status.');
    }
    $note = clean_text($input['note'] ?? '', 1000);
    // Confirming a stay must not take any night over the limit.
    if ($status === 'confirmed' && $row['status'] !== 'confirmed' && !empty($row['check_in']) && !empty($row['check_out']) && (int) $row['dogs'] > 0) {
        $full = boarding_full_nights($row['check_in'], $row['check_out'], (int) $row['dogs'], (int) $row['id']);
        if ($full) {
            json_error('Can\'t confirm ' . $row['ref'] . ': ' . boarding_nights_text($full) . ' would have more than '
                . boarding_dogs_per_night() . ' dogs (confirmed stays). Change the dates with the customer, or decline.', 409);
        }
    }
    $log = json_decode((string) ($row['admin_log'] ?? ''), true) ?: [];
    $now = to_iso(now_utc());
    if ($status !== $row['status']) {
        $log[] = ['date' => $now, 'by' => $admin['email'], 'text' => 'Status: ' . BOARDING_STATUSES[$row['status']] . ' → ' . BOARDING_STATUSES[$status]];
    }
    if ($note !== '') {
        $log[] = ['date' => $now, 'by' => $admin['email'], 'text' => $note];
    }
    db()->prepare('UPDATE boarding_requests SET status = ?, admin_log = ?, updated_at = ? WHERE id = ?')
        ->execute([$status, json_encode($log, JSON_UNESCAPED_UNICODE), now_utc(), $row['id']]);
    $stmt->execute([$row['id']]);
    return ['request' => boarding_to_array($stmt->fetch())];
}
