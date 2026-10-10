<?php
/**
 * Database tables. setup.php runs this; every statement is safe to run again.
 */

declare(strict_types=1);

if (!defined('PAWPAD_API')) {
    http_response_code(404);
    exit;
}

// Raise this whenever create_tables() gains a table, so servers add it on the next request.
const SCHEMA_VERSION = 8;

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
    $pdo->prepare('INSERT INTO schema_info (id, version) VALUES (1, ?) ON DUPLICATE KEY UPDATE version = VALUES(version)')
        ->execute([SCHEMA_VERSION]);
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
