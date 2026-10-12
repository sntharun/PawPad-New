<?php
/** Private invoice register. Issued snapshots and PDFs are never edited. */
declare(strict_types=1);

if (!defined('PAWPAD_API')) { http_response_code(404); exit; }

const INVOICE_SERVICES = ['course', 'grooming', 'boarding', 'consulting', 'other'];

function invoice_settings(): array
{
    $row = db()->query('SELECT * FROM billing_settings WHERE id = 1')->fetch();
    if (!$row) return ['legalName' => '', 'address' => '', 'stateCode' => '', 'stateName' => '', 'gstStatus' => 'unknown', 'eInvoiceStatus' => 'unknown',
        'gstin' => '', 'invoicePrefix' => 'PP', 'serviceCodes' => [], 'approvedAt' => '', 'adjustmentsApprovedAt' => '', 'approvedBy' => '', 'accountantName' => '', 'accountantReference' => '', 'authorizedSignatory' => '', 'signatureData' => ''];
    return ['legalName' => $row['legal_name'], 'address' => $row['address'], 'stateCode' => $row['state_code'], 'stateName' => $row['state_name'],
        'gstStatus' => $row['gst_status'], 'eInvoiceStatus' => $row['einvoice_status'], 'gstin' => $row['gstin'], 'invoicePrefix' => $row['invoice_prefix'],
        'serviceCodes' => json_decode($row['service_codes'], true) ?: [],
        'approvedAt' => to_iso($row['approved_at']), 'adjustmentsApprovedAt' => to_iso($row['adjustments_approved_at']), 'approvedBy' => $row['approved_by'],
        'accountantName' => $row['accountant_name'], 'accountantReference' => $row['accountant_reference'],
        'authorizedSignatory' => $row['authorized_signatory'], 'signatureData' => $row['signature_data'] ?: ''];
}

function invoice_clean_settings(array $input): array
{
    $settings = [
        'legalName' => clean_text($input['legalName'] ?? '', 255),
        'address' => clean_text($input['address'] ?? '', 3000),
        'stateCode' => trim((string) ($input['stateCode'] ?? '')),
        'stateName' => clean_text($input['stateName'] ?? '', 100),
        'gstStatus' => clean_text($input['gstStatus'] ?? '', 20),
        'eInvoiceStatus' => clean_text($input['eInvoiceStatus'] ?? 'unknown', 20),
        'gstin' => strtoupper(clean_text($input['gstin'] ?? '', 15)),
        'invoicePrefix' => strtoupper(clean_text($input['invoicePrefix'] ?? '', 20)),
        'authorizedSignatory' => clean_text($input['authorizedSignatory'] ?? '', 190),
        'signatureData' => (string) ($input['signatureData'] ?? ''),
        'serviceCodes' => [],
    ];
    if (!preg_match('/^\d{2}$/', $settings['stateCode'])) json_error('Enter the issuer state code as two digits.');
    if (!in_array($settings['gstStatus'], ['registered', 'unregistered'], true)) json_error('Choose the accountant-confirmed GST status.');
    if (!in_array($settings['eInvoiceStatus'], ['unknown', 'applicable', 'not_applicable'], true)) json_error('Choose whether GST e-invoicing applies to this issuer.');
    if ($settings['gstStatus'] === 'registered' && !preg_match('/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/', $settings['gstin'])) json_error('Enter a valid GSTIN.');
    if ($settings['gstStatus'] === 'unregistered') { $settings['gstin'] = ''; $settings['eInvoiceStatus'] = 'not_applicable'; }
    if (!preg_match('/^[A-Z0-9-]{2,3}$/', $settings['invoicePrefix'])) json_error('Use 2–3 uppercase letters or digits for the invoice prefix so document numbers stay within 16 characters.');
    if ($settings['legalName'] === '' || $settings['address'] === '' || $settings['stateName'] === '' || $settings['authorizedSignatory'] === '') json_error('Enter the legal issuer name, address, state name, and authorized signatory.');
    if (!preg_match('~^data:image/(png|jpeg);base64,([A-Za-z0-9+/=]+)$~', $settings['signatureData'], $matches)) json_error('Upload a PNG or JPEG signature image before saving billing settings.');
    $signatureBytes = base64_decode($matches[2], true);
    $imageInfo = $signatureBytes === false ? false : getimagesizefromstring($signatureBytes);
    if ($signatureBytes === false || strlen($signatureBytes) > 100000 || !$imageInfo || ($imageInfo['mime'] ?? '') !== 'image/' . $matches[1]) json_error('The signature image must be a valid PNG or JPEG under 100 KB.');
    $codes = $input['serviceCodes'] ?? [];
    if (!is_array($codes)) json_error('Service codes must be an object.');
    foreach (INVOICE_SERVICES as $service) {
        $value = $codes[$service] ?? [];
        if (!is_array($value)) json_error('Invalid service code for ' . $service . '.');
        $code = strtoupper(clean_text($value['code'] ?? '', 20));
        $rate = $value['rate'] ?? null;
        if (!preg_match('/^[A-Z0-9-]{2,20}$/', $code) || !is_numeric($rate) || (float) $rate < 0 || (float) $rate > 28) {
            json_error('Enter an approved code and GST rate (0–28) for ' . $service . '.');
        }
        $settings['serviceCodes'][$service] = ['code' => $code, 'rate' => round((float) $rate, 2)];
    }
    return $settings;
}

function save_invoice_settings(array $admin, array $input): array
{
    $s = invoice_clean_settings($input);
    db()->prepare('INSERT INTO billing_settings (id, legal_name, address, state_code, state_name, gst_status, einvoice_status, gstin, invoice_prefix, service_codes, authorized_signatory, signature_data, approved_at, approved_by, updated_at, updated_by)
        VALUES (1,?,?,?,?,?,?,?,?,?,?,?,NULL,\'\',?,?) ON DUPLICATE KEY UPDATE legal_name=VALUES(legal_name), address=VALUES(address), state_code=VALUES(state_code), state_name=VALUES(state_name), gst_status=VALUES(gst_status), einvoice_status=VALUES(einvoice_status), gstin=VALUES(gstin), invoice_prefix=VALUES(invoice_prefix), service_codes=VALUES(service_codes), authorized_signatory=VALUES(authorized_signatory), signature_data=VALUES(signature_data), approved_at=NULL, adjustments_approved_at=NULL, approved_by=\'\', accountant_name=\'\', accountant_reference=\'\', updated_at=VALUES(updated_at), updated_by=VALUES(updated_by)')
        ->execute([$s['legalName'], $s['address'], $s['stateCode'], $s['stateName'], $s['gstStatus'], $s['eInvoiceStatus'], $s['gstin'], $s['invoicePrefix'],
            json_encode($s['serviceCodes']), $s['authorizedSignatory'], $s['signatureData'], now_utc(), $admin['email']]);
    return ['settings' => invoice_settings()];
}

function approve_invoice_settings(array $admin, array $input): array
{
    if (($input['accountantConfirmed'] ?? false) !== true) json_error('Confirm that an accountant approved the issuer, GST treatment, service codes, rates, and numbering.');
    $name = clean_text($input['accountantName'] ?? '', 190);
    $reference = clean_text($input['accountantReference'] ?? '', 255);
    if ($name === '' || $reference === '') json_error('Record the accountant name and approval reference before enabling invoices.');
    $s = invoice_settings();
    invoice_clean_settings($s);
    if ($s['eInvoiceStatus'] === 'unknown') json_error('Have the accountant confirm whether GST e-invoicing applies before approving billing settings.');
    db()->prepare('UPDATE billing_settings SET approved_at=?, adjustments_approved_at=?, approved_by=?, accountant_name=?, accountant_reference=? WHERE id=1')
        ->execute([now_utc(), ($input['adjustmentsConfirmed'] ?? false) === true ? now_utc() : null, $admin['email'], $name, $reference]);
    return ['settings' => invoice_settings()];
}

function invoice_items($raw): array
{
    if (!is_array($raw) || count($raw) < 1 || count($raw) > 30) json_error('Add 1–30 invoice line items.');
    $items = [];
    foreach ($raw as $row) {
        if (!is_array($row)) json_error('Invalid invoice item.');
        $service = (string) ($row['service'] ?? '');
        $description = clean_text($row['description'] ?? '', 300);
        $quantity = $row['quantity'] ?? null;
        $unitPrice = parse_amount($row['unitPrice'] ?? null);
        if (!in_array($service, INVOICE_SERVICES, true) || $description === '' || !is_numeric($quantity) || (float) $quantity <= 0 || (float) $quantity > 1000 || $unitPrice === null || $unitPrice <= 0) {
            json_error('Each item needs a service, description, positive quantity, and final unit price.');
        }
        $items[] = ['service' => $service, 'description' => $description,
            'quantity' => round((float) $quantity, 2), 'unitPrice' => $unitPrice];
    }
    return $items;
}

function invoice_source(string $kind, int $id, bool $lock = false): array
{
    if ($id < 1) json_error('Choose a valid source record.');
    if ($kind === 'course') {
        $q = db()->prepare('SELECT p.*, a.applicant_name AS customer_name, a.applicant_email AS customer_email, a.course_name AS label FROM course_payments p JOIN applications a ON a.id=p.application_id WHERE p.id=?' . ($lock ? ' FOR UPDATE' : ''));
        $q->execute([$id]); $row = $q->fetch();
        if (!$row) json_error('Course payment not found.', 404);
        return ['kind' => $kind, 'id' => $id, 'label' => $row['label'] . ' · ' . $row['application_id'], 'customerName' => $row['customer_name'], 'customerEmail' => $row['customer_email'],
            'amount' => (float) $row['amount'], 'paidOn' => $row['paid_on'], 'mode' => $row['mode'], 'reference' => $row['reference']];
    }
    if ($kind === 'grooming') {
        $q = db()->prepare('SELECT c.*, b.customer_name, b.customer_email, b.service_title AS label, b.ref, b.slot_date FROM booking_closing c JOIN bookings b ON b.id=c.booking_id WHERE c.booking_id=?' . ($lock ? ' FOR UPDATE' : ''));
        $q->execute([$id]); $row = $q->fetch();
        if (!$row || $row['status'] !== 'completed' || $row['amount'] === null || (float) $row['amount'] <= 0 || !isset(PAYMENT_MODES[$row['mode']])) json_error('A completed, paid grooming closing is required.', 409);
        return ['kind' => $kind, 'id' => $id, 'label' => $row['label'] . ' · ' . $row['ref'], 'customerName' => $row['customer_name'], 'customerEmail' => $row['customer_email'],
            'amount' => (float) $row['amount'], 'paidOn' => $row['slot_date'], 'mode' => $row['mode'], 'reference' => $row['reference']];
    }
    if ($kind === 'boarding') {
        $q = db()->prepare('SELECT id, ref, customer_name, customer_email, status FROM boarding_requests WHERE id=?' . ($lock ? ' FOR UPDATE' : ''));
        $q->execute([$id]); $row = $q->fetch();
        if (!$row || in_array($row['status'], ['declined', 'cancelled'], true)) json_error('Boarding request not found or cancelled.', 409);
        return ['kind' => $kind, 'id' => $id, 'label' => 'Boarding request · ' . $row['ref'], 'customerName' => $row['customer_name'], 'customerEmail' => $row['customer_email'],
            'amount' => null, 'paidOn' => '', 'mode' => '', 'reference' => $row['ref']];
    }
    json_error('Unknown source type.');
}

function invoice_source_issued(string $kind, int $id): bool
{
    if ($kind === 'grooming') {
        $q = db()->prepare("SELECT s.id FROM bookings target JOIN bookings linked ON linked.ref=target.ref JOIN invoice_source_links l ON l.kind='grooming' AND l.source_id=linked.id JOIN invoice_sales s ON s.id=l.sale_id WHERE target.id=? AND s.status='issued' LIMIT 1");
        $q->execute([$id]);
        return (bool) $q->fetchColumn();
    }
    $q = db()->prepare('SELECT s.id FROM invoice_source_links l JOIN invoice_sales s ON s.id=l.sale_id WHERE l.kind=? AND l.source_id=? AND s.status=\'issued\' LIMIT 1');
    $q->execute([$kind, $id]);
    return (bool) $q->fetchColumn();
}

function invoice_links($raw): array
{
    if (!is_array($raw) || count($raw) > 30) json_error('Use at most 30 payment or booking links.');
    $links = []; $seen = [];
    foreach ($raw as $value) {
        if (!is_array($value)) json_error('Invalid payment link.');
        $kind = (string) ($value['kind'] ?? '');
        if ($kind === 'manual') {
            $amount = parse_amount($value['amount'] ?? null);
            $day = (string) ($value['paidOn'] ?? '');
            $parsedDay = DateTimeImmutable::createFromFormat('!Y-m-d', $day, new DateTimeZone(STUDIO_TIMEZONE));
            $mode = (string) ($value['mode'] ?? '');
            $reference = clean_text($value['reference'] ?? '', 120);
            if ($amount === null || $amount <= 0 || !$parsedDay || $parsedDay->format('Y-m-d') !== $day || $parsedDay > new DateTimeImmutable('today', new DateTimeZone(STUDIO_TIMEZONE)) || !isset(PAYMENT_MODES[$mode]) || $reference === '') json_error('Manual payment needs an amount, valid received date, mode, and a transaction reference.');
            $links[] = ['kind' => 'manual', 'id' => null, 'amount' => $amount, 'paidOn' => $day, 'mode' => $mode, 'reference' => $reference];
        } else {
            $id = (int) ($value['id'] ?? 0); $key = $kind . ':' . $id;
            if (isset($seen[$key])) json_error('The same source cannot be linked twice.');
            $seen[$key] = true;
            $links[] = invoice_source($kind, $id);
        }
    }
    return $links;
}

function invoice_check_sale_group(PDO $pdo, array $link, int $saleId): void
{
    if ($link['kind'] === 'course') {
        $q = $pdo->prepare('SELECT application_id FROM course_payments WHERE id=?'); $q->execute([$link['id']]);
        $applicationId = (string) $q->fetchColumn();
        if ($applicationId === '') json_error('The course payment is no longer available.', 409);
        $lock = $pdo->prepare('SELECT id FROM applications WHERE id=? FOR UPDATE'); $lock->execute([$applicationId]); $lock->fetchAll();
        $check = $pdo->prepare("SELECT l.sale_id FROM invoice_source_links l JOIN course_payments p ON p.id=l.source_id WHERE l.kind='course' AND p.application_id=? AND l.sale_id<>? LIMIT 1");
        $check->execute([$applicationId, $saleId]);
        if ($check->fetch()) json_error('Another sale already covers this course application. Add its payments to the same draft sale.', 409);
    } elseif ($link['kind'] === 'grooming') {
        $q = $pdo->prepare('SELECT ref FROM bookings WHERE id=?'); $q->execute([$link['id']]);
        $ref = (string) $q->fetchColumn();
        if ($ref === '') json_error('The grooming booking is no longer available.', 409);
        $lock = $pdo->prepare('SELECT id FROM bookings WHERE ref=? FOR UPDATE'); $lock->execute([$ref]); $lock->fetchAll();
        $check = $pdo->prepare("SELECT l.sale_id FROM invoice_source_links l JOIN bookings b ON b.id=l.source_id WHERE l.kind='grooming' AND b.ref=? AND l.sale_id<>? LIMIT 1");
        $check->execute([$ref, $saleId]);
        if ($check->fetch()) json_error('Another sale already covers this grooming order. Add its pets to the same draft sale.', 409);
    }
}

function invoice_sale(int $id): array
{
    $q = db()->prepare('SELECT * FROM invoice_sales WHERE id=?'); $q->execute([$id]); $row = $q->fetch();
    if (!$row) json_error('Invoice sale not found.', 404);
    $links = db()->prepare('SELECT * FROM invoice_source_links WHERE sale_id=? ORDER BY id'); $links->execute([$id]);
    $corrections = db()->prepare('SELECT note, created_at, created_by FROM invoice_corrections WHERE sale_id=? ORDER BY id'); $corrections->execute([$id]);
    return ['id' => $id, 'status' => $row['status'], 'customerName' => $row['customer_name'], 'customerEmail' => $row['customer_email'],
        'customerAddress' => $row['customer_address'], 'customerStateCode' => $row['customer_state_code'], 'customerStateName' => $row['customer_state_name'],
        'deliveryAddress' => $row['delivery_address'] ?: '', 'customerGstin' => $row['customer_gstin'],
        'items' => json_decode($row['items'], true) ?: [], 'notes' => $row['notes'], 'issuedNo' => $row['issued_no'], 'issuedAt' => to_iso($row['issued_at']),
        'issuedBy' => $row['issued_by'], 'snapshot' => json_decode($row['snapshot'] ?: '', true), 'emailStatus' => $row['email_status'],
        'emailedAt' => to_iso($row['emailed_at']), 'emailError' => $row['email_error'],
        'links' => array_map(static function ($link) { return ['kind' => $link['kind'], 'id' => $link['source_id'] === null ? null : (int) $link['source_id'],
            'amount' => $link['amount'] === null ? null : (float) $link['amount'], 'paidOn' => $link['paid_on'], 'mode' => $link['mode'], 'reference' => $link['reference']]; }, $links->fetchAll()),
        'corrections' => array_map(static function ($log) { return ['note' => $log['note'], 'createdAt' => to_iso($log['created_at']), 'createdBy' => $log['created_by']]; }, $corrections->fetchAll()),
        'adjustments' => invoice_adjustments_for_sale($id)];
}

function list_invoice_sales(array $input): array
{
    $page = max(0, min(100000, (int) ($input['page'] ?? 0)));
    $offset = $page * 50;
    $rows = db()->query('SELECT id FROM invoice_sales ORDER BY created_at DESC, id DESC LIMIT 50 OFFSET ' . $offset)->fetchAll();
    return ['sales' => array_map(static function ($row) { return invoice_sale((int) $row['id']); }, $rows),
        'total' => (int) db()->query('SELECT COUNT(*) FROM invoice_sales')->fetchColumn(), 'page' => $page];
}

function list_invoice_sources(): array
{
    $course = db()->query('SELECT p.id FROM course_payments p JOIN applications a ON a.id=p.application_id LEFT JOIN invoice_source_links l ON l.kind=\'course\' AND l.source_id=p.id WHERE l.id IS NULL ORDER BY p.id DESC LIMIT 150')->fetchAll();
    $grooming = db()->query('SELECT c.booking_id AS id FROM booking_closing c LEFT JOIN invoice_source_links l ON l.kind=\'grooming\' AND l.source_id=c.booking_id WHERE l.id IS NULL AND c.status=\'completed\' AND c.amount>0 AND c.mode IN (\'upi\',\'cash\',\'card\',\'bank_transfer\') ORDER BY c.updated_at DESC LIMIT 150')->fetchAll();
    $boarding = db()->query('SELECT b.id FROM boarding_requests b LEFT JOIN invoice_source_links l ON l.kind=\'boarding\' AND l.source_id=b.id WHERE l.id IS NULL AND b.status NOT IN (\'declined\', \'cancelled\') ORDER BY b.id DESC LIMIT 100')->fetchAll();
    $sources = [];
    foreach (['course' => $course, 'grooming' => $grooming, 'boarding' => $boarding] as $kind => $rows) {
        foreach ($rows as $row) $sources[] = invoice_source($kind, (int) $row['id']);
    }
    return ['sources' => $sources];
}

function save_invoice_sale(array $admin, array $input): array
{
    $id = (int) ($input['id'] ?? 0);
    $name = clean_text($input['customerName'] ?? '', 255);
    $email = clean_text($input['customerEmail'] ?? '', 255);
    $address = clean_text($input['customerAddress'] ?? '', 3000);
    $state = trim((string) ($input['customerStateCode'] ?? ''));
    $stateName = clean_text($input['customerStateName'] ?? '', 100);
    $deliveryAddress = clean_text($input['deliveryAddress'] ?? '', 3000);
    $gstin = strtoupper(clean_text($input['customerGstin'] ?? '', 15));
    if ($name === '' || ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) || ($state !== '' && !preg_match('/^\d{2}$/', $state))) json_error('Enter a customer name, valid email if available, and two-digit state code if supplied.');
    if ($gstin !== '' && !preg_match('/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/', $gstin)) json_error('Enter a valid customer GSTIN or leave it blank.');
    $items = invoice_items($input['items'] ?? []);
    $links = invoice_links($input['links'] ?? []);
    $pdo = db(); $pdo->beginTransaction();
    try {
        if ($id) {
            $q = $pdo->prepare('SELECT status FROM invoice_sales WHERE id=? FOR UPDATE'); $q->execute([$id]); $existing = $q->fetch();
            if (!$existing) json_error('Invoice sale not found.', 404);
            if ($existing['status'] !== 'draft') json_error('Issued invoices are immutable.', 409);
            $pdo->prepare('UPDATE invoice_sales SET customer_name=?, customer_email=?, customer_address=?, customer_state_code=?, customer_state_name=?, delivery_address=?, customer_gstin=?, items=?, notes=?, updated_at=?, updated_by=? WHERE id=?')
                ->execute([$name, $email, $address, $state, $stateName, $deliveryAddress, $gstin, json_encode($items), clean_text($input['notes'] ?? '', 2000), now_utc(), $admin['email'], $id]);
            $pdo->prepare('DELETE FROM invoice_source_links WHERE sale_id=?')->execute([$id]);
        } else {
            $pdo->prepare('INSERT INTO invoice_sales (customer_name, customer_email, customer_address, customer_state_code, customer_state_name, delivery_address, customer_gstin, items, notes, created_at, created_by, updated_at, updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
                ->execute([$name, $email, $address, $state, $stateName, $deliveryAddress, $gstin, json_encode($items), clean_text($input['notes'] ?? '', 2000), now_utc(), $admin['email'], now_utc(), $admin['email']]);
            $id = (int) $pdo->lastInsertId();
        }
        foreach ($links as $link) {
            invoice_check_sale_group($pdo, $link, $id);
            $manualKey = $link['kind'] === 'manual' ? hash('sha256', strtolower($link['mode'] . '|' . $link['reference'])) : null;
            $pdo->prepare('INSERT INTO invoice_source_links (sale_id, kind, source_id, amount, paid_on, mode, reference, manual_key) VALUES (?,?,?,?,?,?,?,?)')
                ->execute([$id, $link['kind'], $link['id'], $link['amount'], $link['paidOn'] ?: null, $link['mode'], $link['reference'], $manualKey]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if ($e instanceof PDOException && (int) ($e->errorInfo[1] ?? 0) === 1062) json_error('This payment or request is already linked to another sale.', 409);
        throw $e;
    }
    return ['sale' => invoice_sale($id)];
}

function invoice_money(int $paise): string { return number_format($paise / 100, 2, '.', ''); }

function invoice_calc(array $items, array $settings, string $customerState): array
{
    $registered = $settings['gstStatus'] === 'registered';
    if ($registered && $customerState === '') json_error('Customer state code is required to decide CGST/SGST or IGST.', 409);
    $rows = []; $total = 0; $taxTotal = 0;
    foreach ($items as $item) {
        $config = $settings['serviceCodes'][$item['service']] ?? null;
        if (!$config) json_error('Billing code is missing for ' . $item['service'] . '.', 409);
        $gross = (int) round((float) $item['quantity'] * (float) $item['unitPrice'] * 100);
        $rate = $registered ? (float) $config['rate'] : 0.0;
        $tax = (int) round($gross * $rate / (100 + $rate));
        $rows[] = $item + ['serviceCode' => $config['code'], 'rate' => $rate, 'net' => invoice_money($gross - $tax),
            'tax' => invoice_money($tax), 'gross' => invoice_money($gross)];
        $total += $gross; $taxTotal += $tax;
    }
    $sameState = $customerState === $settings['stateCode'];
    $cgst = $registered && $sameState ? intdiv($taxTotal, 2) : 0;
    $sgst = $registered && $sameState ? $taxTotal - $cgst : 0;
    $igst = $registered && !$sameState ? $taxTotal : 0;
    return ['items' => $rows, 'net' => invoice_money($total - $taxTotal), 'tax' => invoice_money($taxTotal),
        'cgst' => invoice_money($cgst), 'sgst' => invoice_money($sgst), 'igst' => invoice_money($igst), 'total' => invoice_money($total)];
}

function invoice_year(): string
{
    $now = new DateTimeImmutable('now', new DateTimeZone(STUDIO_TIMEZONE));
    $start = (int) $now->format('n') >= 4 ? (int) $now->format('Y') : (int) $now->format('Y') - 1;
    return $start . '-' . substr((string) ($start + 1), -2);
}

function invoice_next_no(PDO $pdo, string $prefix): string
{
    $year = invoice_year();
    $pdo->prepare('INSERT INTO invoice_sequences (financial_year, next_number) VALUES (?, LAST_INSERT_ID(2)) ON DUPLICATE KEY UPDATE next_number = LAST_INSERT_ID(next_number + 1)')->execute([$year]);
    $next = (int) $pdo->query('SELECT LAST_INSERT_ID()')->fetchColumn();
    $number = $prefix . '/' . $year . '/' . str_pad((string) ($next - 1), 4, '0', STR_PAD_LEFT);
    if (strlen($number) > 16) json_error('Invoice numbering has exceeded the approved 16-character format.', 409);
    return $number;
}

function invoice_html_escape($value): string { return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

function invoice_pdf_bytes(array $snapshot, string $signatureData): string
{
    require_once __DIR__ . '/dompdf/autoload.inc.php';
    $e = 'invoice_html_escape';
    $items = '';
    foreach ($snapshot['calculation']['items'] as $item) {
        $items .= '<tr><td>' . $e($item['description']) . '<br><small>SAC ' . $e($item['serviceCode']) . '</small></td><td>' . $e($item['quantity']) . '</td><td>' . $e($item['unitPrice']) . '</td><td>₹' . $e($item['net']) . '</td><td>' . $e($item['rate']) . '% / ₹' . $e($item['tax']) . '</td><td>₹' . $e($item['gross']) . '</td></tr>';
    }
    $paymentRows = '';
    foreach ($snapshot['payments'] as $pay) {
        if ($pay['amount'] === null) continue;
        $paymentRows .= '<tr><td>' . $e($pay['paidOn']) . '</td><td>' . $e($pay['mode']) . '</td><td>' . $e($pay['reference']) . '</td><td>₹' . $e(number_format((float) $pay['amount'], 2, '.', '')) . '</td></tr>';
    }
    $s = $snapshot['settings']; $c = $snapshot['customer']; $t = $snapshot['calculation'];
    $html = '<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:DejaVu Sans,sans-serif;color:#202020;font-size:10px}h1{font-size:22px;margin-bottom:4px}.muted{color:#555}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}th{background:#f4f1eb}.right{text-align:right}.block{margin-top:16px;line-height:1.6}</style></head><body>';
    $html .= '<h1>' . ($s['gstStatus'] === 'registered' ? 'Tax Invoice' : 'Invoice') . '</h1><p class="muted">Original for recipient · No. ' . $e($snapshot['number']) . ' · Issued ' . $e($snapshot['issuedOn']) . '</p>';
    $html .= '<div class="block"><strong>From</strong><br>' . $e($s['legalName']) . '<br>' . nl2br($e($s['address'])) . '<br>State: ' . $e($s['stateName']) . ' (' . $e($s['stateCode']) . ')' . ($s['gstStatus'] === 'registered' ? '<br>GSTIN: ' . $e($s['gstin']) : '<br>GST not charged') . '</div>';
    $html .= '<div class="block"><strong>Bill to</strong><br>' . $e($c['name']) . '<br>' . nl2br($e($c['address'])) . '<br>' . $e($c['email']) . '<br>Place of supply: ' . $e($c['stateName']) . ' (' . $e($c['stateCode']) . ')' . ($c['gstin'] ? '<br>GSTIN: ' . $e($c['gstin']) : '') . '<br>Delivery address: ' . nl2br($e($c['deliveryAddress'] ?: $c['address'])) . '</div>';
    $html .= '<table><thead><tr><th>Service / SAC</th><th>Qty</th><th>Unit price</th><th>Value</th><th>GST</th><th class="right">Amount</th></tr></thead><tbody>' . $items . '</tbody></table>';
    $html .= '<table><tr><td>Taxable value</td><td class="right">₹' . $e($t['net']) . '</td></tr><tr><td>CGST</td><td class="right">₹' . $e($t['cgst']) . '</td></tr><tr><td>SGST</td><td class="right">₹' . $e($t['sgst']) . '</td></tr><tr><td>IGST</td><td class="right">₹' . $e($t['igst']) . '</td></tr><tr><th>Total</th><th class="right">₹' . $e($t['total']) . '</th></tr></table>';
    $html .= '<p class="block"><strong>Verified payments</strong></p><table><thead><tr><th>Date</th><th>Mode</th><th>Reference</th><th>Amount</th></tr></thead><tbody>' . $paymentRows . '</tbody></table>';
    if ($snapshot['notes'] !== '') $html .= '<p class="block"><strong>Notes:</strong> ' . nl2br($e($snapshot['notes'])) . '</p>';
    $html .= '<p class="block">Reverse charge: No</p>';
    $html .= '<div class="block"><img src="' . $e($signatureData) . '" alt="Authorized signature" style="max-height:65px;max-width:220px"><br>Authorized signatory: ' . $e($s['authorizedSignatory']) . '</div>';
    $html .= '<p class="block muted">Issued by ' . $e($snapshot['issuedBy']) . '. This invoice is a fixed record; corrections are logged separately.</p></body></html>';
    $options = new Dompdf\Options();
    $options->set('isRemoteEnabled', false);
    $options->set('defaultFont', 'DejaVu Sans');
    $pdf = new Dompdf\Dompdf($options);
    $pdf->loadHtml($html, 'UTF-8'); $pdf->setPaper('A4'); $pdf->render();
    return $pdf->output();
}

function issue_invoice(array $admin, array $input): array
{
    if (($input['customerConfirmed'] ?? false) !== true || ($input['finalAmountConfirmed'] ?? false) !== true || ($input['reverseChargeConfirmed'] ?? false) !== true) json_error('Confirm customer identity, final amount, and that reverse charge does not apply before issuing.');
    $id = (int) ($input['id'] ?? 0); $pdo = db(); $pdfPath = '';
    $pdo->beginTransaction();
    try {
        $q = $pdo->prepare('SELECT * FROM invoice_sales WHERE id=? FOR UPDATE'); $q->execute([$id]); $row = $q->fetch();
        if (!$row) json_error('Invoice sale not found.', 404);
        if ($row['status'] !== 'draft') json_error('This sale already has a final invoice.', 409);
        if (trim($row['customer_address']) === '' || trim($row['customer_state_name']) === '' || !preg_match('/^\d{2}$/', $row['customer_state_code'])) json_error('Customer billing address, state name, and two-digit state code are required to issue.', 409);
        $settings = invoice_settings();
        if (!$settings['approvedAt']) json_error('Final issuance is locked until an accountant-approved billing setup is saved and approved.', 409);
        if ($row['customer_gstin'] !== '' && $settings['eInvoiceStatus'] !== 'not_applicable') json_error('B2B issuance is blocked because GST e-invoicing may apply. An IRP integration is required when applicable.', 409);
        $signatureData = $settings['signatureData'];
        unset($settings['signatureData']);
        $items = invoice_items(json_decode($row['items'], true) ?: []);
        $calc = invoice_calc($items, $settings, $row['customer_state_code']);
        $q = $pdo->prepare('SELECT * FROM invoice_source_links WHERE sale_id=? ORDER BY id FOR UPDATE'); $q->execute([$id]); $rawLinks = $q->fetchAll();
        if (!$rawLinks) json_error('Link at least one verified payment to this sale.', 409);
        $linkedCourse = []; $linkedGrooming = [];
        foreach ($rawLinks as $link) {
            if ($link['kind'] === 'course') {
                $q = $pdo->prepare('SELECT application_id FROM course_payments WHERE id=?'); $q->execute([$link['source_id']]);
                $applicationId = (string) $q->fetchColumn();
                if ($applicationId === '') json_error('A linked course payment is missing.', 409);
                $linkedCourse[$applicationId][] = (int) $link['source_id'];
            } elseif ($link['kind'] === 'grooming') {
                $q = $pdo->prepare('SELECT ref FROM bookings WHERE id=?'); $q->execute([$link['source_id']]);
                $ref = (string) $q->fetchColumn();
                if ($ref === '') json_error('A linked grooming booking is missing.', 409);
                $linkedGrooming[$ref][] = (int) $link['source_id'];
            }
        }
        ksort($linkedCourse); ksort($linkedGrooming);
        foreach ($linkedCourse as $applicationId => $linkedIds) {
            $q = $pdo->prepare('SELECT id FROM applications WHERE id=? FOR UPDATE'); $q->execute([$applicationId]); $q->fetch();
            $q = $pdo->prepare('SELECT id FROM course_payments WHERE application_id=? ORDER BY id'); $q->execute([$applicationId]);
            $allIds = array_map('intval', $q->fetchAll(PDO::FETCH_COLUMN)); sort($allIds); sort($linkedIds);
            if ($allIds !== $linkedIds) json_error('Link every recorded payment for course application ' . $applicationId . ' before issuing its final invoice.', 409);
        }
        foreach ($linkedGrooming as $ref => $linkedIds) {
            $q = $pdo->prepare('SELECT id FROM bookings WHERE ref=? FOR UPDATE'); $q->execute([$ref]); $q->fetchAll();
            $q = $pdo->prepare("SELECT b.id FROM bookings b JOIN booking_closing c ON c.booking_id=b.id WHERE b.ref=? AND c.status='completed' AND c.amount>0 AND c.mode IN ('upi','cash','card','bank_transfer') ORDER BY b.id");
            $q->execute([$ref]);
            $allIds = array_map('intval', $q->fetchAll(PDO::FETCH_COLUMN)); sort($allIds); sort($linkedIds);
            if ($allIds !== $linkedIds) json_error('Link every paid grooming closing in order ' . $ref . ' before issuing its final invoice.', 409);
        }
        $payments = []; $paidPaise = 0;
        foreach ($rawLinks as $link) {
            $source = $link['kind'] === 'manual' ? ['kind' => 'manual', 'id' => null, 'amount' => (float) $link['amount'], 'paidOn' => $link['paid_on'], 'mode' => $link['mode'], 'reference' => $link['reference']] : invoice_source($link['kind'], (int) $link['source_id'], true);
            if ($source['kind'] !== 'manual' && $source['customerEmail'] !== '' && $row['customer_email'] !== '' && strcasecmp($source['customerEmail'], $row['customer_email']) !== 0) json_error('Linked source belongs to another customer email.', 409);
            if ($source['amount'] !== null) $paidPaise += (int) round((float) $source['amount'] * 100);
            $payments[] = $source;
        }
        if ($paidPaise !== (int) round((float) $calc['total'] * 100)) json_error('Verified payments must equal the final invoice total exactly.', 409);
        $number = invoice_next_no($pdo, $settings['invoicePrefix']);
        $snapshot = ['number' => $number, 'issuedOn' => (new DateTimeImmutable('now', new DateTimeZone(STUDIO_TIMEZONE)))->format('Y-m-d'),
            'issuedBy' => $admin['email'], 'settings' => $settings, 'customer' => ['name' => $row['customer_name'], 'email' => $row['customer_email'],
                'address' => $row['customer_address'], 'stateCode' => $row['customer_state_code'], 'stateName' => $row['customer_state_name'],
                'deliveryAddress' => $row['delivery_address'] ?: '', 'gstin' => $row['customer_gstin']],
            'calculation' => $calc, 'payments' => $payments, 'notes' => $row['notes']];
        $bytes = invoice_pdf_bytes($snapshot, $signatureData);
        $dir = dirname(__DIR__) . '/private/invoices';
        if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) throw new RuntimeException('Could not create private invoice storage.');
        $pdfPath = $dir . '/' . $id . '-' . bin2hex(random_bytes(12)) . '.pdf';
        if (file_put_contents($pdfPath, $bytes, LOCK_EX) !== strlen($bytes)) throw new RuntimeException('Could not store invoice PDF.');
        chmod($pdfPath, 0600);
        $pdo->prepare('UPDATE invoice_sales SET status=\'issued\', issued_no=?, issued_at=?, issued_by=?, snapshot=?, pdf_path=?, updated_at=?, updated_by=? WHERE id=?')
            ->execute([$number, now_utc(), $admin['email'], json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $pdfPath, now_utc(), $admin['email'], $id]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if ($pdfPath !== '' && is_file($pdfPath)) unlink($pdfPath);
        throw $e;
    }
    if ($row['customer_email'] !== '') send_invoice($admin, ['id' => $id]);
    return ['sale' => invoice_sale($id)];
}

function send_invoice(array $admin, array $input): array
{
    $id = (int) ($input['id'] ?? 0); $sale = invoice_sale($id);
    if ($sale['status'] !== 'issued') json_error('Issue the invoice first.', 409);
    if ($sale['customerEmail'] === '') json_error('Add a customer email before delivery. The issued invoice itself cannot be edited.', 409);
    $q = db()->prepare('SELECT pdf_path FROM invoice_sales WHERE id=?'); $q->execute([$id]); $path = (string) $q->fetchColumn();
    if (!is_file($path)) json_error('Stored invoice PDF is missing. Restore it from backup before emailing.', 500);
    $result = send_invoice_attachment($sale['customerEmail'], $sale['customerName'], $sale['issuedNo'], $path);
    db()->prepare('UPDATE invoice_sales SET email_status=?, emailed_at=?, email_error=? WHERE id=?')->execute([
        $result['sent'] ? 'sent' : 'failed', $result['sent'] ? now_utc() : null, $result['error'], $id]);
    return ['sale' => invoice_sale($id), 'emailSent' => $result['sent'], 'emailError' => $result['error']];
}

function invoice_pdf(array $input): array
{
    $id = (int) ($input['id'] ?? 0); $sale = invoice_sale($id);
    if ($sale['status'] !== 'issued') json_error('Invoice PDF is not available yet.', 409);
    $q = db()->prepare('SELECT pdf_path FROM invoice_sales WHERE id=?'); $q->execute([$id]); $path = (string) $q->fetchColumn();
    if (!is_file($path)) json_error('Stored invoice PDF is missing.', 500);
    return ['filename' => preg_replace('/[^A-Za-z0-9_.-]/', '-', $sale['issuedNo']) . '.pdf', 'base64' => base64_encode(file_get_contents($path))];
}

function record_invoice_correction(array $admin, array $input): array
{
    $id = (int) ($input['id'] ?? 0); $sale = invoice_sale($id);
    if ($sale['status'] !== 'issued') json_error('Only issued invoices need correction logs.', 409);
    $note = clean_text($input['note'] ?? '', 2000);
    if (strlen($note) < 10) json_error('Explain the correction in at least 10 characters.');
    db()->prepare('INSERT INTO invoice_corrections (sale_id, note, created_at, created_by) VALUES (?,?,?,?)')->execute([$id, $note, now_utc(), $admin['email']]);
    return ['sale' => invoice_sale($id)];
}

function set_invoice_delivery_email(array $admin, array $input): array
{
    $id = (int) ($input['id'] ?? 0); $sale = invoice_sale($id);
    if ($sale['status'] !== 'issued') json_error('This sale has no issued invoice.', 409);
    $email = clean_text($input['email'] ?? '', 255);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_error('Enter a valid delivery email.');
    if (strcasecmp($email, $sale['customerEmail']) === 0) return ['sale' => $sale];
    $pdo = db(); $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE invoice_sales SET customer_email=?, email_status=\'pending\', emailed_at=NULL, email_error=\'\' WHERE id=?')->execute([$email, $id]);
        $pdo->prepare('INSERT INTO invoice_corrections (sale_id, note, created_at, created_by) VALUES (?,?,?,?)')
            ->execute([$id, 'Invoice delivery address changed from ' . ($sale['customerEmail'] ?: '(none)') . ' to ' . $email . '. Issued PDF remains unchanged.', now_utc(), $admin['email']]);
        $pdo->commit();
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
    return ['sale' => invoice_sale($id)];
}
