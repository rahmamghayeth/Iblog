<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

if (session_status() !== PHP_SESSION_ACTIVE) {
    @session_start();
}

function jsonOk(array $data = []): never
{
    echo json_encode(['ok' => true] + $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jsonErr(string $message, int $status = 400): never
{
    http_response_code($status);
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

function tableExists(PDO $cnx, string $table): bool
{
    try {
        $stmt = $cnx->prepare('SHOW TABLES LIKE :table');
        $stmt->execute([':table' => $table]);
        return (bool) $stmt->fetchColumn();
    } catch (Throwable) {
        return false;
    }
}

function columnExists(PDO $cnx, string $table, string $column): bool
{
    try {
        $stmt = $cnx->prepare("SHOW COLUMNS FROM `{$table}` LIKE :column");
        $stmt->execute([':column' => $column]);
        return (bool) $stmt->fetchColumn();
    } catch (Throwable) {
        return false;
    }
}

function normalizeProfileAssetPath(string $path): string
{
    $path = trim($path);
    if ($path === '') {
        return '';
    }

    if (preg_match('#^backend/public/uploads/(?:avatars|covers)/[A-Za-z0-9._-]+$#', $path) === 1) {
        return substr($path, strlen('backend/'));
    }

    if (preg_match('#^/blog_12(?:3)?/public/uploads/(?:avatars|covers)/[A-Za-z0-9._-]+$#', $path) === 1) {
        return preg_replace('#^/blog_12(?:3)?/#', '', $path) ?: $path;
    }

    if (preg_match('#^https?://[^/]+/blog_12(?:3)?/public/uploads/(?:avatars|covers)/[A-Za-z0-9._-]+$#', $path) === 1) {
        return preg_replace('#^https?://[^/]+/blog_12(?:3)?/#', '', $path) ?: $path;
    }

    if (preg_match('#^/blog/blog/public/uploads/(?:avatars|covers)/[A-Za-z0-9._-]+$#', $path) === 1) {
        return preg_replace('#^/blog/blog/#', '', $path) ?: $path;
    }

    if (preg_match('#^https?://[^/]+/blog/blog/public/uploads/(?:avatars|covers)/[A-Za-z0-9._-]+$#', $path) === 1) {
        return preg_replace('#^https?://[^/]+/blog/blog/#', '', $path) ?: $path;
    }

    return $path;
}

function resolveUserId(array $body): int
{
    $userId = (int) ($body['userId'] ?? 0);
    if ($userId > 0) {
        return $userId;
    }

    $email = trim((string) ($body['userEmail'] ?? ''));
    if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
        global $cnx;
        if ($cnx instanceof PDO) {
            try {
                $stmt = $cnx->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
                $stmt->execute([':email' => $email]);
                $resolvedId = (int) ($stmt->fetchColumn() ?: 0);
                if ($resolvedId > 0) {
                    return $resolvedId;
                }
            } catch (Throwable) {
                return 0;
            }
        }
    }

    if (!empty($_SESSION['user_id'])) {
        return (int) $_SESSION['user_id'];
    }

    return 0;
}

function platformSummary(PDO $cnx): array
{
    $users = tableExists($cnx, 'users')
        ? (int) $cnx->query('SELECT COUNT(*) FROM users')->fetchColumn()
        : 0;
    $premium = tableExists($cnx, 'users')
        ? (int) $cnx->query("SELECT COUNT(*) FROM users WHERE plan = 'premium'")->fetchColumn()
        : 0;
    $articles = tableExists($cnx, 'article')
        ? (int) $cnx->query("SELECT COUNT(*) FROM article WHERE status = 'published'")->fetchColumn()
        : 0;

    return [
        'total_users' => $users,
        'total_articles' => $articles,
        'premium_count' => $premium,
    ];
}

function getMyStats(PDO $cnx, int $userId): array
{
    $articlesStmt = $cnx->prepare(
        "SELECT
            COUNT(*) AS articles,
            COALESCE(SUM(views), 0) AS views,
            COALESCE(SUM(likesCount), 0) AS likes
         FROM article
         WHERE userId = :uid
           AND status = 'published'"
    );
    $articlesStmt->execute([':uid' => $userId]);
    $articleStats = $articlesStmt->fetch(PDO::FETCH_ASSOC) ?: [];

    $commentsStmt = $cnx->prepare(
        "SELECT COUNT(*) AS comments
         FROM comment c
         INNER JOIN article a ON a.id = c.articleId
         WHERE a.userId = :uid
           AND a.status = 'published'"
    );
    $commentsStmt->execute([':uid' => $userId]);
    $comments = (int) $commentsStmt->fetchColumn();

    $savedStmt = $cnx->prepare(
        'SELECT COUNT(*) FROM savedarticle WHERE userId = :uid'
    );
    $savedStmt->execute([':uid' => $userId]);
    $saved = (int) $savedStmt->fetchColumn();

    $topStmt = $cnx->prepare(
        "SELECT
            id,
            title,
            COALESCE(category, 'General') AS category,
            COALESCE(readingTime, '5 min') AS readingTime,
            COALESCE(likesCount, 0) AS likesCount,
            COALESCE(views, 0) AS views
         FROM article
         WHERE userId = :uid
           AND status = 'published'
         ORDER BY views DESC, likesCount DESC, createdAt DESC
         LIMIT 5"
    );
    $topStmt->execute([':uid' => $userId]);
    $topRows = $topStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    return [
        'articles' => (int) ($articleStats['articles'] ?? 0),
        'views' => (int) ($articleStats['views'] ?? 0),
        'likes' => (int) ($articleStats['likes'] ?? 0),
        'comments' => $comments,
        'saved' => $saved,
        'topArticles' => array_map(static function (array $row): array {
            return [
                'id' => (int) ($row['id'] ?? 0),
                'title' => (string) ($row['title'] ?? 'Untitled article'),
                'category' => (string) ($row['category'] ?? 'General'),
                'readingTime' => (string) ($row['readingTime'] ?? '5 min'),
                'likesCount' => (int) ($row['likesCount'] ?? 0),
                'views' => (int) ($row['views'] ?? 0),
            ];
        }, $topRows),
    ];
}

function getChart(PDO $cnx, int $userId): array
{
    $stmt = $cnx->prepare(
        "SELECT
            YEARWEEK(createdAt, 3) AS weekKey,
            COALESCE(SUM(views), 0) AS views,
            COALESCE(SUM(likesCount), 0) AS likes
         FROM article
         WHERE userId = :uid
           AND status = 'published'
           AND createdAt >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
         GROUP BY YEARWEEK(createdAt, 3)
         ORDER BY weekKey ASC"
    );
    $stmt->execute([':uid' => $userId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $byWeek = [];
    foreach ($rows as $row) {
        $byWeek[(int) ($row['weekKey'] ?? 0)] = [
            'views' => (int) ($row['views'] ?? 0),
            'likes' => (int) ($row['likes'] ?? 0),
        ];
    }

    $weeks = [];
    $cursor = new DateTimeImmutable('monday this week');
    $cursor = $cursor->modify('-11 weeks');

    for ($i = 0; $i < 12; $i++) {
        $weekKey = (int) $cursor->format('oW');
        $weekData = $byWeek[$weekKey] ?? ['views' => 0, 'likes' => 0];
        $weeks[] = [
            'label' => $cursor->format('M j'),
            'views' => (int) $weekData['views'],
            'likes' => (int) $weekData['likes'],
        ];
        $cursor = $cursor->modify('+1 week');
    }

    return [
        'weeks' => $weeks,
    ];
}

function buildStreak(array $days): int
{
    $activeDays = [];
    foreach ($days as $day) {
        if ((int) ($day['count'] ?? 0) > 0) {
            $activeDays[(string) $day['date']] = true;
        }
    }

    $streak = 0;
    $cursor = new DateTime('today');
    while (true) {
        $key = $cursor->format('Y-m-d');
        if (!isset($activeDays[$key])) {
            break;
        }
        $streak++;
        $cursor->modify('-1 day');
    }
    return $streak;
}

function getActivity(PDO $cnx, int $userId): array
{
    $days = [];
    $counts = [];
    $start = new DateTime('today -364 day');

    $queries = [
        [
            'sql' => "SELECT DATE(createdAt) AS eventDate, COUNT(*) AS total
                      FROM article
                      WHERE userId = :uid
                        AND createdAt >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
                      GROUP BY DATE(createdAt)",
        ],
        [
            'sql' => "SELECT DATE(createdAt) AS eventDate, COUNT(*) AS total
                      FROM comment
                      WHERE userId = :uid
                        AND createdAt >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
                      GROUP BY DATE(createdAt)",
        ],
        [
            'sql' => "SELECT DATE(savedAt) AS eventDate, COUNT(*) AS total
                      FROM savedarticle
                      WHERE userId = :uid
                        AND savedAt >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
                      GROUP BY DATE(savedAt)",
        ],
    ];

    foreach ($queries as $query) {
        $stmt = $cnx->prepare($query['sql']);
        $stmt->execute([':uid' => $userId]);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $date = (string) ($row['eventDate'] ?? '');
            if ($date === '') {
                continue;
            }
            $counts[$date] = ($counts[$date] ?? 0) + (int) ($row['total'] ?? 0);
        }
    }

    for ($i = 0; $i < 365; $i++) {
        $date = clone $start;
        $date->modify("+{$i} day");
        $key = $date->format('Y-m-d');
        $days[] = ['date' => $key, 'count' => (int) ($counts[$key] ?? 0)];
    }

    $recent = [];

    $articleStmt = $cnx->prepare(
        "SELECT title, createdAt
         FROM article
         WHERE userId = :uid
         ORDER BY createdAt DESC
         LIMIT 5"
    );
    $articleStmt->execute([':uid' => $userId]);
    foreach ($articleStmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        $recent[] = [
            'type' => 'article',
            'label' => 'Published article',
            'title' => (string) ($row['title'] ?? 'Untitled article'),
            'at' => (string) ($row['createdAt'] ?? ''),
        ];
    }

    $commentStmt = $cnx->prepare(
        "SELECT a.title, c.createdAt
         FROM comment c
         LEFT JOIN article a ON a.id = c.articleId
         WHERE c.userId = :uid
         ORDER BY c.createdAt DESC
         LIMIT 5"
    );
    $commentStmt->execute([':uid' => $userId]);
    foreach ($commentStmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        $recent[] = [
            'type' => 'comment',
            'label' => 'Left a comment',
            'title' => (string) ($row['title'] ?? 'An article'),
            'at' => (string) ($row['createdAt'] ?? ''),
        ];
    }

    $savedStmt = $cnx->prepare(
        "SELECT a.title, sa.savedAt
         FROM savedarticle sa
         LEFT JOIN article a ON a.id = sa.articleId
         WHERE sa.userId = :uid
         ORDER BY sa.savedAt DESC
         LIMIT 5"
    );
    $savedStmt->execute([':uid' => $userId]);
    foreach ($savedStmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        $recent[] = [
            'type' => 'saved',
            'label' => 'Saved article',
            'title' => (string) ($row['title'] ?? 'An article'),
            'at' => (string) ($row['savedAt'] ?? ''),
        ];
    }

    usort($recent, static function (array $a, array $b): int {
        return (strtotime((string) ($b['at'] ?? '')) ?: 0) <=> (strtotime((string) ($a['at'] ?? '')) ?: 0);
    });

    return [
        'days' => $days,
        'streak' => buildStreak($days),
        'recent' => array_slice($recent, 0, 8),
    ];
}

function getTopAuthors(PDO $cnx, int $currentUserId = 0): array
{
    $hasAvatar = columnExists($cnx, 'users', 'avatar');
    $hasCover = columnExists($cnx, 'users', 'cover');
    $hasBio = columnExists($cnx, 'users', 'bio');
    $hasUserProfile = tableExists($cnx, 'user_profile');
    $avatarExpr = $hasUserProfile
        ? 'COALESCE(up.avatar, ' . ($hasAvatar ? 'u.avatar' : '""') . ', "")'
        : ($hasAvatar ? 'COALESCE(u.avatar, "")' : '""');
    $coverExpr = $hasUserProfile
        ? 'COALESCE(up.cover, ' . ($hasCover ? 'u.cover' : '""') . ', "")'
        : ($hasCover ? 'COALESCE(u.cover, "")' : '""');
    $bioExpr = $hasUserProfile
        ? 'COALESCE(up.bio, ' . ($hasBio ? 'u.bio' : '""') . ', "")'
        : ($hasBio ? 'COALESCE(u.bio, "")' : '""');

    $sql = "SELECT
                u.id,
                u.name,
                COALESCE(u.isPremium, 0) AS isPremium,
                {$avatarExpr} AS avatar,
                {$coverExpr} AS cover,
                {$bioExpr} AS bio,
                COALESCE(ast.articleCount, 0) AS articleCount,
                COALESCE(ast.totalLikes, 0) AS totalLikes,
                COALESCE(ast.totalViews, 0) AS totalViews,
                COALESCE(cst.totalComments, 0) AS totalComments,
                COALESCE(sst.totalSaves, 0) AS totalSaves,
                (
                    COALESCE(ast.articleCount, 0) +
                    COALESCE(ast.totalLikes, 0) +
                    COALESCE(ast.totalViews, 0) +
                    COALESCE(cst.totalComments, 0) +
                    COALESCE(sst.totalSaves, 0)
                ) AS totalInteractions
            FROM users u
            " . ($hasUserProfile ? 'LEFT JOIN user_profile up ON up.userId = u.id' : '') . "
            LEFT JOIN (
                SELECT
                    userId,
                    COUNT(id) AS articleCount,
                    COALESCE(SUM(likesCount), 0) AS totalLikes,
                    COALESCE(SUM(views), 0) AS totalViews
                FROM article
                WHERE status = 'published'
                GROUP BY userId
            ) ast ON ast.userId = u.id
            LEFT JOIN (
                SELECT
                    a.userId,
                    COUNT(c.id) AS totalComments
                FROM article a
                INNER JOIN comment c ON c.articleId = a.id
                WHERE a.status = 'published'
                GROUP BY a.userId
            ) cst ON cst.userId = u.id
            LEFT JOIN (
                SELECT
                    a.userId,
                    COUNT(sa.id) AS totalSaves
                FROM article a
                INNER JOIN savedarticle sa ON sa.articleId = a.id
                WHERE a.status = 'published'
                GROUP BY a.userId
            ) sst ON sst.userId = u.id
            WHERE COALESCE(u.isAdmin, 0) = 0
              AND COALESCE(ast.articleCount, 0) > 0
              AND (
                  COALESCE(ast.totalLikes, 0) > 0
                  OR COALESCE(ast.totalViews, 0) > 0
                  OR COALESCE(cst.totalComments, 0) > 0
                  OR COALESCE(sst.totalSaves, 0) > 0
              )";

    $sql .= ' ORDER BY totalInteractions DESC, totalLikes DESC, totalViews DESC, articleCount DESC, u.name ASC';

    $stmt = $cnx->prepare($sql);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    return [
        'authors' => array_map(function (array $row) use ($cnx, $currentUserId): array {
            $name = (string) ($row['name'] ?? 'Unknown');
            $authorId = (int) ($row['id'] ?? 0);
            $follow = getUserFollowStats($cnx, $authorId);
            return [
                'id' => $authorId,
                'name' => $name,
                'initial' => strtoupper($name[0] ?? 'U'),
                'isPremium' => (bool) ($row['isPremium'] ?? 0),
                'avatar' => normalizeProfileAssetPath((string) ($row['avatar'] ?? '')),
                'cover' => normalizeProfileAssetPath((string) ($row['cover'] ?? '')),
                'bio' => (string) ($row['bio'] ?? ''),
                'followers' => (int) ($follow['followers'] ?? 0),
                'following' => (int) ($follow['following'] ?? 0),
                'isFollowing' => $currentUserId > 0 && $currentUserId !== $authorId
                    ? isUserFollowing($cnx, $currentUserId, $authorId)
                    : false,
                'articleCount' => (int) ($row['articleCount'] ?? 0),
                'totalLikes' => (int) ($row['totalLikes'] ?? 0),
                'totalViews' => (int) ($row['totalViews'] ?? 0),
                'totalComments' => (int) ($row['totalComments'] ?? 0),
                'totalSaves' => (int) ($row['totalSaves'] ?? 0),
                'totalInteractions' => (int) ($row['totalInteractions'] ?? 0),
            ];
        }, $rows),
    ];
}

try {
    require_once __DIR__ . '/../../../config/database.php';
    require_once __DIR__ . '/../../../controller/UserController.php';
    if (!($cnx instanceof PDO)) {
        jsonErr(databaseConnectionError() ?? 'Database connection failed.', 500);
    }

    $body = readJsonBody();
    $action = trim((string) ($body['action'] ?? 'summary'));
    $userId = resolveUserId($body);

    if ($action === 'track_event') {
        jsonOk(['tracked' => false]);
    }

    if ($action === 'my_stats') {
        if ($userId <= 0) {
            jsonOk([
                'articles' => 0,
                'views' => 0,
                'likes' => 0,
                'comments' => 0,
                'saved' => 0,
                'topArticles' => [],
            ]);
        }
        jsonOk(getMyStats($cnx, $userId));
    }

    if ($action === 'chart') {
        if ($userId <= 0) {
            jsonOk(['weeks' => []]);
        }
        jsonOk(getChart($cnx, $userId));
    }

    if ($action === 'activity') {
        if ($userId <= 0) {
            jsonOk(['days' => [], 'streak' => 0, 'recent' => []]);
        }
        jsonOk(getActivity($cnx, $userId));
    }

    if ($action === 'top_authors' || $action === 'topAuthors') {
        jsonOk(getTopAuthors($cnx, $userId));
    }

    jsonOk(platformSummary($cnx));
} catch (Throwable $e) {
    jsonErr('Stats API error: ' . $e->getMessage(), 500);
}
