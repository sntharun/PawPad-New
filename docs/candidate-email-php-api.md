# Candidate email delivery through the Pawpad PHP API

This document describes the code in this repository as of 8 October 2026. It focuses on the interview invitation and application approval emails, then gives a small blueprint for using the same SMTP approach in another project. It describes source behavior; it does not certify that the deployed server or any mailbox currently works.

## The short version

When a signed-in staff member schedules an interview or an Owner/Administrator approves an application, the browser builds the email text and calls the PHP API. The API checks the staff session and permitted status transition, looks up the application in MySQL, and sends the message to the **email address stored in that application**. PHPMailer connects to the configured SMTP mailbox (`courses@pawpad.in`), sends a plain-text message, and BCCs the configured archive mailbox. The API records whether the SMTP send succeeded and returns that result to the admin page.

```text
Admin button
  -> assets/js/applications-store.js builds subject and body
  -> POST https://api.pawpad.in/index.php?action=update_application
     with JSON and X-Pawpad-Token
  -> api/index.php checks the session and calls update_application()
  -> api/lib/applications.php validates the workflow and loads the stored recipient
  -> api/lib/mailer.php uses PHPMailer + authenticated SMTP
  -> applications.status, interview_date, notes and communications are saved
  -> JSON response tells the browser whether the SMTP send succeeded
```

This is an **action-triggered, synchronous** send. There is no mail queue or background worker in this path. The request waits for the SMTP attempt, which has a 20-second PHPMailer timeout. A successful send means the SMTP server accepted the message; it does not prove inbox delivery, reading, or spam placement.

## Relevant files

| File | Job |
| --- | --- |
| [`assets/js/admin.js`](../assets/js/admin.js) | Shows the buttons and displays the returned email result. |
| [`assets/js/applications-store.js`](../assets/js/applications-store.js) | Creates the interview and approval messages and calls the API. |
| [`assets/js/api-client.js`](../assets/js/api-client.js) | Sends JSON to `api.pawpad.in` with the staff session token. |
| [`api/index.php`](../api/index.php) | Routes `update_application` to the authenticated PHP handler. |
| [`api/lib/auth.php`](../api/lib/auth.php) | Validates the token and staff role. |
| [`api/lib/applications.php`](../api/lib/applications.php) | Checks status transitions, sends the candidate message, and records the result. |
| [`api/lib/mailer.php`](../api/lib/mailer.php) | Configures and runs PHPMailer over SMTP. |
| [`api/lib/bootstrap.php`](../api/lib/bootstrap.php) | Loads private configuration, connects to MySQL, handles JSON and CORS. |
| [`api/lib/schema.php`](../api/lib/schema.php) | Defines the `applications` and session tables. |
| [`api/config.sample.php`](../api/config.sample.php) | Safe template for the private server-side `config.php`. |
| [`docs/phase-2-server-setup.md`](phase-2-server-setup.md) | Existing cPanel deployment instructions. |

## 1. Configuration and prerequisites

The documented deployment runs on PHP 8.1 or newer, MySQL, HTTPS, and a cPanel mailbox with SMTP access. PHPMailer is included in `api/lib/PHPMailer/`; this repository does not need a Composer install for the current mailer. The API's private configuration is `api/config.php` on the server, copied from `api/config.sample.php`. `config.php` is not a file to commit or share.

The candidate mailer reads these settings:

```php
'smtp_host'     => 'mail.example.com',
'smtp_port'     => 465,
'smtp_secure'   => 'ssl', // or 'tls' with the server's corresponding port
'smtp_user'     => 'admissions@example.com',
'smtp_password' => 'SERVER_SIDE_SECRET',
'mail_from'      => 'admissions@example.com',
'mail_from_name' => 'Example Admissions',
'mail_bcc'       => 'admissions@example.com', // optional archive copy
```

The `courses` account in `mail_account()` maps to `smtp_*`, `mail_from`, and `mail_bcc`. The same mailer also supports an `info` account for booking emails and reports; that is a separate use of the shared helper. For the candidate path, the sample configuration uses `mail.pawpad.in`, port 465, SSL, and `courses@pawpad.in`. Use the outgoing server and port given by the *new* project's mailbox provider, not Pawpad's values.

`pawpad_config()` loads the config once per request, from `PAWPAD_CONFIG` if set or from `api/config.php`. The shipped `.htaccess` blocks direct browser access to `config.php` and `lib/` when Apache honors it. Keep the same protection, or place secrets outside the web root in the new project. The API also needs a working MySQL connection because every request calls `ensure_schema(db())`, including `health`.

The `health` action returns an `email` flag from `mail_configured()`. That flag checks only that host, username and password are nonempty. It does **not** log in to SMTP or send a test message. A real end-to-end test requires a controlled recipient mailbox.

## 2. Authentication and request routing

`api/index.php` exposes `update_application` as a POST action. It calls `require_role(STAFF_ROLES)` before `update_application()`. Staff roles are `owner`, `admin`, and `manager`.

The admin signs in through the API. The server verifies a password hash and returns a random session token. The browser stores that token and sends it as `X-Pawpad-Token` on subsequent API calls. The server stores only the token's SHA-256 hash and checks expiry on each protected request. The browser's role-based buttons are a convenience; the PHP checks are the authority. The sample configuration defaults sessions to 12 hours.

The browser sends JSON similar to the following (the token is shown only as a placeholder):

```http
POST /index.php?action=update_application HTTP/1.1
Content-Type: application/json
X-Pawpad-Token: <staff-session-token>

{
  "id": "PCGEC - 001",
  "status": "interview_scheduled",
  "interviewDate": "2026-10-15T11:30",
  "note": "Please have your questions ready.",
  "email": {
    "type": "interview_scheduled",
    "subject": "Interview Scheduled: Example Course - Pawpad Academy (PCGEC - 001)",
    "body": "Dear Candidate,\n..."
  }
}
```

For approval, the same action sends `"status": "approved"`, an optional note, and an `email` object with type `application_approved`. The frontend method `_serverChangeWithEmail()` makes this one API request containing both the status change and the proposed message. The API base URL defaults to `https://api.pawpad.in` and can be overridden through `window.PAWPAD_API_BASE`.

**Important boundary:** the browser supplies the subject and body, but it does **not** choose the recipient. `update_application()` loads the record by `id` and passes `$row['applicant_email']` and `$row['applicant_name']` to the mailer. The recipient is taken from MySQL even if the browser's preview contains another address. If copying this design, do not accept an arbitrary `to` address from an admin action unless that is an intentional, separately authorized feature.

## 3. Status rules and message content

`APPLICATION_STEPS` in `api/lib/applications.php` controls the valid transitions:

| Action | Starting status | Who can perform it | Candidate email in the admin flow |
| --- | --- | --- | --- |
| Schedule or reschedule interview | `pending_review` or `interview_scheduled` | Owner, Administrator, Manager | Interview invitation. |
| Approve | `pending_review` or `interview_scheduled` | Owner or Administrator | Approval confirmation. |
| Decline | `pending_review`, `interview_scheduled`, or `approved` | Owner or Administrator | Optional, chosen in the admin UI. |
| Enrol | `approved`, after a recorded payment | Owner, Administrator, Manager | No candidate email in this action. |

Managers may send only the `interview_scheduled` email together with scheduling. The backend also requires an interview date/time for that step. The code permits an Owner/Administrator to approve directly from `pending_review`; the UI does too, even though the normal process describes an interview first.

The message templates live in JavaScript, in `generateInterviewEmail()` and `generateApprovalEmail()`:

- **Interview invitation:** candidate name, course, application reference, localized date/time, a 15–20 minute video interaction, a statement that the meeting link will be shared later, expected discussion topics, and reply/WhatsApp contact details. Scheduling the interview does **not** create a video meeting link.
- **Approval confirmation:** candidate name, course, application reference, fee stored on the application, location, approved status, deposit instructions, batch alignment, and onboarding next steps. The email itself does not record payment or enrol the candidate.
- **Optional staff note:** appended to either template if supplied.

The email text is plain text, not HTML. PHPMailer sets UTF-8, so the messages can contain `₹` and other non-ASCII characters. The admin page offers Gmail and default-mail-client links for preview or manual resend; opening those links is separate from the automatic SMTP send and does not itself confirm a resend.

When an interview is scheduled, PHP also sends a **separate HTML notification** to all Owner and Administrator accounts, using `send_html_mail('courses', ...)`. It reports the candidate, course, time, and scheduling staff member. That staff notice has its own success/failure note and is not the candidate invitation.

## 4. What `send_mail()` does

`send_candidate_email()` calls `send_mail('courses', ...)`. The mailer:

1. Rejects an invalid recipient address with `filter_var(..., FILTER_VALIDATE_EMAIL)`.
2. Rejects incomplete SMTP settings (host, username, or password missing).
3. Creates a PHPMailer instance in SMTP mode with authentication.
4. Sets the configured host, port, username and password.
5. Uses SMTPS for `smtp_secure = 'ssl'`, STARTTLS for `smtp_secure = 'tls'`, or no transport security if configured otherwise. For another project, configure a secure mode supported by its provider.
6. Sets a 20-second timeout, UTF-8, the configured From and Reply-To, the stored candidate address, and optional BCC.
7. Sends a plain-text subject and body.
8. Returns `['sent' => true, 'error' => '']` if PHPMailer accepts the send. On an exception it logs technical details to the PHP error log and returns a generic error for the admin UI.

The optional BCC is useful for a mailbox copy, but it is not a substitute for the database communication record. An SMTP-accepted message can still bounce or land in spam later.

## 5. What gets saved, and what happens on failure

The `applications` table stores the candidate's address, status and interview time. `staff_notes` and `communications` are JSON-encoded arrays in `MEDIUMTEXT` columns. For each requested candidate email, `update_application()` appends a communication entry containing the type, UTC timestamp, stored recipient, subject, full body, and `status` of `sent` or `failed`. It also appends a staff note describing the result. Then it updates the application row and returns:

```json
{
  "ok": true,
  "application": { "id": "PCGEC - 001", "status": "interview_scheduled" },
  "email": { "sent": true, "error": "" }
}
```

The `application` shown above is abbreviated; the real response includes the full application object.

The send occurs **before** the database update. If SMTP rejects the message, the status is still saved and `email.sent` is `false`. The admin page includes the failure text in its message, although its success-colored banner and title still say “Email Dispatched”; read the result text or communication record rather than trusting that title. If SMTP accepts the message but the later database update fails, an email may have gone out without the corresponding saved status or log. Retrying can then send a duplicate. There is no idempotency key, queue, retry worker, or automatic recovery for this path.

The PHP action only sends an email when the request contains an `email` object. A direct API caller can change an allowed status without that object. Thus “status changed” and “candidate emailed” are related in the **admin button flow**, but they are not an inseparable backend rule.

## 6. The older browser-only/Web3Forms branch

`applications-store.js` has another path for when `isServerMode()` is false. It changes data in browser local storage and POSTs a form to `https://api.web3forms.com/submit`. The payload includes `to_candidate` and `candidate_email` fields, but this code does not show a server-side SMTP recipient selection or proof that Web3Forms delivers to that address. Its success check is the HTTP response status, and the UI's returned object does not contain the same `emailSent` flag as the PHP path. Do not use this branch as the model for reliable candidate delivery in the next project.

The current admin sign-in requires the Pawpad API and a server session. In the intended authenticated workflow, `isServerMode()` is true and the PHP/SMTP path above is used. The existence of a fallback branch in the store does not mean it is the normal live-admin delivery mechanism.

## 7. Reusing the approach in another project

The smallest useful version is an authenticated PHP endpoint plus a server-side PHPMailer helper. Keep the new project's names, roles, and storage model; copy the *pattern*, not Pawpad addresses, API tokens, form keys, or application-specific text.

The existing PHP files are **not drop-in modules**. `mailer.php` expects `pawpad_config()` from `bootstrap.php`; `applications.php` expects this project's MySQL schema, JSON helpers, status rules, and authentication functions. In a new PHP project, the portable core is `mail_account()`/`send_mail()` plus PHPMailer. Replace the config loader and the record/action handler with equivalents for that project. Keep PHPMailer updated through the new project's normal dependency process; the bundled copy here describes this checkout only.

1. **Prepare a sending mailbox.** Obtain its exact SMTP host, port, security mode, username and password. Use a From address that the SMTP provider allows. Configure SPF/DKIM/DMARC for the new domain with that provider to improve delivery. Keep the password in server-side configuration or a secrets store.
2. **Store recipients on the server.** Save the candidate/customer address when the underlying record is created. In the action handler, load it by record ID. Validate it before sending.
3. **Protect the action.** Require a signed-in staff session and enforce role and state rules on the server. CORS controls browser origins; it is not authentication. Never expose an unrestricted public “send to any email” endpoint.
4. **Build the message.** For a small project, a server-side template is easier to trust and reuse. If the browser supplies editable text, constrain who can edit it, validate length and type, and retain the exact sent version in the audit record.
5. **Call PHPMailer.** Configure SMTP authentication, TLS/SMTPS, From, Reply-To, recipient, subject, body, UTF-8, and a timeout. Return a structured send result instead of treating an HTTP 200 as proof of mail delivery.
6. **Record the outcome.** Save event type, recipient, subject, timestamp, provider acceptance result, and a safe error description. Show separate status and email results to the operator.
7. **Choose failure behavior deliberately.** If the business action may proceed without email, save the new status but display “email failed” clearly and offer a safe retry. If delivery must be guaranteed, use a durable outbox/queue with a worker and idempotency key; an SMTP call and a database update are not one atomic transaction.

A compact **illustrative** request/response shape for the new project:

```json
// POST /api/candidates/123/schedule-interview (authenticated)
{ "interviewAt": "2026-10-15T11:30:00+05:30" }

// Response: business action saved, email attempt reported independently
{
  "status": "interview_scheduled",
  "email": { "status": "sent", "recipient": "candidate@example.com" }
```

The above is a proposed interface, not an endpoint in this repository. For a different stack, the same boundaries apply: backend-owned recipient, server-side credentials, authorized action, observable send result, and a persisted audit trail.

## 8. Verification checklist for the new project

- Confirm the application can authenticate to SMTP using the provider's specified host, port, and encryption. A “configured” flag alone is insufficient.
- Send to a test mailbox you control. Check Inbox and Spam, inspect From/Reply-To, and confirm the optional BCC copy.
- Test invalid recipient, missing SMTP password, rejected SMTP credentials, and unreachable SMTP host. Confirm the UI and database show `failed` rather than claiming delivery.
- Test each role and status transition, including a direct API request that bypasses the browser UI.
- Test a repeated button click or network retry to see whether it sends duplicates. Add an idempotency mechanism if that would be harmful.
- Check the deployed domain's SPF/DKIM/DMARC and observe actual bounces or delivery reports if the provider exposes them.

For Pawpad itself, the setup guide's `health` endpoint and test-application procedure provide a starting smoke test. No live SMTP send was performed while writing this document.
