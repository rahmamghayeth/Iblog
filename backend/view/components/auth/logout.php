<?php
declare(strict_types=1);

session_start();
$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 3600,
        'path' => $params['path'] ?: '/',
        'domain' => $params['domain'] ?: '',
        'secure' => !empty($params['secure']),
        'httponly' => !empty($params['httponly']),
        'samesite' => $params['samesite'] ?? 'Lax',
    ]);
}

session_destroy();

setcookie('iblog_user', '', [
    'expires' => time() - 3600,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Lax',
]);

if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) || str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json')) {
    header('Content-Type: application/json');
    echo json_encode(['ok' => true]);
} else {
    header('Location: ../../../../index.php');
}
exit();
