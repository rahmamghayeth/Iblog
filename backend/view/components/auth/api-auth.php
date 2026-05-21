<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../config/env.php';
require_once __DIR__ . '/../../../controller/UserController.php';
require_once __DIR__ . '/../../../lib/Mailer.php';
require_once __DIR__ . '/../admin/admin-auth-support.php';

@session_start();

if (!($cnx instanceof PDO)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => databaseConnectionError() ?? 'Database connection failed.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jsonOk(array $data = []): never
{
    echo json_encode(['ok' => true] + $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jsonErr(string $message, int $code = 400): never
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if (($raw === false || $raw === '') && PHP_SAPI === 'cli') {
        $raw = (string) (getenv('IBLOG_TEST_REQUEST_BODY') ?: '');
    }
    $decoded = json_decode($raw ?: '{}', true);
    return is_array($decoded) ? $decoded : [];
}

function passwordStrongEnough(string $password): bool
{
    return strlen($password) >= 10
        && preg_match('/[A-Z]/', $password) === 1
        && preg_match('/\d/', $password) === 1
        && preg_match('/[^A-Za-z0-9]/', $password) === 1;
}

function followPayload(PDO $cnx, int $userId, ?int $viewerId = null): array
{
    $stats = getUserFollowStats($cnx, $userId);

    return [
        'followers' => (int) ($stats['followers'] ?? 0),
        'following' => (int) ($stats['following'] ?? 0),
        'followingIds' => $viewerId !== null && $viewerId === $userId
            ? getFollowingUserIds($cnx, $userId)
            : [],
        'isFollowing' => $viewerId !== null && $viewerId > 0 && $viewerId !== $userId
            ? isUserFollowing($cnx, $viewerId, $userId)
            : false,
    ];
}

function userPayload(PDO $cnx, array $user, ?bool $onboardingComplete = null, ?int $viewerId = null): array
{
    $resolvedOnboarding = $onboardingComplete;
    if ($resolvedOnboarding === null) {
        $resolvedOnboarding = array_key_exists('onboardingComplete', $user)
            ? (bool) $user['onboardingComplete']
            : true;
    }

    $payload = [
        'id' => (int) ($user['id'] ?? 0),
        'name' => $user['name'],
        'email' => $user['email'],
        'plan' => $user['plan'],
        'isPremium' => (bool) ($user['isPremium'] ?? 0),
        'isAdmin' => (bool) ($user['isAdmin'] ?? 0),
        'initial' => strtoupper($user['name'][0] ?? 'A'),
        'bio' => (string) ($user['bio'] ?? ''),
        'avatar' => normalizeProfileImagePath((string) ($user['avatar'] ?? '')),
        'cover' => normalizeProfileImagePath((string) ($user['cover'] ?? '')),
        'pseudo' => (string) ($user['pseudo'] ?? ''),
        'fieldIds' => is_array($user['fieldIds'] ?? null) ? $user['fieldIds'] : [],
        'subjectIds' => is_array($user['subjectIds'] ?? null) ? $user['subjectIds'] : [],
        'interestIds' => is_array($user['interestIds'] ?? null) ? $user['interestIds'] : [],
        'fields' => is_array($user['fields'] ?? null) ? $user['fields'] : [],
        'subjects' => is_array($user['subjects'] ?? null) ? $user['subjects'] : [],
        'onboardingComplete' => (bool) $resolvedOnboarding,
    ];

    return $payload + followPayload(
        $cnx,
        (int) ($payload['id'] ?? 0),
        $viewerId
    );
}

function tableExists(PDO $cnx, string $table): bool
{
    return dbTableExists($cnx, $table);
}

function columnExists(PDO $cnx, string $table, string $column): bool
{
    return dbColumnExists($cnx, $table, $column);
}

function ensureUserProfileColumns(PDO $cnx): void
{
    if (!tableExists($cnx, 'users')) {
        return;
    }

    $columns = [
        'bio' => 'ALTER TABLE users ADD COLUMN bio TEXT NULL',
        'avatar' => 'ALTER TABLE users ADD COLUMN avatar VARCHAR(255) NULL',
        'cover' => 'ALTER TABLE users ADD COLUMN cover VARCHAR(255) NULL',
    ];

    foreach ($columns as $column => $sql) {
        if (!columnExists($cnx, 'users', $column)) {
            try {
                $cnx->exec($sql);
            } catch (Throwable) {
            }
        }
    }
}

function ensureUserProfileMetaColumns(PDO $cnx): void
{
    if (!tableExists($cnx, 'user_profile')) {
        return;
    }

    $columns = [
        'pseudo' => 'ALTER TABLE user_profile ADD COLUMN pseudo VARCHAR(64) NULL',
        'fieldIds' => 'ALTER TABLE user_profile ADD COLUMN fieldIds TEXT NULL',
        'subjectIds' => 'ALTER TABLE user_profile ADD COLUMN subjectIds TEXT NULL',
        'interestIds' => 'ALTER TABLE user_profile ADD COLUMN interestIds TEXT NULL',
        'fields' => 'ALTER TABLE user_profile ADD COLUMN fields TEXT NULL',
        'subjects' => 'ALTER TABLE user_profile ADD COLUMN subjects TEXT NULL',
        'onboardingComplete' => 'ALTER TABLE user_profile ADD COLUMN onboardingComplete TINYINT(1) NOT NULL DEFAULT 0',
    ];

    foreach ($columns as $column => $sql) {
        if (!columnExists($cnx, 'user_profile', $column)) {
            try {
                $cnx->exec($sql);
            } catch (Throwable) {
            }
        }
    }
}

function userTableSupportsProfileColumns(PDO $cnx): bool
{
    return columnExists($cnx, 'users', 'bio')
        && columnExists($cnx, 'users', 'avatar')
        && columnExists($cnx, 'users', 'cover');
}

function ensureUserProfileTable(PDO $cnx): void
{
    try {
        $cnx->exec(
            "CREATE TABLE IF NOT EXISTS user_profile (
                userId INT NOT NULL PRIMARY KEY,
                bio TEXT NULL,
                avatar VARCHAR(255) NULL,
                cover VARCHAR(255) NULL,
                pseudo VARCHAR(64) NULL,
                fieldIds TEXT NULL,
                subjectIds TEXT NULL,
                interestIds TEXT NULL,
                fields TEXT NULL,
                subjects TEXT NULL,
                onboardingComplete TINYINT(1) NOT NULL DEFAULT 0,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
    } catch (Throwable) {
    }

    ensureUserProfileMetaColumns($cnx);
}

function normalizeStringArray(mixed $value): array
{
    if (!is_array($value)) {
        return [];
    }

    $clean = [];
    foreach ($value as $item) {
        $text = trim((string) $item);
        if ($text === '') {
            continue;
        }
        $clean[] = $text;
    }

    return array_values(array_unique($clean));
}

function decodeProfileArray(mixed $value): array
{
    if (is_array($value)) {
        return normalizeStringArray($value);
    }

    $text = trim((string) $value);
    if ($text === '') {
        return [];
    }

    $decoded = json_decode($text, true);
    return normalizeStringArray($decoded);
}

function encodeProfileArray(array $value): string
{
    return json_encode(normalizeStringArray($value), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '[]';
}

function profileUploadDir(string $type): string
{
    return dirname(__DIR__, 4) . '/public/uploads/' . ($type === 'cover' ? 'covers' : 'avatars') . '/';
}

function normalizeProfileImagePath(string $image): string
{
    $image = trim($image);
    if ($image === '') {
        return '';
    }

    if (preg_match('#^backend/public/uploads/(?:avatars|covers)/[A-Za-z0-9._-]+$#', $image) === 1) {
        return substr($image, strlen('backend/'));
    }

    if (preg_match('#^/blog_12(?:3)?/public/uploads/(?:avatars|covers)/[A-Za-z0-9._-]+$#', $image) === 1) {
        return preg_replace('#^/blog_12(?:3)?/#', '', $image) ?: $image;
    }

    if (preg_match('#^https?://[^/]+/blog_12(?:3)?/public/uploads/(?:avatars|covers)/[A-Za-z0-9._-]+$#', $image) === 1) {
        return preg_replace('#^https?://[^/]+/blog_12(?:3)?/#', '', $image) ?: $image;
    }

    if (preg_match('#^/blog/blog/public/uploads/(?:avatars|covers)/[A-Za-z0-9._-]+$#', $image) === 1) {
        return preg_replace('#^/blog/blog/#', '', $image) ?: $image;
    }

    if (preg_match('#^https?://[^/]+/blog/blog/public/uploads/(?:avatars|covers)/[A-Za-z0-9._-]+$#', $image) === 1) {
        return preg_replace('#^https?://[^/]+/blog/blog/#', '', $image) ?: $image;
    }

    return $image;
}

function saveProfileImage(string $image, string $type): string
{
    $image = normalizeProfileImagePath($image);
    if ($image === '') {
        return '';
    }

    if (preg_match('#^public/uploads/(?:avatars|covers)/[A-Za-z0-9._-]+$#', $image) === 1) {
        return $image;
    }

    if (preg_match('#^data:image/(png|jpe?g|webp|gif);base64,#i', $image, $matches) !== 1) {
        return $image;
    }

    $extension = strtolower($matches[1]);
    if ($extension === 'jpeg') {
        $extension = 'jpg';
    }

    $binary = base64_decode(substr($image, strpos($image, ',') + 1), true);
    if ($binary === false) {
        jsonErr('Invalid image data.');
    }

    $directory = profileUploadDir($type);
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        jsonErr('Could not create upload folder.', 500);
    }

    $prefix = $type === 'cover' ? 'cover_' : 'avatar_';
    $fileName = $prefix . bin2hex(random_bytes(8)) . '.' . $extension;
    $target = $directory . $fileName;

    if (file_put_contents($target, $binary) === false) {
        jsonErr('Could not save image.', 500);
    }

    return 'public/uploads/' . ($type === 'cover' ? 'covers' : 'avatars') . '/' . $fileName;
}

function mergeProfileData(PDO $cnx, array $user): array
{
    ensureUserProfileColumns($cnx);
    ensureUserProfileTable($cnx);

    $profile = [
        'bio' => (string) ($user['bio'] ?? ''),
        'avatar' => normalizeProfileImagePath((string) ($user['avatar'] ?? '')),
        'cover' => normalizeProfileImagePath((string) ($user['cover'] ?? '')),
        'pseudo' => (string) ($user['pseudo'] ?? ''),
        'fieldIds' => normalizeStringArray($user['fieldIds'] ?? []),
        'subjectIds' => normalizeStringArray($user['subjectIds'] ?? []),
        'interestIds' => normalizeStringArray($user['interestIds'] ?? []),
        'fields' => normalizeStringArray($user['fields'] ?? []),
        'subjects' => normalizeStringArray($user['subjects'] ?? []),
    ];

    try {
        $stmt = $cnx->prepare(
            'SELECT bio, avatar, cover, pseudo, fieldIds, subjectIds, interestIds, fields, subjects, onboardingComplete
             FROM user_profile
             WHERE userId = :userId
             LIMIT 1'
        );
        $stmt->execute([':userId' => (int) ($user['id'] ?? 0)]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        foreach (['bio', 'avatar', 'cover', 'pseudo'] as $field) {
            $fallbackValue = in_array($field, ['avatar', 'cover'], true)
                ? normalizeProfileImagePath((string) ($row[$field] ?? ''))
                : trim((string) ($row[$field] ?? ''));

            if ($profile[$field] === '' && $fallbackValue !== '') {
                $profile[$field] = $fallbackValue;
            }
        }

        foreach (['fieldIds', 'subjectIds', 'interestIds', 'fields', 'subjects'] as $field) {
            if (!empty($profile[$field])) {
                continue;
            }
            $profile[$field] = decodeProfileArray($row[$field] ?? '');
        }

        if (array_key_exists('onboardingComplete', $row)) {
            $profile['onboardingComplete'] = (bool) $row['onboardingComplete'];
        }
    } catch (Throwable) {
    }

    return array_merge($user, $profile);
}

function persistProfileData(PDO $cnx, int $userId, string $bio, string $avatar, string $cover, array $meta = []): void
{
    ensureUserProfileColumns($cnx);
    ensureUserProfileTable($cnx);

    $pseudo = trim((string) ($meta['pseudo'] ?? ''));
    $fieldIds = normalizeStringArray($meta['fieldIds'] ?? []);
    $subjectIds = normalizeStringArray($meta['subjectIds'] ?? []);
    $interestIds = normalizeStringArray($meta['interestIds'] ?? []);
    $fields = normalizeStringArray($meta['fields'] ?? []);
    $subjects = normalizeStringArray($meta['subjects'] ?? []);
    $onboardingComplete = (bool) ($meta['onboardingComplete'] ?? false);

    if (userTableSupportsProfileColumns($cnx)) {
        $stmt = $cnx->prepare(
            'UPDATE users
             SET bio = :bio,
                 avatar = :avatar,
                 cover = :cover
             WHERE id = :id'
        );
        $stmt->execute([
            ':bio' => $bio,
            ':avatar' => $avatar,
            ':cover' => $cover,
            ':id' => $userId,
        ]);
    }

    $profileStmt = $cnx->prepare(
        'INSERT INTO user_profile (userId, bio, avatar, cover, pseudo, fieldIds, subjectIds, interestIds, fields, subjects, onboardingComplete)
         VALUES (:userId, :bio, :avatar, :cover, :pseudo, :fieldIds, :subjectIds, :interestIds, :fields, :subjects, :onboardingComplete)
         ON DUPLICATE KEY UPDATE
            bio = VALUES(bio),
            avatar = VALUES(avatar),
            cover = VALUES(cover),
            pseudo = VALUES(pseudo),
            fieldIds = VALUES(fieldIds),
            subjectIds = VALUES(subjectIds),
            interestIds = VALUES(interestIds),
            fields = VALUES(fields),
            subjects = VALUES(subjects),
            onboardingComplete = VALUES(onboardingComplete)'
    );
    $profileStmt->execute([
        ':userId' => $userId,
        ':bio' => $bio,
        ':avatar' => $avatar,
        ':cover' => $cover,
        ':pseudo' => $pseudo,
        ':fieldIds' => encodeProfileArray($fieldIds),
        ':subjectIds' => encodeProfileArray($subjectIds),
        ':interestIds' => encodeProfileArray($interestIds),
        ':fields' => encodeProfileArray($fields),
        ':subjects' => encodeProfileArray($subjects),
        ':onboardingComplete' => $onboardingComplete ? 1 : 0,
    ]);
}

function loginUser(array $user): void
{
    $_SESSION = [];
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];
    $_SESSION['name'] = $user['name'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['plan'] = $user['plan'];
    $_SESSION['isPremium'] = (int) ($user['isPremium'] ?? 0);
    $_SESSION['isAdmin'] = (int) ($user['isAdmin'] ?? 0);
}

function clearAuthSession(): void
{
    $_SESSION = [];

    if (session_status() === PHP_SESSION_ACTIVE && ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'] ?: '/',
            $params['domain'] ?: '',
            (bool) ($params['secure'] ?? false),
            (bool) ($params['httponly'] ?? true)
        );
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
}

function deletePendingOnboardingUser(PDO $cnx, int $userId): void
{
    if ($userId <= 0) {
        return;
    }

    foreach (['user_profile', 'subscription'] as $table) {
        if (!tableExists($cnx, $table)) {
            continue;
        }

        try {
            $stmt = $cnx->prepare("DELETE FROM {$table} WHERE userId = :userId");
            $stmt->execute([':userId' => $userId]);
        } catch (Throwable) {
        }
    }

    deleteUser($cnx, $userId);
}

function ensurePasswordResetTable(PDO $cnx): void
{
    $cnx->exec(
        "CREATE TABLE IF NOT EXISTS password_resets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            expires_at DATETIME NOT NULL,
            used_at DATETIME DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_reset_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

function ensurePrivateMessagesTable(PDO $cnx): void
{
    $cnx->exec(
        "CREATE TABLE IF NOT EXISTS private_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            senderId INT NOT NULL,
            recipientId INT NOT NULL,
            body TEXT NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            readAt DATETIME DEFAULT NULL,
            INDEX idx_private_messages_sender (senderId),
            INDEX idx_private_messages_recipient (recipientId),
            INDEX idx_private_messages_pair (senderId, recipientId, createdAt)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

function resolveUserByTarget(PDO $cnx, int $targetUserId = 0, string $targetEmail = ''): array|false
{
    if ($targetUserId > 0) {
        return getUserById($cnx, $targetUserId);
    }

    $targetEmail = trim($targetEmail);
    if ($targetEmail !== '') {
        return getUserByEmail($cnx, $targetEmail);
    }

    return false;
}

function messageUserPayload(PDO $cnx, array $user, int $viewerId = 0): array
{
    $profile = mergeProfileData($cnx, $user);
    $name = (string) ($profile['name'] ?? 'Unknown');
    $payload = [
        'id' => (int) ($profile['id'] ?? 0),
        'name' => $name,
        'email' => (string) ($profile['email'] ?? ''),
        'plan' => (string) ($profile['plan'] ?? 'free'),
        'isPremium' => (bool) ($profile['isPremium'] ?? 0),
        'avatar' => normalizeProfileImagePath((string) ($profile['avatar'] ?? '')),
        'cover' => normalizeProfileImagePath((string) ($profile['cover'] ?? '')),
        'bio' => (string) ($profile['bio'] ?? ''),
        'initial' => strtoupper(substr($name, 0, 1) ?: 'A'),
        'pseudo' => (string) ($profile['pseudo'] ?? ''),
    ];

    return $payload + followPayload(
        $cnx,
        (int) ($payload['id'] ?? 0),
        $viewerId > 0 ? $viewerId : null
    );
}

function listDirectoryUsers(PDO $cnx, int $currentUserId = 0, string $query = '', int $limit = 24): array
{
    ensureUserProfileColumns($cnx);
    ensureUserProfileTable($cnx);
    $limit = max(1, min($limit, 50));
    $sql = "SELECT id, name, email, plan, isPremium, isAdmin";
    if (columnExists($cnx, 'users', 'avatar')) {
        $sql .= ", COALESCE(avatar, '') AS avatar";
    } else {
        $sql .= ", '' AS avatar";
    }
    if (columnExists($cnx, 'users', 'cover')) {
        $sql .= ", COALESCE(cover, '') AS cover";
    } else {
        $sql .= ", '' AS cover";
    }
    if (columnExists($cnx, 'users', 'bio')) {
        $sql .= ", COALESCE(bio, '') AS bio";
    } else {
        $sql .= ", '' AS bio";
    }
    $sql .= " FROM users WHERE COALESCE(isAdmin, 0) = 0";
    $params = [];
    if ($currentUserId > 0) {
        $sql .= " AND id <> :currentUserId";
        $params[':currentUserId'] = $currentUserId;
    }
    if ($query !== '') {
        $sql .= " AND (name LIKE :nameQuery OR email LIKE :emailQuery)";
        $params[':nameQuery'] = '%' . $query . '%';
        $params[':emailQuery'] = '%' . $query . '%';
    }
    $sql .= " ORDER BY isPremium DESC, name ASC LIMIT {$limit}";

    $stmt = $cnx->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    return array_map(function (array $row) use ($cnx, $currentUserId): array {
        return messageUserPayload($cnx, $row, $currentUserId);
    }, $rows);
}

function getPrivateMessageThreads(PDO $cnx, int $userId): array
{
    ensurePrivateMessagesTable($cnx);
    $stmt = $cnx->prepare(
        "SELECT id, senderId, recipientId, body, createdAt, readAt
         FROM private_messages
         WHERE senderId = :uid_sender OR recipientId = :uid_recipient
         ORDER BY createdAt DESC, id DESC
         LIMIT 500"
    );
    $stmt->execute([
        ':uid_sender' => $userId,
        ':uid_recipient' => $userId,
    ]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $threads = [];
    foreach ($rows as $row) {
        $senderId = (int) ($row['senderId'] ?? 0);
        $recipientId = (int) ($row['recipientId'] ?? 0);
        $partnerId = $senderId === $userId ? $recipientId : $senderId;
        if ($partnerId <= 0) {
            continue;
        }

        if (!isset($threads[$partnerId])) {
            $partner = getUserById($cnx, $partnerId);
            if ($partner === false) {
                continue;
            }
            $threads[$partnerId] = [
                'partner' => messageUserPayload($cnx, $partner),
                'lastMessage' => '',
                'lastAt' => '',
                'unreadCount' => 0,
                'messageCount' => 0,
            ];
        }

        $threads[$partnerId]['messageCount']++;
        if ($threads[$partnerId]['lastMessage'] === '') {
            $threads[$partnerId]['lastMessage'] = (string) ($row['body'] ?? '');
            $threads[$partnerId]['lastAt'] = (string) ($row['createdAt'] ?? '');
        }
        if ($recipientId === $userId && empty($row['readAt'])) {
            $threads[$partnerId]['unreadCount']++;
        }
    }

    return array_values($threads);
}

function getPrivateMessageHistory(PDO $cnx, int $userId, int $partnerId): array
{
    ensurePrivateMessagesTable($cnx);
    if ($partnerId <= 0) {
        return [];
    }

    $stmt = $cnx->prepare(
        "SELECT id, senderId, recipientId, body, createdAt, readAt
         FROM private_messages
         WHERE (senderId = :userIdA AND recipientId = :partnerIdA)
            OR (senderId = :partnerIdB AND recipientId = :userIdB)
         ORDER BY createdAt ASC, id ASC"
    );
    $stmt->execute([
        ':userIdA' => $userId,
        ':partnerIdA' => $partnerId,
        ':partnerIdB' => $partnerId,
        ':userIdB' => $userId,
    ]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $cnx->prepare(
        "UPDATE private_messages
         SET readAt = CURRENT_TIMESTAMP
         WHERE senderId = :pid AND recipientId = :uid AND readAt IS NULL"
    )->execute([':pid' => $partnerId, ':uid' => $userId]);

    return array_map(static function (array $row) use ($userId): array {
        return [
            'id' => (int) ($row['id'] ?? 0),
            'senderId' => (int) ($row['senderId'] ?? 0),
            'recipientId' => (int) ($row['recipientId'] ?? 0),
            'body' => (string) ($row['body'] ?? ''),
            'createdAt' => (string) ($row['createdAt'] ?? ''),
            'readAt' => (string) ($row['readAt'] ?? ''),
            'isMine' => (int) ($row['senderId'] ?? 0) === $userId,
        ];
    }, $rows);
}

function sendPrivateMessage(PDO $cnx, int $senderId, int $recipientId, string $body): array
{
    ensurePrivateMessagesTable($cnx);
    if ($senderId <= 0 || $recipientId <= 0) {
        jsonErr('Invalid conversation participants.', 400);
    }

    $recipient = getUserById($cnx, $recipientId);
    if ($recipient === false) {
        jsonErr('Recipient not found.', 404);
    }

    $body = trim($body);
    if ($body === '') {
        jsonErr('Message cannot be empty.', 400);
    }

    $stmt = $cnx->prepare(
        'INSERT INTO private_messages (senderId, recipientId, body, createdAt) VALUES (:senderId, :recipientId, :body, CURRENT_TIMESTAMP)'
    );
    $stmt->execute([
        ':senderId' => $senderId,
        ':recipientId' => $recipientId,
        ':body' => $body,
    ]);

    $id = (int) $cnx->lastInsertId();
    return [
        'id' => $id,
        'senderId' => $senderId,
        'recipientId' => $recipientId,
        'body' => $body,
        'createdAt' => date('c'),
        'readAt' => '',
        'isMine' => true,
    ];
}

function deletePrivateMessageThread(PDO $cnx, int $userId, int $partnerId): int
{
    ensurePrivateMessagesTable($cnx);
    if ($userId <= 0 || $partnerId <= 0) {
        jsonErr('Invalid conversation.', 400);
    }

    $partner = getUserById($cnx, $partnerId);
    if ($partner === false) {
        jsonErr('Conversation partner not found.', 404);
    }

    $stmt = $cnx->prepare(
        "DELETE FROM private_messages
         WHERE (senderId = :userIdA AND recipientId = :partnerIdA)
            OR (senderId = :partnerIdB AND recipientId = :userIdB)"
    );
    $stmt->execute([
        ':userIdA' => $userId,
        ':partnerIdA' => $partnerId,
        ':partnerIdB' => $partnerId,
        ':userIdB' => $userId,
    ]);

    return (int) $stmt->rowCount();
}

function appBaseUrl(): string
{
    $configured = trim((string) env('APP_URL', ''));
    if ($configured !== '') {
        return rtrim($configured, '/');
    }

    $host = trim((string) ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    $https = !empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off';
    $scheme = $https ? 'https' : 'http';
    $scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
    $derivedPath = preg_replace('#/backend/view/components/auth/api-auth\.php$#', '', $scriptName);
    $fallbackPath = '/' . trim(basename(dirname(__DIR__, 4)), '/');
    $basePath = is_string($derivedPath) && $derivedPath !== '' ? rtrim($derivedPath, '/') : $fallbackPath;

    return sprintf('%s://%s%s', $scheme, $host, $basePath);
}

function sendPasswordResetEmail(string $email, string $name, string $token): void
{
    $baseUrl = appBaseUrl();
    $url = $baseUrl . '/reset-password.php?token=' . urlencode($token) . '&email=' . urlencode($email);

    $subject = 'Reset your IBlog password';
    $html = '<div style="font-family:Arial,sans-serif;color:#1c1a16;line-height:1.6">'
        . '<h2 style="margin-bottom:12px;">Reset your password</h2>'
        . '<p>Hello ' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . ',</p>'
        . '<p>We received a request to reset your IBlog password. Use the button below to choose a new one.</p>'
        . '<p><a href="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '" style="display:inline-block;padding:12px 18px;background:#b8960c;color:#fff;border-radius:999px;text-decoration:none;font-weight:700">Reset Password</a></p>'
        . '<p>This link expires in 60 minutes.</p>'
        . '<p>If you did not request this, you can ignore this email.</p>'
        . '</div>';
    $text = "Hello {$name},\n\nReset your IBlog password using this link:\n{$url}\n\nThis link expires in 60 minutes.";

    Mailer::send($email, $subject, $html, $text);
}

function sendWelcomeEmail(array $user): void
{
    $subject = 'Welcome to IBlog';
    $html = '<div style="font-family:Arial,sans-serif;color:#1c1a16;line-height:1.6">'
        . '<h2>Welcome to IBlog</h2>'
        . '<p>Hello ' . htmlspecialchars($user['name'], ENT_QUOTES, 'UTF-8') . ',</p>'
        . '<p>Your account is ready. You can now sign in and start reading, writing and exploring premium tools.</p>'
        . '</div>';
    $text = "Welcome to IBlog, {$user['name']}.\n\nYour account is ready.";

    Mailer::send($user['email'], $subject, $html, $text);
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonErr('Method not allowed.', 405);
    }

    loadEnvFile();
    $body = readJsonBody();
    $action = (string) ($body['action'] ?? '');

    if ($action === 'signup') {
        $name = trim((string) ($body['name'] ?? ''));
        $email = trim((string) ($body['email'] ?? ''));
        $password = (string) ($body['password'] ?? '');
        $plan = ($body['plan'] ?? 'free') === 'premium' ? 'premium' : 'free';

        if (mb_strlen($name) < 2) jsonErr('Name must contain at least 2 characters.');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonErr('Please enter a valid email address.');
        if (!passwordStrongEnough($password)) jsonErr('Password must be at least 10 characters and include a capital letter, a number and a symbol.');
        if (getUserByEmail($cnx, $email) !== false) jsonErr('This email is already registered.');

        if (!AddUser($cnx, [
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'plan' => $plan,
            'isPremium' => $plan === 'premium' ? 1 : 0,
            'isAdmin' => 0,
        ])) {
            jsonErr('Unable to create the account.', 500);
        }

        $user = getUserByEmail($cnx, $email);
        if ($user === false) jsonErr('Account created but user could not be loaded.', 500);

        loginUser($user);
        persistProfileData(
            $cnx,
            (int) $user['id'],
            '',
            '',
            '',
            ['onboardingComplete' => false]
        );
        try {
            sendWelcomeEmail($user);
        } catch (Throwable) {
        }

        jsonOk(['user' => userPayload($cnx, mergeProfileData($cnx, $user), false, (int) $user['id'])]);
    }

    if ($action === 'signin') {
        $email = trim((string) ($body['email'] ?? ''));
        $password = (string) ($body['password'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonErr('Please enter a valid email address.');
        if (strlen($password) < 6) jsonErr('Password must be at least 6 characters.');

        $user = ConnectUser($cnx, ['email' => $email, 'password' => $password]);
        if ($user === false) {
            $user = authenticateAdminFallback($cnx, $email, $password);
        }
        if ($user === false) {
            jsonErr('Incorrect email or password.', 401);
        }

        loginUser($user);
        if ((int) ($user['isAdmin'] ?? 0) === 1) {
            jsonOk(['redirect' => 'backend/view/components/admin/admin.php']);
        }

        $user = mergeProfileData($cnx, $user);
        jsonOk(['user' => userPayload($cnx, $user, null, (int) $user['id'])]);
    }

    if ($action === 'me') {
        if (empty($_SESSION['user_id'])) jsonErr('Not authenticated.', 401);
        $user = getUserById($cnx, (int) $_SESSION['user_id']);
        if ($user === false) jsonErr('User not found.', 404);
        $user = mergeProfileData($cnx, $user);
        jsonOk(['user' => userPayload($cnx, $user, null, (int) $_SESSION['user_id'])]);
    }

    if ($action === 'update_profile') {
        if (empty($_SESSION['user_id'])) jsonErr('Not authenticated.', 401);
        $user = getUserById($cnx, (int) $_SESSION['user_id']);
        if ($user === false) jsonErr('User not found.', 404);
        $user = mergeProfileData($cnx, $user);

        $name = trim((string) ($body['name'] ?? ''));
        $email = trim((string) ($body['email'] ?? ''));
        $bio = trim((string) ($body['bio'] ?? ($user['bio'] ?? '')));
        $avatarInput = trim((string) ($body['avatar'] ?? ''));
        $coverInput = trim((string) ($body['cover'] ?? ''));
        $pseudo = trim((string) ($body['pseudo'] ?? ($user['pseudo'] ?? '')));
        $fieldIds = normalizeStringArray($body['fieldIds'] ?? ($user['fieldIds'] ?? []));
        $subjectIds = normalizeStringArray($body['subjectIds'] ?? ($user['subjectIds'] ?? []));
        $interestIds = normalizeStringArray($body['interestIds'] ?? ($user['interestIds'] ?? []));
        $fields = normalizeStringArray($body['fields'] ?? ($user['fields'] ?? []));
        $subjects = normalizeStringArray($body['subjects'] ?? ($user['subjects'] ?? []));
        $onboardingComplete = array_key_exists('onboardingComplete', $body)
            ? (bool) $body['onboardingComplete']
            : (bool) ($user['onboardingComplete'] ?? true);

        if (mb_strlen($name) < 2) jsonErr('Name must contain at least 2 characters.');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonErr('Please enter a valid email address.');

        $existing = getUserByEmail($cnx, $email);
        if ($existing !== false && (int) $existing['id'] !== (int) $_SESSION['user_id']) {
            jsonErr('This email is already used by another account.');
        }

        if (!updateUser($cnx, (int) $_SESSION['user_id'], [
            'name' => $name,
            'email' => $email,
            'password' => '',
            'plan' => $user['plan'],
            'isPremium' => $user['isPremium'],
            'isAdmin' => $user['isAdmin'],
        ])) {
            jsonErr('Unable to update the profile.', 500);
        }

        $avatar = $avatarInput !== '' ? saveProfileImage($avatarInput, 'avatar') : (string) ($user['avatar'] ?? '');
        $cover = $coverInput !== '' ? saveProfileImage($coverInput, 'cover') : (string) ($user['cover'] ?? '');

        try {
            persistProfileData($cnx, (int) $_SESSION['user_id'], $bio, $avatar, $cover, [
                'pseudo' => $pseudo,
                'fieldIds' => $fieldIds,
                'subjectIds' => $subjectIds,
                'interestIds' => $interestIds,
                'fields' => $fields,
                'subjects' => $subjects,
                'onboardingComplete' => $onboardingComplete,
            ]);
        } catch (Throwable $e) {
            jsonErr('Could not save profile media: ' . $e->getMessage(), 500);
        }

        $updated = getUserById($cnx, (int) $_SESSION['user_id']);
        if ($updated === false) jsonErr('Profile updated but user could not be loaded.', 500);
        $updated = mergeProfileData($cnx, $updated);
        loginUser($updated);
        jsonOk(['user' => userPayload($cnx, $updated, null, (int) $_SESSION['user_id'])]);
    }

    if ($action === 'cancel_onboarding') {
        $userId = (int) ($_SESSION['user_id'] ?? 0);

        if ($userId > 0) {
            $user = getUserById($cnx, $userId);
            if ($user !== false) {
                $profile = mergeProfileData($cnx, $user);
                $onboardingComplete = (bool) ($profile['onboardingComplete'] ?? false);
                if (!$onboardingComplete) {
                    deletePendingOnboardingUser($cnx, $userId);
                }
            }
        }

        clearAuthSession();
        jsonOk(['cancelled' => true]);
    }

    if ($action === 'forgot_password') {
        $email = trim((string) ($body['email'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonErr('Please enter a valid email address.');

        $user = getUserByEmail($cnx, $email);
        if ($user !== false) {
            ensurePasswordResetTable($cnx);
            $token = bin2hex(random_bytes(32));
            $hash = hash('sha256', $token);
            $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

            $cnx->prepare('UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE email = :email AND used_at IS NULL')
                ->execute([':email' => $email]);
            $cnx->prepare('INSERT INTO password_resets (email, token_hash, expires_at) VALUES (:email, :hash, :expires_at)')
                ->execute([
                    ':email' => $email,
                    ':hash' => $hash,
                    ':expires_at' => $expiresAt,
                ]);

            sendPasswordResetEmail($email, $user['name'], $token);
        }

        jsonOk(['email' => $email]);
    }

    if ($action === 'reset_password') {
        $email = trim((string) ($body['email'] ?? ''));
        $token = trim((string) ($body['token'] ?? ''));
        $password = (string) ($body['password'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonErr('Please enter a valid email address.');
        if ($token === '') jsonErr('Invalid reset token.');
        if (!passwordStrongEnough($password)) jsonErr('Password must be at least 10 characters and include a capital letter, a number and a symbol.');

        ensurePasswordResetTable($cnx);
        $stmt = $cnx->prepare('SELECT * FROM password_resets WHERE email = :email AND used_at IS NULL ORDER BY id DESC LIMIT 1');
        $stmt->execute([':email' => $email]);
        $reset = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$reset || !hash_equals($reset['token_hash'], hash('sha256', $token)) || strtotime($reset['expires_at']) < time()) {
            jsonErr('This reset link is invalid or has expired.', 410);
        }

        $user = getUserByEmail($cnx, $email);
        if ($user === false) jsonErr('User account was not found.', 404);

        updateUser($cnx, (int) $user['id'], [
            'name' => $user['name'],
            'email' => $user['email'],
            'password' => $password,
            'plan' => $user['plan'],
            'isPremium' => $user['isPremium'],
            'isAdmin' => $user['isAdmin'],
        ]);

        $cnx->prepare('UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = :id')->execute([':id' => $reset['id']]);
        jsonOk(['message' => 'Password updated successfully.']);
    }

    if ($action === 'signup_premium') {
        $name = trim((string) ($body['name'] ?? ''));
        $email = trim((string) ($body['email'] ?? ''));
        $password = (string) ($body['password'] ?? '');
        $method = strtolower(trim((string) ($body['method'] ?? 'card')));
        $amount = (float) ($body['amount'] ?? 9.00);
        $allowedMethods = ['card', 'd17', 'konnect', 'sobflous', 'ccp'];

        if (mb_strlen($name) < 2) jsonErr('Name must contain at least 2 characters.');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonErr('Please enter a valid email address.');
        if (!passwordStrongEnough($password)) jsonErr('Password must be at least 10 characters and include a capital letter, a number and a symbol.');
        if (!in_array($method, $allowedMethods, true)) {
            jsonErr('Unsupported payment method.');
        }
        if (getUserByEmail($cnx, $email) !== false) jsonErr('This email is already registered.');

        if (!AddUser($cnx, [
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'plan' => 'premium',
            'isPremium' => 1,
            'isAdmin' => 0,
        ])) {
            jsonErr('Unable to create the premium account.', 500);
        }
        $existing = getUserByEmail($cnx, $email);

        if ($existing === false) jsonErr('Premium user could not be loaded.', 500);
        loginUser($existing);
        persistProfileData(
            $cnx,
            (int) $existing['id'],
            (string) ($existing['bio'] ?? ''),
            normalizeProfileImagePath((string) ($existing['avatar'] ?? '')),
            normalizeProfileImagePath((string) ($existing['cover'] ?? '')),
            [
                'pseudo' => (string) ($existing['pseudo'] ?? ''),
                'fieldIds' => $existing['fieldIds'] ?? [],
                'subjectIds' => $existing['subjectIds'] ?? [],
                'interestIds' => $existing['interestIds'] ?? [],
                'fields' => $existing['fields'] ?? [],
                'subjects' => $existing['subjects'] ?? [],
                'onboardingComplete' => false,
            ]
        );
        if (!upgradeToPremium($cnx, (int) $existing['id'], $method, $amount)) {
            jsonErr('Unable to activate premium access.', 500);
        }

        $updated = getUserById($cnx, (int) $existing['id']);
        if ($updated === false) jsonErr('Premium user could not be reloaded.', 500);
        loginUser($updated);
        jsonOk(['user' => userPayload($cnx, mergeProfileData($cnx, $updated), false, (int) $updated['id'])]);
    }

    if ($action === 'upgrade_to_premium') {
        if (empty($_SESSION['user_id'])) jsonErr('You need to sign in first.', 401);

        $method = strtolower(trim((string) ($body['method'] ?? 'card')));
        $allowedMethods = ['card', 'd17', 'konnect', 'sobflous', 'ccp'];
        if (!in_array($method, $allowedMethods, true)) {
            jsonErr('Unsupported payment method.');
        }

        $amount = (float) ($body['amount'] ?? 9.00);
        if (!upgradeToPremium($cnx, (int) $_SESSION['user_id'], $method, $amount)) {
            jsonErr('Unable to upgrade the account.', 500);
        }

        $user = getUserById($cnx, (int) $_SESSION['user_id']);
        if ($user === false) jsonErr('User not found after upgrade.', 404);
        $user = mergeProfileData($cnx, $user);
        loginUser($user);
        try {
            $subject = 'Your IBlog premium access is active';
            $html = '<div style="font-family:Arial,sans-serif;color:#1c1a16;line-height:1.6"><h2>Premium activated</h2><p>Hello ' . htmlspecialchars($user['name'], ENT_QUOTES, 'UTF-8') . ',</p><p>Your premium access is now active.</p><p>Payment method: <strong>' . htmlspecialchars(strtoupper($method), ENT_QUOTES, 'UTF-8') . '</strong></p></div>';
            $text = "Hello {$user['name']},\n\nYour premium access is now active.\nPayment method: " . strtoupper($method);
            Mailer::send($user['email'], $subject, $html, $text);
        } catch (Throwable) {
        }
        jsonOk(['user' => userPayload($cnx, $user, null, (int) $_SESSION['user_id'])]);
    }

    if ($action === 'get_public_user') {
        if (empty($_SESSION['user_id'])) jsonErr('Not authenticated.', 401);
        $targetUserId = (int) ($body['targetUserId'] ?? $body['userId'] ?? 0);
        $targetEmail = trim((string) ($body['targetEmail'] ?? $body['email'] ?? ''));
        $target = resolveUserByTarget($cnx, $targetUserId, $targetEmail);
        if ($target === false) jsonErr('User not found.', 404);

        jsonOk([
            'user' => messageUserPayload($cnx, $target, (int) $_SESSION['user_id']),
        ]);
    }

    if ($action === 'follow_user' || $action === 'unfollow_user') {
        if (empty($_SESSION['user_id'])) jsonErr('Not authenticated.', 401);

        $viewerId = (int) $_SESSION['user_id'];
        $targetUserId = (int) ($body['targetUserId'] ?? $body['userId'] ?? 0);
        $targetEmail = trim((string) ($body['targetEmail'] ?? $body['email'] ?? ''));
        $target = resolveUserByTarget($cnx, $targetUserId, $targetEmail);

        if ($target === false) jsonErr('User not found.', 404);
        $targetUserId = (int) ($target['id'] ?? 0);
        if ($targetUserId === $viewerId) jsonErr('You cannot follow your own account.', 400);

        $changed = $action === 'follow_user'
            ? followUser($cnx, $viewerId, $targetUserId)
            : unfollowUser($cnx, $viewerId, $targetUserId);

        if (!$changed && $action === 'follow_user') {
            jsonErr('Unable to follow this user.', 500);
        }

        $viewer = getUserById($cnx, $viewerId);
        $updatedTarget = getUserById($cnx, $targetUserId);
        if ($viewer === false || $updatedTarget === false) {
            jsonErr('Could not refresh follow state.', 500);
        }

        jsonOk([
            'viewer' => userPayload($cnx, mergeProfileData($cnx, $viewer), true, $viewerId),
            'target' => messageUserPayload($cnx, $updatedTarget, $viewerId),
        ]);
    }

    if ($action === 'list_users') {
        if (empty($_SESSION['user_id'])) jsonErr('Not authenticated.', 401);
        $query = trim((string) ($body['q'] ?? ''));
        $limit = (int) ($body['limit'] ?? 24);
        jsonOk(['users' => listDirectoryUsers($cnx, (int) $_SESSION['user_id'], $query, $limit)]);
    }

    if ($action === 'dm_threads') {
        if (empty($_SESSION['user_id'])) jsonErr('Not authenticated.', 401);
        jsonOk(['threads' => getPrivateMessageThreads($cnx, (int) $_SESSION['user_id'])]);
    }

    if ($action === 'dm_messages') {
        if (empty($_SESSION['user_id'])) jsonErr('Not authenticated.', 401);
        $partnerId = (int) ($body['partnerId'] ?? 0);
        $messages = getPrivateMessageHistory($cnx, (int) $_SESSION['user_id'], $partnerId);
        $partner = $partnerId > 0 ? getUserById($cnx, $partnerId) : false;
        jsonOk([
            'partner' => $partner !== false ? messageUserPayload($cnx, $partner) : null,
            'messages' => $messages,
        ]);
    }

    if ($action === 'dm_send') {
        if (empty($_SESSION['user_id'])) jsonErr('Not authenticated.', 401);
        $recipientId = (int) ($body['recipientId'] ?? 0);
        $message = (string) ($body['message'] ?? $body['body'] ?? '');
        $saved = sendPrivateMessage($cnx, (int) $_SESSION['user_id'], $recipientId, $message);
        jsonOk(['message' => $saved]);
    }

    if ($action === 'dm_delete_thread') {
        if (empty($_SESSION['user_id'])) jsonErr('Not authenticated.', 401);
        $partnerId = (int) ($body['partnerId'] ?? 0);
        $deleted = deletePrivateMessageThread($cnx, (int) $_SESSION['user_id'], $partnerId);
        jsonOk([
            'partnerId' => $partnerId,
            'deletedCount' => $deleted,
            'threads' => getPrivateMessageThreads($cnx, (int) $_SESSION['user_id']),
        ]);
    }

    jsonErr('Unknown action.');
} catch (Throwable $e) {
    jsonErr($e->getMessage(), 500);
}
