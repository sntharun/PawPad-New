<?php
/**
 * Pawpad API settings — TEMPLATE.
 *
 * On the server, copy this file to "config.php" (same folder) and fill in the
 * values there using cPanel's File Manager editor. Never put real passwords in
 * this sample file, in GitHub, or in a chat message.
 */
return [
    // MySQL database (cPanel → "Manage My Databases" / "MySQL Database Wizard").
    // cPanel adds your account name as a prefix, e.g. "abcuser_pawpad".
    'db_host'     => 'localhost',
    'db_name'     => 'CPANELUSER_pawpad',
    'db_user'     => 'CPANELUSER_pawpadapi',
    'db_password' => '',

    // Outgoing email for candidate emails, sent from the courses@ mailbox.
    // cPanel → Email Accounts → courses@pawpad.in → "Connect Devices" shows these.
    'smtp_host'     => 'mail.pawpad.in',
    'smtp_port'     => 465,
    'smtp_secure'   => 'ssl',            // 'ssl' for port 465, 'tls' for port 587
    'smtp_user'     => 'courses@pawpad.in',
    'smtp_password' => '',
    'mail_from'      => 'courses@pawpad.in',
    'mail_from_name' => 'Pawpad Academy Admissions',
    // A copy of every candidate email is sent here so you keep a record.
    'mail_bcc'       => 'courses@pawpad.in',

    // Website addresses allowed to talk to this API.
    'allowed_origins' => [
        'https://pawpad.in',
        'https://www.pawpad.in',
        'https://pawpadpvtltd.github.io',
    ],

    // One-time setup key for setup.php (creates / resets an admin login).
    // Type any long random phrase here while setting up, then set it back to ''
    // to switch setup.php off.
    'setup_key' => '',

    // How long an admin stays signed in, in hours.
    'session_hours' => 12,

    // Grooming bookings: the info@pawpad.in mailbox sends confirmations, and its
    // calendar (cPanel "Calendars and Contacts") holds every booking.
    // Type the info@ mailbox password here on the server only.
    'info_email'    => 'info@pawpad.in',
    'info_password' => '',
    // Copy the exact "Calendar URL" from cPanel -> Calendars and Contacts
    // Configuration if it differs from this one.
    'caldav_calendar_url' => 'https://cpcalendars.pawpad.in:2080/calendars/info@pawpad.in/calendar',
    'booking_days_ahead'  => 30,   // customers can book today up to this many days ahead
    'booking_same_day_notice_minutes' => 60, // today's times can be booked online until this many minutes before they start
    'boarding_dogs_per_night' => 3, // the most dogs boarding on one night (counts confirmed stays)
    'booking_rate_limit_per_hour' => 20, // bookings from one network per hour (stops spam)

    // Admin uploads (images and PDFs) are saved in the uploads/ folder.
    // The hosting has 1 GB in total, so uploads are capped well below that.
    'public_base_url'     => 'https://api.pawpad.in',
    'upload_quota_mb'     => 150,   // all uploads together
    'upload_max_image_kb' => 1500,  // one image, after WebP compression
    'upload_max_pdf_kb'   => 4000,  // one PDF
];
