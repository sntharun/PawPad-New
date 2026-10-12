<?php
/**
 * Database tables. setup.php runs this; every statement is safe to run again.
 */

declare(strict_types=1);

if (!defined('PAWPAD_API')) {
    http_response_code(404);
    exit;
}

// Raise this when tables, columns, or one-time data migrations change.
const SCHEMA_VERSION = 16;

/**
 * Creates any missing tables after an update, without needing setup.php again.
 */
function ensure_schema(PDO $pdo): void
{
    try {
        $current = (int) $pdo->query('SELECT version FROM schema_info WHERE id = 1')->fetchColumn();
    } catch (PDOException $e) {
        $current = 0;
    }
    if ($current >= SCHEMA_VERSION) {
        return;
    }
    create_tables($pdo);
    // Columns added after the tables first went live.
    add_column_if_missing($pdo, 'bookings', 'admin_log', "MEDIUMTEXT NULL");
    add_column_if_missing($pdo, 'slot_blocks', 'calendar_href', "VARCHAR(500) NOT NULL DEFAULT ''");
    add_column_if_missing($pdo, 'bookings', 'price', "DECIMAL(10,2) NULL");
    add_column_if_missing($pdo, 'applications', 'enrolled_at', "DATETIME NULL");
    add_column_if_missing($pdo, 'bookings', 'source', "VARCHAR(20) NOT NULL DEFAULT 'website'");
    add_column_if_missing($pdo, 'boarding_requests', 'stay_end', "VARCHAR(40) NOT NULL DEFAULT ''");
    add_column_if_missing($pdo, 'boarding_requests', 'nights', "SMALLINT UNSIGNED NOT NULL DEFAULT 0");
    add_column_if_missing($pdo, 'boarding_requests', 'check_in', "DATE NULL");
    add_column_if_missing($pdo, 'boarding_requests', 'check_out', "DATE NULL");
    add_column_if_missing($pdo, 'boarding_requests', 'dogs', "SMALLINT UNSIGNED NOT NULL DEFAULT 0");
    add_column_if_missing($pdo, 'billing_settings', 'accountant_name', "VARCHAR(190) NOT NULL DEFAULT ''");
    add_column_if_missing($pdo, 'billing_settings', 'accountant_reference', "VARCHAR(255) NOT NULL DEFAULT ''");
    add_column_if_missing($pdo, 'billing_settings', 'state_name', "VARCHAR(100) NOT NULL DEFAULT ''");
    add_column_if_missing($pdo, 'billing_settings', 'authorized_signatory', "VARCHAR(190) NOT NULL DEFAULT ''");
    add_column_if_missing($pdo, 'billing_settings', 'signature_data', "MEDIUMTEXT NULL");
    add_column_if_missing($pdo, 'billing_settings', 'adjustments_approved_at', "DATETIME NULL");
    add_column_if_missing($pdo, 'billing_settings', 'einvoice_status', "VARCHAR(20) NOT NULL DEFAULT 'unknown'");
    add_column_if_missing($pdo, 'invoice_sales', 'customer_state_name', "VARCHAR(100) NOT NULL DEFAULT ''");
    add_column_if_missing($pdo, 'invoice_sales', 'delivery_address', "TEXT NULL");
    add_column_if_missing($pdo, 'invoice_source_links', 'manual_key', "CHAR(64) NULL UNIQUE");
    if ($current < 16) {
        seed_sample_blog_posts($pdo);
    }
    $pdo->prepare('INSERT INTO schema_info (id, version) VALUES (1, ?) ON DUPLICATE KEY UPDATE version = VALUES(version)')
        ->execute([SCHEMA_VERSION]);
}

/** Publish the launch articles once, without changing any post already edited in Admin. */
function seed_sample_blog_posts(PDO $pdo): void
{
    $source = file_get_contents(__DIR__ . '/sample-blog-posts.json');
    if ($source === false) {
        throw new RuntimeException('The sample blog posts file is missing.');
    }
    $posts = json_decode($source, true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($posts)) {
        throw new RuntimeException('The sample blog posts file is invalid.');
    }
    $insert = $pdo->prepare("INSERT INTO blog_posts
        (slug, status, title, summary, cover_url, cover_alt, cover_caption, sections,
         author, seo_title, seo_description, keywords, published_at, updated_at, updated_by)
        VALUES (?, 'published', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE id = id");
    foreach ($posts as $post) {
        $now = now_utc();
        $insert->execute([
            $post['slug'], $post['title'], $post['summary'], $post['coverUrl'],
            $post['coverAlt'], $post['coverCaption'],
            json_encode($post['sections'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
            $post['author'], $post['seoTitle'], $post['seoDescription'], $post['keywords'],
            $now, $now, 'phase2-sample-seed',
        ]);
    }
}

function add_column_if_missing(PDO $pdo, string $table, string $column, string $definition): void
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?');
    $stmt->execute([$table, $column]);
    if ((int) $stmt->fetchColumn() === 0) {
        $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
    }
}

function create_tables(PDO $pdo): void
{
    $opts = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

    $pdo->exec("CREATE TABLE IF NOT EXISTS schema_info (
        id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
        version INT UNSIGNED NOT NULL
    ) $opts");

    $pdo->exec("CREATE TABLE IF NOT EXISTS admin_users (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(190) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'admin',
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
    ) $opts");

    $pdo->exec("CREATE TABLE IF NOT EXISTS admin_sessions (
        token_hash CHAR(64) NOT NULL PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL,
        expires_at DATETIME NOT NULL,
        INDEX idx_sessions_user (user_id),
        INDEX idx_sessions_expiry (expires_at)
    ) $opts");

    $pdo->exec("CREATE TABLE IF NOT EXISTS course_sequences (
        prefix VARCHAR(20) NOT NULL PRIMARY KEY,
        last_number INT UNSIGNED NOT NULL DEFAULT 0
    ) $opts");

    $pdo->exec("CREATE TABLE IF NOT EXISTS applications (
        id VARCHAR(40) NOT NULL PRIMARY KEY,
        course_key VARCHAR(60) NOT NULL DEFAULT '',
        course_code VARCHAR(20) NOT NULL DEFAULT '',
        course_name VARCHAR(255) NOT NULL DEFAULT '',
        course_fee VARCHAR(60) NOT NULL DEFAULT '',
        status VARCHAR(30) NOT NULL DEFAULT 'pending_review',
        interview_date VARCHAR(40) NOT NULL DEFAULT '',
        applicant_name VARCHAR(255) NOT NULL DEFAULT '',
        applicant_phone VARCHAR(60) NOT NULL DEFAULT '',
        applicant_email VARCHAR(255) NOT NULL DEFAULT '',
        applicant_city VARCHAR(120) NOT NULL DEFAULT '',
        responses MEDIUMTEXT NOT NULL,
        acknowledgments TEXT NOT NULL,
        staff_notes MEDIUMTEXT NOT NULL,
        communications MEDIUMTEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        INDEX idx_applications_created (created_at),
        INDEX idx_applications_status (status)
    ) $opts");

    // Website content published from the admin panel: one row per page (home, grooming, ...).
    $pdo->exec("CREATE TABLE IF NOT EXISTS site_content (
        page_key VARCHAR(40) NOT NULL PRIMARY KEY,
        data MEDIUMTEXT NOT NULL,
        updated_at DATETIME NOT NULL,
        updated_by VARCHAR(190) NOT NULL DEFAULT ''
    ) $opts");

    // Posts are separate from site_content so public pages do not download every article.
    $pdo->exec("CREATE TABLE IF NOT EXISTS blog_posts (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(120) NOT NULL UNIQUE,
        status VARCHAR(12) NOT NULL DEFAULT 'draft',
        title VARCHAR(200) NOT NULL,
        summary TEXT NOT NULL,
        cover_url VARCHAR(500) NOT NULL DEFAULT '',
        cover_alt VARCHAR(250) NOT NULL DEFAULT '',
        cover_caption VARCHAR(250) NOT NULL DEFAULT '',
        sections MEDIUMTEXT NOT NULL,
        author VARCHAR(160) NOT NULL DEFAULT '',
        seo_title VARCHAR(200) NOT NULL DEFAULT '',
        seo_description VARCHAR(320) NOT NULL DEFAULT '',
        keywords TEXT NOT NULL,
        published_at DATETIME NULL,
        updated_at DATETIME NOT NULL,
        updated_by VARCHAR(190) NOT NULL DEFAULT '',
        INDEX idx_blog_public (status, published_at)
    ) $opts");

    // Images and PDFs uploaded from the admin panel (files live in uploads/).
    $pdo->exec("CREATE TABLE IF NOT EXISTS uploads (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        kind VARCHAR(10) NOT NULL,
        path VARCHAR(255) NOT NULL UNIQUE,
        original_name VARCHAR(255) NOT NULL DEFAULT '',
        bytes INT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL,
        created_by VARCHAR(190) NOT NULL DEFAULT ''
    ) $opts");

    // Grooming bookings. One row per pet; several pets in one order share a ref.
    $pdo->exec("CREATE TABLE IF NOT EXISTS bookings (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ref VARCHAR(20) NOT NULL,
        slot_date DATE NOT NULL,
        slot_time CHAR(5) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'booked',
        service_id VARCHAR(60) NOT NULL DEFAULT '',
        service_title VARCHAR(255) NOT NULL DEFAULT '',
        pet MEDIUMTEXT NOT NULL,
        customer_name VARCHAR(255) NOT NULL DEFAULT '',
        customer_email VARCHAR(255) NOT NULL DEFAULT '',
        customer_phone VARCHAR(60) NOT NULL DEFAULT '',
        customer_area VARCHAR(255) NOT NULL DEFAULT '',
        contact_method VARCHAR(30) NOT NULL DEFAULT '',
        notes TEXT NOT NULL,
        calendar_href VARCHAR(500) NOT NULL DEFAULT '',
        calendar_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        email_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL,
        cancelled_at DATETIME NULL,
        cancelled_by VARCHAR(190) NOT NULL DEFAULT '',
        INDEX idx_bookings_slot (slot_date, slot_time),
        INDEX idx_bookings_ref (ref)
    ) $opts");

    // The unique (date, start time) rule: a slot can only ever have one row here,
    // so two people can never book the same start time, even at the same moment.
    $pdo->exec("CREATE TABLE IF NOT EXISTS slot_locks (
        slot_date DATE NOT NULL,
        slot_time CHAR(5) NOT NULL,
        booking_id INT UNSIGNED NOT NULL,
        PRIMARY KEY (slot_date, slot_time)
    ) $opts");

    // Slots or whole days blocked by an admin (slot_time '' = the whole day).
    $pdo->exec("CREATE TABLE IF NOT EXISTS slot_blocks (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        slot_date DATE NOT NULL,
        slot_time CHAR(5) NOT NULL DEFAULT '',
        reason VARCHAR(255) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL,
        created_by VARCHAR(190) NOT NULL DEFAULT '',
        UNIQUE KEY uniq_block (slot_date, slot_time)
    ) $opts");

    // Short-lived copy of the calendar's busy times, so every visitor doesn't query the calendar.
    $pdo->exec("CREATE TABLE IF NOT EXISTS calendar_cache (
        cache_key VARCHAR(64) NOT NULL PRIMARY KEY,
        fetched_at INT UNSIGNED NOT NULL,
        data MEDIUMTEXT NOT NULL
    ) $opts");

    // Course fee payments recorded by staff (an application can have several).
    $pdo->exec("CREATE TABLE IF NOT EXISTS course_payments (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        application_id VARCHAR(40) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        paid_on DATE NOT NULL,
        mode VARCHAR(20) NOT NULL,
        reference VARCHAR(120) NOT NULL DEFAULT '',
        recorded_by VARCHAR(190) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL,
        INDEX idx_payments_application (application_id),
        INDEX idx_payments_day (paid_on)
    ) $opts");

    // Invoices are issued only after billing settings have accountant approval.
    $pdo->exec("CREATE TABLE IF NOT EXISTS billing_settings (
        id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
        legal_name VARCHAR(255) NOT NULL DEFAULT '',
        address TEXT NOT NULL,
        state_code CHAR(2) NOT NULL DEFAULT '',
        state_name VARCHAR(100) NOT NULL DEFAULT '',
        gst_status VARCHAR(20) NOT NULL DEFAULT 'unknown',
        einvoice_status VARCHAR(20) NOT NULL DEFAULT 'unknown',
        gstin VARCHAR(15) NOT NULL DEFAULT '',
        invoice_prefix VARCHAR(20) NOT NULL DEFAULT 'PP',
        service_codes MEDIUMTEXT NOT NULL,
        approved_at DATETIME NULL,
        approved_by VARCHAR(190) NOT NULL DEFAULT '',
        accountant_name VARCHAR(190) NOT NULL DEFAULT '',
        accountant_reference VARCHAR(255) NOT NULL DEFAULT '',
        authorized_signatory VARCHAR(190) NOT NULL DEFAULT '',
        signature_data MEDIUMTEXT NULL,
        adjustments_approved_at DATETIME NULL,
        updated_at DATETIME NOT NULL,
        updated_by VARCHAR(190) NOT NULL DEFAULT ''
    ) $opts");
    $pdo->exec("CREATE TABLE IF NOT EXISTS invoice_sales (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        status VARCHAR(12) NOT NULL DEFAULT 'draft',
        customer_name VARCHAR(255) NOT NULL DEFAULT '',
        customer_email VARCHAR(255) NOT NULL DEFAULT '',
        customer_address TEXT NOT NULL,
        customer_state_code CHAR(2) NOT NULL DEFAULT '',
        customer_state_name VARCHAR(100) NOT NULL DEFAULT '',
        delivery_address TEXT NULL,
        customer_gstin VARCHAR(15) NOT NULL DEFAULT '',
        items MEDIUMTEXT NOT NULL,
        notes TEXT NOT NULL,
        issued_no VARCHAR(60) NULL UNIQUE,
        issued_at DATETIME NULL,
        issued_by VARCHAR(190) NOT NULL DEFAULT '',
        pdf_path VARCHAR(500) NOT NULL DEFAULT '',
        snapshot MEDIUMTEXT NULL,
        email_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        emailed_at DATETIME NULL,
        email_error TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        created_by VARCHAR(190) NOT NULL DEFAULT '',
        updated_at DATETIME NOT NULL,
        updated_by VARCHAR(190) NOT NULL DEFAULT '',
        INDEX idx_invoice_status (status, created_at)
    ) $opts");
    $pdo->exec("CREATE TABLE IF NOT EXISTS invoice_source_links (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        sale_id INT UNSIGNED NOT NULL,
        kind VARCHAR(24) NOT NULL,
        source_id INT UNSIGNED NULL,
        amount DECIMAL(10,2) NULL,
        paid_on DATE NULL,
        mode VARCHAR(20) NOT NULL DEFAULT '',
        reference VARCHAR(120) NOT NULL DEFAULT '',
        manual_key CHAR(64) NULL UNIQUE,
        UNIQUE KEY uniq_invoice_source (kind, source_id),
        INDEX idx_invoice_sale (sale_id)
    ) $opts");
    $pdo->exec("CREATE TABLE IF NOT EXISTS invoice_sequences (
        financial_year CHAR(9) NOT NULL PRIMARY KEY,
        next_number INT UNSIGNED NOT NULL DEFAULT 1
    ) $opts");
    $pdo->exec("CREATE TABLE IF NOT EXISTS invoice_corrections (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        sale_id INT UNSIGNED NOT NULL,
        note TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        created_by VARCHAR(190) NOT NULL,
        INDEX idx_invoice_correction_sale (sale_id)
    ) $opts");
    $pdo->exec("CREATE TABLE IF NOT EXISTS invoice_adjustments (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        sale_id INT UNSIGNED NOT NULL,
        kind VARCHAR(6) NOT NULL,
        status VARCHAR(12) NOT NULL DEFAULT 'draft',
        reason VARCHAR(1000) NOT NULL,
        review_reference VARCHAR(255) NOT NULL DEFAULT '',
        line_items MEDIUMTEXT NOT NULL,
        number VARCHAR(16) NULL UNIQUE,
        issued_at DATETIME NULL,
        issued_by VARCHAR(190) NOT NULL DEFAULT '',
        snapshot MEDIUMTEXT NULL,
        pdf_path VARCHAR(500) NOT NULL DEFAULT '',
        email_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        emailed_at DATETIME NULL,
        email_error TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        created_by VARCHAR(190) NOT NULL,
        updated_at DATETIME NOT NULL,
        updated_by VARCHAR(190) NOT NULL,
        INDEX idx_adjustment_sale (sale_id, status)
    ) $opts");
    $pdo->exec("CREATE TABLE IF NOT EXISTS invoice_adjustment_sequences (
        kind VARCHAR(6) NOT NULL,
        financial_year CHAR(7) NOT NULL,
        next_number INT UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (kind, financial_year)
    ) $opts");
    $pdo->exec("CREATE TABLE IF NOT EXISTS invoice_refunds (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        adjustment_id INT UNSIGNED NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        refunded_on DATE NOT NULL,
        mode VARCHAR(20) NOT NULL,
        reference VARCHAR(120) NOT NULL,
        reference_key CHAR(64) NOT NULL UNIQUE,
        created_at DATETIME NOT NULL,
        created_by VARCHAR(190) NOT NULL,
        INDEX idx_refund_adjustment (adjustment_id)
    ) $opts");
    $pdo->exec("CREATE TABLE IF NOT EXISTS invoice_adjustment_collections (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        adjustment_id INT UNSIGNED NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        received_on DATE NOT NULL,
        mode VARCHAR(20) NOT NULL,
        reference VARCHAR(120) NOT NULL,
        reference_key CHAR(64) NOT NULL UNIQUE,
        created_at DATETIME NOT NULL,
        created_by VARCHAR(190) NOT NULL,
        INDEX idx_adjustment_collection (adjustment_id)
    ) $opts");

    // Studio closures: a date range, either all day or only some start times.
    $pdo->exec("CREATE TABLE IF NOT EXISTS closures (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        all_day TINYINT(1) NOT NULL DEFAULT 1,
        times VARCHAR(200) NOT NULL DEFAULT '[]',
        reason VARCHAR(255) NOT NULL DEFAULT '',
        calendar_hrefs TEXT NULL,
        created_by VARCHAR(190) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL,
        INDEX idx_closures_range (start_date, end_date)
    ) $opts");

    // The daily closing: what actually happened with each booking.
    $pdo->exec("CREATE TABLE IF NOT EXISTS booking_closing (
        booking_id INT UNSIGNED NOT NULL PRIMARY KEY,
        status VARCHAR(20) NOT NULL DEFAULT '',
        amount DECIMAL(10,2) NULL,
        mode VARCHAR(20) NOT NULL DEFAULT '',
        reference VARCHAR(120) NOT NULL DEFAULT '',
        note VARCHAR(500) NOT NULL DEFAULT '',
        updated_by VARCHAR(190) NOT NULL DEFAULT '',
        updated_at DATETIME NOT NULL
    ) $opts");

    // Every daily report that was emailed (a re-send is a new, corrected version).
    $pdo->exec("CREATE TABLE IF NOT EXISTS daily_reports (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        report_date DATE NOT NULL,
        version INT UNSIGNED NOT NULL DEFAULT 1,
        sent_at DATETIME NOT NULL,
        sent_by VARCHAR(190) NOT NULL DEFAULT '',
        recipients TEXT NOT NULL,
        subject VARCHAR(300) NOT NULL DEFAULT '',
        html MEDIUMTEXT NOT NULL,
        text_body MEDIUMTEXT NOT NULL,
        INDEX idx_reports_date (report_date)
    ) $opts");

    // Boarding requests from the website checkout (confirmed by the team, not instantly).
    $pdo->exec("CREATE TABLE IF NOT EXISTS boarding_requests (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ref VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'new',
        customer_name VARCHAR(255) NOT NULL DEFAULT '',
        customer_email VARCHAR(255) NOT NULL DEFAULT '',
        customer_phone VARCHAR(60) NOT NULL DEFAULT '',
        contact_method VARCHAR(30) NOT NULL DEFAULT '',
        stay_date VARCHAR(40) NOT NULL DEFAULT '',
        stay_time VARCHAR(40) NOT NULL DEFAULT '',
        stay_end VARCHAR(40) NOT NULL DEFAULT '',
        nights SMALLINT UNSIGNED NOT NULL DEFAULT 0,
        check_in DATE NULL,
        check_out DATE NULL,
        dogs SMALLINT UNSIGNED NOT NULL DEFAULT 0,
        pets MEDIUMTEXT NOT NULL,
        items MEDIUMTEXT NOT NULL,
        total VARCHAR(40) NOT NULL DEFAULT '',
        trial_fee VARCHAR(40) NOT NULL DEFAULT '',
        notes TEXT NOT NULL,
        admin_log MEDIUMTEXT NULL,
        email_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        INDEX idx_boarding_created (created_at),
        INDEX idx_boarding_status (status)
    ) $opts");

    $pdo->exec("CREATE TABLE IF NOT EXISTS rate_events (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        kind VARCHAR(20) NOT NULL,
        ip VARCHAR(64) NOT NULL,
        created_at DATETIME NOT NULL,
        INDEX idx_rate_lookup (kind, ip, created_at)
    ) $opts");
}
