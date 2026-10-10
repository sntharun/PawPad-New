<?php
/**
 * Pawpad API — https://api.pawpad.in/index.php?action=<name>
 *
 * Public:  health (GET), get_content (GET or POST), submit_application,
 *          booking_availability (GET or POST), create_booking, boarding_availability, create_boarding_request
 * Staff (Owner, Administrator and Manager):
 *          login, logout, me, change_password,
 *          list_bookings, list_upcoming_bookings, cancel_booking, reschedule_booking,
 *          list_applications, update_application (Manager: interviews, notes, enrol only),
 *          record_payment, closing_day, save_closing, add_walkin, preview_report, send_report,
 *          list_boarding_requests, update_boarding_request
 * Owner and Administrator only:
 *          cleanup_calendar, block_slot, unblock_slot,
 *          closure_preview, create_closure, list_closures, delete_closure,
 *          delete_applications, delete_payment, list_daily_reports, get_daily_report,
 *          save_content, upload_file, list_uploads, delete_upload, convert_uploads,
 *          list_admins, add_admin, remove_admin (owner only: add/remove)
 * Staff actions need the X-Pawpad-Token header returned by "login". The role
 * is checked here on the server, so a hidden button can't be worked around.
 */

declare(strict_types=1);

define('PAWPAD_API', true);

require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/schema.php';
require __DIR__ . '/lib/auth.php';
require __DIR__ . '/lib/admins.php';
require __DIR__ . '/lib/applications.php';
require __DIR__ . '/lib/content.php';
require __DIR__ . '/lib/uploads.php';
require __DIR__ . '/lib/mailer.php';
require __DIR__ . '/lib/caldav.php';
require __DIR__ . '/lib/bookings.php';
require __DIR__ . '/lib/closures.php';
require __DIR__ . '/lib/closing.php';
require __DIR__ . '/lib/boarding.php';

apply_security_headers();
apply_cors();

$action = (string) ($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    ensure_schema(db());
} catch (PDOException $e) {
    error_log('Pawpad API schema update failed: ' . $e->getMessage());
    json_error('The database could not be prepared. Check the db_* settings in config.php.', 500);
}

if ($action === 'health') {
    send_json([
        'ok' => true,
        'database' => true,
        'email' => mail_configured(),
        'bookingEmail' => mail_configured('info'),
        'calendar' => caldav_configured(),
    ]);
}
// Public reads may use a plain GET (no CORS preflight for visitors).
$publicGet = ['get_content', 'booking_availability'];
if ($method !== 'POST' && !($method === 'GET' && in_array($action, $publicGet, true))) {
    json_error('Use POST.', 405);
}

// Uploads carry a whole file, so they may be bigger than other requests.
$input = $method === 'POST' ? request_json($action === 'upload_file' ? 8000000 : 200000) : [];

try {
    switch ($action) {
        // --- Public -------------------------------------------------------
        case 'get_content':
            send_json(['ok' => true] + get_content());
            break;
        case 'submit_application':
            send_json(['ok' => true] + submit_application($input), 201);
            break;
        case 'booking_availability':
            send_json(['ok' => true] + booking_availability());
            break;
        case 'create_booking':
            send_json(['ok' => true] + create_booking($input), 201);
            break;
        case 'boarding_availability':
            send_json(['ok' => true] + boarding_availability());
            break;
        case 'create_boarding_request':
            send_json(['ok' => true] + create_boarding_request($input), 201);
            break;
        case 'login':
            send_json(['ok' => true] + login($input));
            break;
        case 'logout':
            send_json(['ok' => true] + logout());
            break;

        // --- Every signed-in person (Owner, Administrator, Manager) -------
        case 'me':
            send_json(['ok' => true, 'user' => public_user(require_role(STAFF_ROLES))]);
            break;
        case 'change_password':
            send_json(['ok' => true] + change_password(require_role(STAFF_ROLES), $input));
            break;
        case 'list_applications':
            require_role(STAFF_ROLES);
            send_json(['ok' => true] + list_applications());
            break;
        case 'update_application':
            send_json(['ok' => true] + update_application(require_role(STAFF_ROLES), $input));
            break;
        case 'record_payment':
            send_json(['ok' => true] + record_payment(require_role(STAFF_ROLES), $input));
            break;
        case 'list_bookings':
            require_role(STAFF_ROLES);
            send_json(['ok' => true] + list_bookings($input));
            break;
        case 'list_upcoming_bookings':
            require_role(STAFF_ROLES);
            send_json(['ok' => true] + list_upcoming_bookings());
            break;
        case 'reschedule_booking':
            send_json(['ok' => true] + reschedule_booking(require_role(STAFF_ROLES), $input));
            break;
        case 'cancel_booking':
            send_json(['ok' => true] + cancel_booking(require_role(STAFF_ROLES), $input));
            break;
        case 'list_boarding_requests':
            require_role(STAFF_ROLES);
            send_json(['ok' => true] + list_boarding_requests());
            break;
        case 'update_boarding_request':
            send_json(['ok' => true] + update_boarding_request(require_role(STAFF_ROLES), $input));
            break;
        case 'closing_day':
            require_role(STAFF_ROLES);
            send_json(['ok' => true] + closing_day($input));
            break;
        case 'save_closing':
            send_json(['ok' => true] + save_closing(require_role(STAFF_ROLES), $input));
            break;
        case 'add_walkin':
            send_json(['ok' => true] + add_walkin(require_role(STAFF_ROLES), $input), 201);
            break;
        case 'preview_report':
            send_json(['ok' => true] + preview_report(require_role(STAFF_ROLES), $input));
            break;
        case 'send_report':
            send_json(['ok' => true] + send_report(require_role(STAFF_ROLES), $input));
            break;

        // --- Owner and Administrator only ---------------------------------
        case 'delete_applications':
            require_role(ADMIN_ROLES);
            send_json(['ok' => true] + delete_applications($input));
            break;
        case 'delete_payment':
            send_json(['ok' => true] + delete_payment(require_role(ADMIN_ROLES), $input));
            break;
        case 'cleanup_calendar':
            require_role(ADMIN_ROLES);
            send_json(['ok' => true] + cleanup_calendar());
            break;
        case 'block_slot':
            send_json(['ok' => true] + block_slot(require_role(ADMIN_ROLES), $input));
            break;
        case 'unblock_slot':
            require_role(ADMIN_ROLES);
            send_json(['ok' => true] + unblock_slot($input));
            break;
        case 'closure_preview':
            require_role(ADMIN_ROLES);
            send_json(['ok' => true] + closure_preview($input));
            break;
        case 'create_closure':
            send_json(['ok' => true] + create_closure(require_role(ADMIN_ROLES), $input), 201);
            break;
        case 'list_closures':
            require_role(ADMIN_ROLES);
            send_json(['ok' => true] + list_closures());
            break;
        case 'delete_closure':
            require_role(ADMIN_ROLES);
            send_json(['ok' => true] + delete_closure($input));
            break;
        case 'list_daily_reports':
            require_role(ADMIN_ROLES);
            send_json(['ok' => true] + list_daily_reports());
            break;
        case 'get_daily_report':
            require_role(ADMIN_ROLES);
            send_json(['ok' => true] + get_daily_report($input));
            break;
        case 'save_content':
            send_json(['ok' => true] + save_content(require_role(ADMIN_ROLES), $input));
            break;
        case 'upload_file':
            send_json(['ok' => true] + upload_file(require_role(ADMIN_ROLES), $input), 201);
            break;
        case 'list_uploads':
            require_role(ADMIN_ROLES);
            send_json(['ok' => true] + list_uploads($input));
            break;
        case 'convert_uploads':
            require_role(ADMIN_ROLES);
            send_json(['ok' => true] + convert_existing_uploads());
            break;
        case 'delete_upload':
            require_role(ADMIN_ROLES);
            send_json(['ok' => true] + delete_upload($input));
            break;
        case 'list_admins':
            require_role(ADMIN_ROLES);
            send_json(['ok' => true] + list_admins());
            break;
        case 'add_admin':
            send_json(['ok' => true] + add_admin(require_role(ADMIN_ROLES), $input));
            break;
        case 'remove_admin':
            send_json(['ok' => true] + remove_admin(require_role(ADMIN_ROLES), $input));
            break;
        default:
            json_error('Unknown action.', 404);
    }
} catch (Throwable $e) {
    error_log('Pawpad API error in ' . $action . ': ' . $e->getMessage());
    json_error('Something went wrong on the server.', 500);
}
