<?php
/**
 * Admin sign-in. Passwords are stored only as password_hash() hashes; the
 * browser gets a random session token which is stored here only as a SHA-256 hash.
 */

declare(strict_types=1);

if (!defined('PAWPAD_API')) {
    http_response_code(404);
    exit;
}

const MIN_PASSWORD_LENGTH = 10;

// Who may do what. Owner and Administrator can do everything (only the owner
// manages the team); a Manager handles bookings, applications, daily closing,
// and invoice issuance, but not billing configuration or corrections.
const ADMIN_ROLES = ['owner', 'admin'];
const STAFF_ROLES = ['owner', 'admin', 'manager'];

function role_label(string $role): string
{
    $labels = ['owner' => 'Owner', 'admin' => 'Administrator', 'manager' => 'Manager'];
    return $labels[$role] ?? $role;
}

/**
 * The signed-in person, if their role is one of $roles; otherwise stops with 403.
 */
function require_role(array $roles): array
{
    $user = require_admin();
    if (!in_array($user['role'], $roles, true)) {
        json_error('Not allowed: a ' . role_label($user['role']) . ' cannot do this.', 403);
    }
    return $user;
}

function public_user(array $user): array
{
    return ['email' => $user['email'], 'role' => $user['role'], 'roleLabel' => role_label($user['role'])];
}

function login(array $input): array
{
    rate_limit('login', 10, 900);

    $email = strtolower(clean_text($input['email'] ?? '', 190));
    $password = (string) ($input['password'] ?? '');
    if ($email === '' || $password === '') {
        json_error('Please enter your email and password.');
    }

    $stmt = db()->prepare('SELECT * FROM admin_users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Always run a hash check so response time does not reveal which emails exist.
    $hash = $user ? $user['password_hash'] : password_hash(random_bytes(12), PASSWORD_DEFAULT);
    if (!password_verify($password, $hash) || !$user) {
        json_error('Invalid email or password.', 401);
    }

    if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
        db()->prepare('UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = ?')
            ->execute([password_hash($password, PASSWORD_DEFAULT), now_utc(), $user['id']]);
    }

    $token = bin2hex(random_bytes(32));
    $hours = (int) (pawpad_config()['session_hours'] ?? 12);
    db()->prepare('INSERT INTO admin_sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
        ->execute([hash('sha256', $token), $user['id'], now_utc(), gmdate('Y-m-d H:i:s', time() + $hours * 3600)]);
    db()->prepare('DELETE FROM admin_sessions WHERE expires_at < ?')->execute([now_utc()]);

    return ['token' => $token, 'user' => public_user($user)];
}

function current_token(): string
{
    return (string) ($_SERVER['HTTP_X_PAWPAD_TOKEN'] ?? '');
}

/**
 * Returns the signed-in admin, or stops with 401.
 */
function require_admin(): array
{
    $token = current_token();
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        json_error('Please sign in again.', 401);
    }
    $stmt = db()->prepare(
        'SELECT u.* FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ?'
    );
    $stmt->execute([hash('sha256', $token), now_utc()]);
    $user = $stmt->fetch();
    if (!$user) {
        json_error('Your session has expired. Please sign in again.', 401);
    }
    return $user;
}

function logout(): array
{
    $token = current_token();
    if ($token !== '') {
        db()->prepare('DELETE FROM admin_sessions WHERE token_hash = ?')->execute([hash('sha256', $token)]);
    }
    return [];
}

function change_password(array $user, array $input): array
{
    $current = (string) ($input['currentPassword'] ?? '');
    $new = (string) ($input['newPassword'] ?? '');
    if (!password_verify($current, $user['password_hash'])) {
        json_error('Your current password is not correct.', 403);
    }
    if (strlen($new) < MIN_PASSWORD_LENGTH) {
        json_error('The new password must be at least ' . MIN_PASSWORD_LENGTH . ' characters.');
    }
    db()->prepare('UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = ?')
        ->execute([password_hash($new, PASSWORD_DEFAULT), now_utc(), $user['id']]);
    // Sign out every other device.
    db()->prepare('DELETE FROM admin_sessions WHERE user_id = ? AND token_hash <> ?')
        ->execute([$user['id'], hash('sha256', current_token())]);
    return [];
}

/**
 * Create an admin, or reset the password of an existing one. Used by setup.php.
 */
function upsert_admin(string $email, string $password, string $role): void
{
    $now = now_utc();
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = db()->prepare('SELECT id FROM admin_users WHERE email = ?');
    $stmt->execute([$email]);
    $id = $stmt->fetchColumn();
    if ($id) {
        db()->prepare('UPDATE admin_users SET password_hash = ?, role = ?, updated_at = ? WHERE id = ?')
            ->execute([$hash, $role, $now, $id]);
        db()->prepare('DELETE FROM admin_sessions WHERE user_id = ?')->execute([$id]);
    } else {
        db()->prepare('INSERT INTO admin_users (email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([$email, $hash, $role, $now, $now]);
    }
}
