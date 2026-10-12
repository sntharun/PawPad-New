<?php
/** Domestic financial corrections. The source invoice and issued notes stay immutable. */
declare(strict_types=1);

if (!defined('PAWPAD_API')) { http_response_code(404); exit; }

function invoice_adjustment_row(int $id): array
{
    $q = db()->prepare('SELECT * FROM invoice_adjustments WHERE id=?');
    $q->execute([$id]);
    $row = $q->fetch();
    if (!$row) json_error('Credit or debit note not found.', 404);
    $refunds = db()->prepare('SELECT amount, refunded_on, mode, reference, created_at, created_by FROM invoice_refunds WHERE adjustment_id=? ORDER BY id');
    $refunds->execute([$id]);
    $collections = db()->prepare('SELECT amount, received_on, mode, reference, created_at, created_by FROM invoice_adjustment_collections WHERE adjustment_id=? ORDER BY id');
    $collections->execute([$id]);
    return ['id' => (int) $row['id'], 'saleId' => (int) $row['sale_id'], 'kind' => $row['kind'], 'status' => $row['status'],
        'reason' => $row['reason'], 'reviewReference' => $row['review_reference'], 'lines' => json_decode($row['line_items'], true) ?: [], 'number' => $row['number'],
        'issuedAt' => to_iso($row['issued_at']), 'issuedBy' => $row['issued_by'], 'snapshot' => json_decode($row['snapshot'] ?: '', true),
        'emailStatus' => $row['email_status'], 'emailedAt' => to_iso($row['emailed_at']), 'emailError' => $row['email_error'],
        'refunds' => array_map(static function ($refund) {
            return ['amount' => (float) $refund['amount'], 'refundedOn' => $refund['refunded_on'], 'mode' => $refund['mode'],
                'reference' => $refund['reference'], 'createdAt' => to_iso($refund['created_at']), 'createdBy' => $refund['created_by']];
        }, $refunds->fetchAll()),
        'collections' => array_map(static function ($payment) {
            return ['amount' => (float) $payment['amount'], 'receivedOn' => $payment['received_on'], 'mode' => $payment['mode'],
                'reference' => $payment['reference'], 'createdAt' => to_iso($payment['created_at']), 'createdBy' => $payment['created_by']];
        }, $collections->fetchAll())];
}

function invoice_adjustments_for_sale(int $saleId): array
{
    $q = db()->prepare('SELECT id FROM invoice_adjustments WHERE sale_id=? ORDER BY id');
    $q->execute([$saleId]);
    return array_map(static function ($row) { return invoice_adjustment_row((int) $row['id']); }, $q->fetchAll());
}

/** Compact issued-note references for linked course and grooming records. */
function invoice_adjustment_numbers(array $saleIds): array
{
    $ids = array_values(array_unique(array_filter(array_map('intval', $saleIds))));
    if (!$ids) return [];
    $q = db()->prepare("SELECT sale_id, number FROM invoice_adjustments WHERE status='issued' AND sale_id IN (" . implode(',', array_fill(0, count($ids), '?')) . ') ORDER BY id');
    $q->execute($ids);
    $numbers = [];
    foreach ($q->fetchAll() as $row) $numbers[(int) $row['sale_id']][] = $row['number'];
    return $numbers;
}

function invoice_adjustment_lines($raw, array $original): array
{
    if (!is_array($raw) || count($raw) < 1 || count($raw) > 30) json_error('Select at least one original invoice line.');
    $lines = []; $seen = [];
    foreach ($raw as $value) {
        if (!is_array($value) || !isset($value['lineIndex']) || !preg_match('/^(0|[1-9][0-9]*)$/', (string) $value['lineIndex'])) json_error('Choose a valid invoice line.');
        $index = (int) $value['lineIndex'];
        $amount = parse_amount($value['amount'] ?? null);
        if (!isset($original[$index]) || isset($seen[$index]) || $amount === null || $amount <= 0) json_error('Each changed line needs a unique original line and a positive amount.');
        $seen[$index] = true;
        $lines[] = ['lineIndex' => $index, 'amount' => $amount];
    }
    return $lines;
}

function save_invoice_adjustment(array $admin, array $input): array
{
    $saleId = (int) ($input['saleId'] ?? 0);
    $sale = invoice_sale($saleId);
    if ($sale['status'] !== 'issued') json_error('Issue the original invoice before creating a financial correction.', 409);
    $id = (int) ($input['id'] ?? 0);
    $kind = (string) ($input['kind'] ?? '');
    $reason = clean_text($input['reason'] ?? '', 1000);
    $reviewReference = clean_text($input['reviewReference'] ?? '', 255);
    if (!in_array($kind, ['credit', 'debit'], true) || strlen($reason) < 10) json_error('Choose credit or debit and explain the change in at least 10 characters.');
    $lines = invoice_adjustment_lines($input['lines'] ?? [], $sale['snapshot']['calculation']['items'] ?? []);
    $pdo = db(); $pdo->beginTransaction();
    try {
        $lock = $pdo->prepare('SELECT status FROM invoice_sales WHERE id=? FOR UPDATE'); $lock->execute([$saleId]);
        if ($lock->fetchColumn() !== 'issued') json_error('Original invoice is unavailable.', 409);
        if ($id > 0) {
            $q = $pdo->prepare('SELECT sale_id, status FROM invoice_adjustments WHERE id=? FOR UPDATE'); $q->execute([$id]); $old = $q->fetch();
            if (!$old || (int) $old['sale_id'] !== $saleId || $old['status'] !== 'draft') json_error('Only a draft note for this invoice can be changed.', 409);
            $pdo->prepare('UPDATE invoice_adjustments SET kind=?, reason=?, review_reference=?, line_items=?, updated_at=?, updated_by=? WHERE id=?')
                ->execute([$kind, $reason, $reviewReference, json_encode($lines), now_utc(), $admin['email'], $id]);
        } else {
            $pdo->prepare('INSERT INTO invoice_adjustments (sale_id, kind, reason, review_reference, line_items, created_at, created_by, updated_at, updated_by) VALUES (?,?,?,?,?,?,?,?,?)')
                ->execute([$saleId, $kind, $reason, $reviewReference, json_encode($lines), now_utc(), $admin['email'], now_utc(), $admin['email']]);
            $id = (int) $pdo->lastInsertId();
        }
        $pdo->commit();
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
    return ['adjustment' => invoice_adjustment_row($id), 'sale' => invoice_sale($saleId)];
}

function invoice_adjustment_next_no(PDO $pdo, string $kind): string
{
    $year = invoice_year();
    $pdo->prepare('INSERT INTO invoice_adjustment_sequences (kind, financial_year, next_number) VALUES (?,?,LAST_INSERT_ID(2)) ON DUPLICATE KEY UPDATE next_number=LAST_INSERT_ID(next_number+1)')
        ->execute([$kind, $year]);
    $next = (int) $pdo->query('SELECT LAST_INSERT_ID()')->fetchColumn() - 1;
    $number = ($kind === 'credit' ? 'CN' : 'DN') . '/' . $year . '/' . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    if (strlen($number) > 16) json_error('Note numbering has exceeded 16 characters; ask the accountant to approve a new series.', 409);
    return $number;
}

function invoice_adjustment_calculation(array $lines, array $original, array $originalTotals, array $priorCredits, string $kind, array $settings, array $customer): array
{
    $rows = []; $grossTotal = 0; $taxTotal = 0;
    foreach ($lines as $line) {
        $index = $line['lineIndex']; $source = $original[$index];
        $gross = (int) round((float) $line['amount'] * 100);
        $sourceGross = (int) round((float) $source['gross'] * 100);
        $sourceTax = (int) round((float) $source['tax'] * 100);
        if ($kind === 'credit' && $gross + ($priorCredits[$index]['gross'] ?? 0) > $sourceGross) json_error('The credit exceeds the uncredited amount of invoice line ' . ($index + 1) . '.', 409);
        $rate = (float) $source['rate'];
        $tax = (int) round($gross * $rate / (100 + $rate));
        if ($kind === 'credit') {
            $remainingTax = $sourceTax - ($priorCredits[$index]['tax'] ?? 0);
            $tax = $gross + ($priorCredits[$index]['gross'] ?? 0) === $sourceGross ? $remainingTax : min($tax, $remainingTax);
        }
        $rows[] = ['lineIndex' => $index, 'description' => $source['description'], 'serviceCode' => $source['serviceCode'],
            'rate' => $rate, 'net' => invoice_money($gross - $tax), 'tax' => invoice_money($tax), 'gross' => invoice_money($gross),
            'grossPaise' => $gross, 'taxPaise' => $tax];
        $grossTotal += $gross; $taxTotal += $tax;
    }
    $sameState = $customer['stateCode'] === $settings['stateCode'];
    $cgst = $settings['gstStatus'] === 'registered' && $sameState ? intdiv($taxTotal, 2) : 0;
    $sgst = $settings['gstStatus'] === 'registered' && $sameState ? $taxTotal - $cgst : 0;
    if ($kind === 'credit' && $sameState && $settings['gstStatus'] === 'registered') {
        $remainingCgst = (int) round((float) $originalTotals['cgst'] * 100) - ($priorCredits['cgst'] ?? 0);
        $remainingSgst = (int) round((float) $originalTotals['sgst'] * 100) - ($priorCredits['sgst'] ?? 0);
        $cgst = min($cgst, $remainingCgst);
        $sgst = $taxTotal - $cgst;
        if ($sgst > $remainingSgst) { $sgst = $remainingSgst; $cgst = $taxTotal - $sgst; }
    }
    $igst = $settings['gstStatus'] === 'registered' && !$sameState ? $taxTotal : 0;
    return ['items' => $rows, 'net' => invoice_money($grossTotal - $taxTotal), 'tax' => invoice_money($taxTotal),
        'cgst' => invoice_money($cgst), 'sgst' => invoice_money($sgst), 'igst' => invoice_money($igst), 'total' => invoice_money($grossTotal)];
}

function invoice_adjustment_preview_calculation(PDO $pdo, array $row, array $original, bool $lock = false): array
{
    $lines = invoice_adjustment_lines(json_decode($row['line_items'], true), $original['calculation']['items']);
    $priorCredits = [];
    $q = $pdo->prepare("SELECT snapshot FROM invoice_adjustments WHERE sale_id=? AND kind='credit' AND status='issued'" . ($lock ? ' FOR UPDATE' : ''));
    $q->execute([$row['sale_id']]);
    foreach ($q->fetchAll() as $prior) {
        $past = json_decode($prior['snapshot'], true);
        $priorCredits['cgst'] = ($priorCredits['cgst'] ?? 0) + (int) round((float) ($past['calculation']['cgst'] ?? 0) * 100);
        $priorCredits['sgst'] = ($priorCredits['sgst'] ?? 0) + (int) round((float) ($past['calculation']['sgst'] ?? 0) * 100);
        foreach ($past['calculation']['items'] ?? [] as $item) {
            $index = (int) $item['lineIndex'];
            $priorCredits[$index]['gross'] = ($priorCredits[$index]['gross'] ?? 0) + (int) $item['grossPaise'];
            $priorCredits[$index]['tax'] = ($priorCredits[$index]['tax'] ?? 0) + (int) $item['taxPaise'];
        }
    }
    return invoice_adjustment_calculation($lines, $original['calculation']['items'], $original['calculation'], $priorCredits, $row['kind'], $original['settings'], $original['customer']);
}

function preview_invoice_adjustment(array $input): array
{
    $id = (int) ($input['id'] ?? 0);
    $q = db()->prepare('SELECT * FROM invoice_adjustments WHERE id=?'); $q->execute([$id]); $row = $q->fetch();
    if (!$row || $row['status'] !== 'draft') json_error('Save a draft note before previewing it.', 409);
    $q = db()->prepare('SELECT snapshot, status FROM invoice_sales WHERE id=?'); $q->execute([$row['sale_id']]); $sale = $q->fetch();
    if (!$sale || $sale['status'] !== 'issued') json_error('Original invoice is unavailable.', 409);
    $original = json_decode($sale['snapshot'], true);
    if (!is_array($original)) json_error('Original invoice snapshot is missing.', 500);
    return ['calculation' => invoice_adjustment_preview_calculation(db(), $row, $original)];
}

function invoice_adjustment_pdf_bytes(array $snapshot, string $signatureData): string
{
    require_once __DIR__ . '/dompdf/autoload.inc.php';
    $e = 'invoice_html_escape'; $s = $snapshot['settings']; $c = $snapshot['customer']; $calc = $snapshot['calculation'];
    $title = ($s['gstStatus'] === 'registered' ? '' : 'Commercial ') . ($snapshot['kind'] === 'credit' ? 'Credit Note' : 'Debit Note');
    $html = '<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:DejaVu Sans,sans-serif;color:#202020;font-size:10px}h1{font-size:22px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f1eb}.block{margin-top:16px;line-height:1.6}</style></head><body>';
    $html .= '<h1>' . $title . '</h1><p>Document no. ' . $e($snapshot['number']) . ' · Date ' . $e($snapshot['issuedOn']) . '<br>Original invoice ' . $e($snapshot['invoiceNumber']) . ' dated ' . $e($snapshot['invoiceDate']) . '</p>';
    $html .= '<div class="block"><strong>Supplier</strong><br>' . $e($s['legalName']) . '<br>' . nl2br($e($s['address'])) . '<br>' . $e($s['stateName']) . ' (' . $e($s['stateCode']) . ')' . ($s['gstin'] ? '<br>GSTIN: ' . $e($s['gstin']) : '<br>GST not charged') . '</div>';
    $html .= '<div class="block"><strong>Recipient</strong><br>' . $e($c['name']) . '<br>' . nl2br($e($c['address'])) . '<br>' . $e($c['stateName']) . ' (' . $e($c['stateCode']) . ')' . ($c['gstin'] ? '<br>GSTIN: ' . $e($c['gstin']) : '') . '<br>Delivery address: ' . nl2br($e($c['deliveryAddress'] ?: $c['address'])) . '</div>';
    $html .= '<p class="block"><strong>Reason:</strong> ' . nl2br($e($snapshot['reason'])) . '</p><table><thead><tr><th>Original line / service</th><th>SAC</th><th>Taxable value</th><th>GST rate / tax</th><th>Adjustment</th></tr></thead><tbody>';
    foreach ($calc['items'] as $item) $html .= '<tr><td>' . $e($item['lineIndex'] + 1) . ' · ' . $e($item['description']) . '</td><td>' . $e($item['serviceCode']) . '</td><td>₹' . $e($item['net']) . '</td><td>' . $e($item['rate']) . '% / ₹' . $e($item['tax']) . '</td><td>₹' . $e($item['gross']) . '</td></tr>';
    $html .= '</tbody></table><table><tr><td>Taxable value</td><td>₹' . $e($calc['net']) . '</td></tr><tr><td>CGST</td><td>₹' . $e($calc['cgst']) . '</td></tr><tr><td>SGST</td><td>₹' . $e($calc['sgst']) . '</td></tr><tr><td>IGST</td><td>₹' . $e($calc['igst']) . '</td></tr><tr><th>Total ' . strtolower($title) . '</th><th>₹' . $e($calc['total']) . '</th></tr></table>';
    if ($snapshot['kind'] === 'credit') $html .= '<p class="block">This note records a reduction of the invoiced amount. It is not proof that a refund has been paid.</p>';
    $html .= '<div class="block"><img src="' . $e($signatureData) . '" alt="Authorized signature" style="max-height:65px;max-width:220px"><br>Authorized signatory: ' . $e($s['authorizedSignatory']) . '</div></body></html>';
    $options = new Dompdf\Options(); $options->set('isRemoteEnabled', false); $options->set('defaultFont', 'DejaVu Sans');
    $pdf = new Dompdf\Dompdf($options); $pdf->loadHtml($html, 'UTF-8'); $pdf->setPaper('A4'); $pdf->render();
    return $pdf->output();
}

function issue_invoice_adjustment(array $admin, array $input): array
{
    if (($input['detailsConfirmed'] ?? false) !== true || ($input['accountantReviewConfirmed'] ?? false) !== true) json_error('Confirm the changed amount and accountant review before issuing.');
    $id = (int) ($input['id'] ?? 0); $pdo = db(); $pdfPath = '';
    $pdo->beginTransaction();
    try {
        $q = $pdo->prepare('SELECT sale_id FROM invoice_adjustments WHERE id=?'); $q->execute([$id]); $saleId = (int) $q->fetchColumn();
        $q = $pdo->prepare('SELECT * FROM invoice_sales WHERE id=? FOR UPDATE'); $q->execute([$saleId]); $sale = $q->fetch();
        if (!$sale || $sale['status'] !== 'issued') json_error('Original invoice is unavailable.', 409);
        $q = $pdo->prepare('SELECT * FROM invoice_adjustments WHERE id=? FOR UPDATE'); $q->execute([$id]); $row = $q->fetch();
        if (!$row || (int) $row['sale_id'] !== $saleId || $row['status'] !== 'draft') json_error('Only a draft credit or debit note can be issued.', 409);
        if (trim($row['review_reference']) === '') json_error('Record the accountant review reference for this note before issuing.', 409);
        $q = $pdo->query('SELECT adjustments_approved_at FROM billing_settings WHERE id=1 FOR UPDATE');
        if (!$q->fetchColumn()) json_error('Credit and debit notes are locked until the accountant approves the adjustment workflow.', 409);
        $original = json_decode($sale['snapshot'], true);
        if (!is_array($original)) json_error('Original invoice snapshot is missing.', 500);
        $settings = invoice_settings();
        if ($original['customer']['gstin'] !== '' && $settings['eInvoiceStatus'] !== 'not_applicable') json_error('B2B note issuance is blocked because GST e-invoicing may apply. An IRP integration is required when applicable.', 409);
        $calc = invoice_adjustment_preview_calculation($pdo, $row, $original, true);
        $number = invoice_adjustment_next_no($pdo, $row['kind']);
        $snapshot = ['kind' => $row['kind'], 'number' => $number, 'issuedOn' => (new DateTimeImmutable('now', new DateTimeZone(STUDIO_TIMEZONE)))->format('Y-m-d'),
            'invoiceNumber' => $original['number'], 'invoiceDate' => $original['issuedOn'], 'issuedBy' => $admin['email'],
            'settings' => $original['settings'], 'customer' => $original['customer'], 'reason' => $row['reason'],
            'accountantReviewReference' => $row['review_reference'], 'calculation' => $calc];
        $bytes = invoice_adjustment_pdf_bytes($snapshot, $settings['signatureData']);
        $dir = dirname(__DIR__) . '/private/invoices';
        if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) throw new RuntimeException('Could not create private invoice storage.');
        $pdfPath = $dir . '/note-' . $id . '-' . bin2hex(random_bytes(12)) . '.pdf';
        if (file_put_contents($pdfPath, $bytes, LOCK_EX) !== strlen($bytes)) throw new RuntimeException('Could not store note PDF.');
        chmod($pdfPath, 0600);
        $pdo->prepare("UPDATE invoice_adjustments SET status='issued', number=?, issued_at=?, issued_by=?, snapshot=?, pdf_path=?, updated_at=?, updated_by=? WHERE id=?")
            ->execute([$number, now_utc(), $admin['email'], json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $pdfPath, now_utc(), $admin['email'], $id]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if ($pdfPath !== '' && is_file($pdfPath)) unlink($pdfPath);
        throw $e;
    }
    if ($sale['customer_email'] !== '') send_invoice_adjustment($admin, ['id' => $id]);
    return ['adjustment' => invoice_adjustment_row($id), 'sale' => invoice_sale((int) $row['sale_id'])];
}

function invoice_adjustment_pdf(array $input): array
{
    $id = (int) ($input['id'] ?? 0); $note = invoice_adjustment_row($id);
    if ($note['status'] !== 'issued') json_error('Issue the note before downloading it.', 409);
    $q = db()->prepare('SELECT pdf_path FROM invoice_adjustments WHERE id=?'); $q->execute([$id]); $path = (string) $q->fetchColumn();
    if (!is_file($path)) json_error('Stored note PDF is missing.', 500);
    return ['filename' => str_replace('/', '-', $note['number']) . '.pdf', 'base64' => base64_encode(file_get_contents($path))];
}

function send_invoice_adjustment(array $admin, array $input): array
{
    $id = (int) ($input['id'] ?? 0); $note = invoice_adjustment_row($id);
    if ($note['status'] !== 'issued') json_error('Issue the note first.', 409);
    $sale = invoice_sale($note['saleId']);
    if ($sale['customerEmail'] === '') json_error('Add a customer delivery email before sending.', 409);
    $q = db()->prepare('SELECT pdf_path FROM invoice_adjustments WHERE id=?'); $q->execute([$id]); $path = (string) $q->fetchColumn();
    if (!is_file($path)) json_error('Stored note PDF is missing.', 500);
    $result = send_invoice_attachment($sale['customerEmail'], $sale['customerName'], $note['number'], $path, $note['kind'] === 'credit' ? 'credit note' : 'debit note');
    db()->prepare('UPDATE invoice_adjustments SET email_status=?, emailed_at=?, email_error=? WHERE id=?')
        ->execute([$result['sent'] ? 'sent' : 'failed', $result['sent'] ? now_utc() : null, $result['error'], $id]);
    return ['adjustment' => invoice_adjustment_row($id), 'sale' => invoice_sale($note['saleId']), 'emailSent' => $result['sent']];
}

function record_invoice_refund(array $admin, array $input): array
{
    if (($input['payoutConfirmed'] ?? false) !== true) json_error('Confirm that the refund was actually paid to the customer.');
    $id = (int) ($input['id'] ?? 0); $amount = parse_amount($input['amount'] ?? null);
    $day = (string) ($input['refundedOn'] ?? ''); $parsedDay = DateTimeImmutable::createFromFormat('!Y-m-d', $day, new DateTimeZone(STUDIO_TIMEZONE));
    $mode = (string) ($input['mode'] ?? ''); $reference = clean_text($input['reference'] ?? '', 120);
    if ($amount === null || $amount <= 0 || !$parsedDay || $parsedDay->format('Y-m-d') !== $day || $parsedDay > new DateTimeImmutable('today', new DateTimeZone(STUDIO_TIMEZONE)) || !isset(PAYMENT_MODES[$mode]) || $reference === '') json_error('Enter the paid refund amount, date, mode, and transaction reference.');
    $pdo = db(); $pdo->beginTransaction();
    try {
        $q = $pdo->prepare('SELECT * FROM invoice_adjustments WHERE id=? FOR UPDATE'); $q->execute([$id]); $row = $q->fetch();
        if (!$row || $row['kind'] !== 'credit' || $row['status'] !== 'issued') json_error('Record refunds against an issued credit note.', 409);
        $snapshot = json_decode($row['snapshot'], true);
        $q = $pdo->prepare('SELECT snapshot FROM invoice_sales WHERE id=?'); $q->execute([$row['sale_id']]);
        $original = json_decode((string) $q->fetchColumn(), true);
        $originalModes = array_values(array_unique(array_filter(array_column($original['payments'] ?? [], 'mode'))));
        if (!in_array($mode, $originalModes, true)) json_error('The refund mode must match a payment method used on the original invoice, as stated in the refund policy.', 409);
        $q = $pdo->prepare('SELECT COALESCE(SUM(amount),0) FROM invoice_refunds WHERE adjustment_id=?'); $q->execute([$id]);
        $already = (int) round((float) $q->fetchColumn() * 100);
        if ($already + (int) round($amount * 100) > (int) round((float) $snapshot['calculation']['total'] * 100)) json_error('Recorded refunds cannot exceed the credit note total.', 409);
        $key = hash('sha256', strtolower($mode . '|' . $reference));
        $pdo->prepare('INSERT INTO invoice_refunds (adjustment_id, amount, refunded_on, mode, reference, reference_key, created_at, created_by) VALUES (?,?,?,?,?,?,?,?)')
            ->execute([$id, $amount, $day, $mode, $reference, $key, now_utc(), $admin['email']]);
        $pdo->commit();
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
    return ['adjustment' => invoice_adjustment_row($id), 'sale' => invoice_sale((int) $row['sale_id'])];
}

function record_invoice_adjustment_collection(array $admin, array $input): array
{
    if (($input['paymentConfirmed'] ?? false) !== true) json_error('Confirm that this additional payment was received and verified.');
    $id = (int) ($input['id'] ?? 0); $amount = parse_amount($input['amount'] ?? null);
    $day = (string) ($input['receivedOn'] ?? ''); $parsedDay = DateTimeImmutable::createFromFormat('!Y-m-d', $day, new DateTimeZone(STUDIO_TIMEZONE));
    $mode = (string) ($input['mode'] ?? ''); $reference = clean_text($input['reference'] ?? '', 120);
    if ($amount === null || $amount <= 0 || !$parsedDay || $parsedDay->format('Y-m-d') !== $day || $parsedDay > new DateTimeImmutable('today', new DateTimeZone(STUDIO_TIMEZONE)) || !isset(PAYMENT_MODES[$mode]) || $reference === '') json_error('Enter the received amount, date, mode, and transaction reference.');
    $pdo = db(); $pdo->beginTransaction();
    try {
        $q = $pdo->prepare('SELECT * FROM invoice_adjustments WHERE id=? FOR UPDATE'); $q->execute([$id]); $row = $q->fetch();
        if (!$row || $row['kind'] !== 'debit' || $row['status'] !== 'issued') json_error('Record additional payments against an issued debit note.', 409);
        $snapshot = json_decode($row['snapshot'], true);
        $q = $pdo->prepare('SELECT COALESCE(SUM(amount),0) FROM invoice_adjustment_collections WHERE adjustment_id=?'); $q->execute([$id]);
        $already = (int) round((float) $q->fetchColumn() * 100);
        if ($already + (int) round($amount * 100) > (int) round((float) $snapshot['calculation']['total'] * 100)) json_error('Additional payments cannot exceed the debit note total.', 409);
        $key = hash('sha256', strtolower($mode . '|' . $reference));
        $check = $pdo->prepare('SELECT id FROM invoice_source_links WHERE manual_key=? LIMIT 1'); $check->execute([$key]);
        if ($check->fetchColumn()) json_error('This payment reference was already used on a sale.', 409);
        $pdo->prepare('INSERT INTO invoice_adjustment_collections (adjustment_id, amount, received_on, mode, reference, reference_key, created_at, created_by) VALUES (?,?,?,?,?,?,?,?)')
            ->execute([$id, $amount, $day, $mode, $reference, $key, now_utc(), $admin['email']]);
        $pdo->commit();
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
    return ['adjustment' => invoice_adjustment_row($id), 'sale' => invoice_sale((int) $row['sale_id'])];
}
