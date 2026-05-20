<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

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

function readBody(): array
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
    return dbTableExists($cnx, $table);
}

function columnExists(PDO $cnx, string $table, string $column): bool
{
    return dbColumnExists($cnx, $table, $column);
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

    return $path;
}

function lowered(string $value): string
{
    return mb_strtolower(trim($value), 'UTF-8');
}

function tokenize(string $value): array
{
    $value = lowered($value);
    $value = preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', $value) ?? '';
    $parts = preg_split('/\s+/u', trim($value)) ?: [];
    return array_values(array_filter($parts, static fn(string $token): bool => mb_strlen($token, 'UTF-8') >= 2));
}

function containsAllTokens(array $tokens, string $haystack): bool
{
    $haystack = lowered($haystack);
    foreach ($tokens as $token) {
        if ($token !== '' && !str_contains($haystack, $token)) {
            return false;
        }
    }
    return $tokens !== [];
}

function tokenMatchStrength(string $queryToken, string $fieldToken): float
{
    $queryToken = lowered($queryToken);
    $fieldToken = lowered($fieldToken);
    if ($queryToken === '' || $fieldToken === '') {
        return 0.0;
    }

    if ($fieldToken === $queryToken) {
        return 1.0;
    }

    if (str_starts_with($fieldToken, $queryToken) || str_starts_with($queryToken, $fieldToken)) {
        return 0.82;
    }

    if (str_contains($fieldToken, $queryToken) || str_contains($queryToken, $fieldToken)) {
        return 0.62;
    }

    return 0.0;
}

function retrievalMetricsForField(array $tokens, string $value, string $queryLower = ''): array
{
    $fieldTokens = tokenize($value);
    if ($tokens === [] || $fieldTokens === []) {
        return [
            'precision' => 0.0,
            'recall' => 0.0,
            'fMeasure' => 0.0,
            'exact' => false,
            'prefix' => false,
            'contains' => false,
        ];
    }

    $queryHitTotal = 0.0;
    foreach ($tokens as $token) {
        $best = 0.0;
        foreach ($fieldTokens as $fieldToken) {
            $best = max($best, tokenMatchStrength($token, $fieldToken));
            if ($best >= 1.0) {
                break;
            }
        }
        $queryHitTotal += $best;
    }

    $fieldHitTotal = 0.0;
    foreach ($fieldTokens as $fieldToken) {
        $best = 0.0;
        foreach ($tokens as $token) {
            $best = max($best, tokenMatchStrength($token, $fieldToken));
            if ($best >= 1.0) {
                break;
            }
        }
        $fieldHitTotal += $best;
    }

    $precision = $fieldTokens !== [] ? min(1.0, $fieldHitTotal / count($fieldTokens)) : 0.0;
    $recall = $tokens !== [] ? min(1.0, $queryHitTotal / count($tokens)) : 0.0;
    $fMeasure = ($precision > 0.0 && $recall > 0.0)
        ? (2 * $precision * $recall) / ($precision + $recall)
        : 0.0;

    $lowerValue = lowered($value);

    return [
        'precision' => round($precision, 6),
        'recall' => round($recall, 6),
        'fMeasure' => round($fMeasure, 6),
        'exact' => $queryLower !== '' && ($lowerValue === $queryLower || in_array($queryLower, $fieldTokens, true)),
        'prefix' => $queryLower !== '' && (
            str_starts_with($lowerValue, $queryLower)
            || array_reduce($fieldTokens, static fn(bool $carry, string $token): bool => $carry || str_starts_with($token, $queryLower), false)
        ),
        'contains' => $queryLower !== '' && str_contains($lowerValue, $queryLower),
    ];
}

function scoreTextMatch(string $query, array $tokens, array $fields, float $engagementBoost = 0.0): array
{
    $queryLower = lowered($query);
    $score = 0.0;
    $weightedPrecision = 0.0;
    $weightedRecall = 0.0;
    $matchedWeight = 0.0;
    $exact = false;
    $prefix = false;
    $contains = false;
    $topicalBoost = 0.0;

    foreach ($fields as $field => $config) {
        $weight = is_array($config) ? (float) ($config['weight'] ?? 1.0) : (float) $config;
        $isTopical = is_array($config) ? !empty($config['topic']) : false;
        $value = trim((string) $field);
        if ($value === '' || $weight <= 0) {
            continue;
        }

        $metrics = retrievalMetricsForField($tokens, $value, $queryLower);
        if (($metrics['precision'] ?? 0) <= 0 && ($metrics['recall'] ?? 0) <= 0) {
            continue;
        }

        $matchedWeight += $weight;
        $weightedPrecision += (float) $metrics['precision'] * $weight;
        $weightedRecall += (float) $metrics['recall'] * $weight;
        $score += (
            ((float) $metrics['fMeasure'] * 75)
            + ((float) $metrics['precision'] * 22)
            + ((float) $metrics['recall'] * 14)
        ) * $weight;

        if (!empty($metrics['exact'])) {
            $exact = true;
            $score += 18 * $weight;
            if ($isTopical) {
                $topicalBoost += 16;
            }
        } elseif (!empty($metrics['prefix'])) {
            $prefix = true;
            $score += 9 * $weight;
            if ($isTopical) {
                $topicalBoost += 7;
            }
        } elseif (!empty($metrics['contains'])) {
            $contains = true;
            if ($isTopical) {
                $topicalBoost += 3;
            }
        }
    }

    if ($matchedWeight <= 0 || (!$exact && !$prefix && !$contains && !containsAllTokens($tokens, implode(' ', array_keys($fields))))) {
        return ['score' => 0.0, 'confidence' => 0.0, 'matchTier' => 'good_match', 'precision' => 0.0, 'recall' => 0.0, 'fMeasure' => 0.0];
    }

    $precision = min(1.0, $weightedPrecision / $matchedWeight);
    $recall = min(1.0, $weightedRecall / $matchedWeight);
    $fMeasure = ($precision > 0.0 && $recall > 0.0)
        ? (2 * $precision * $recall) / ($precision + $recall)
        : 0.0;

    $score += ($fMeasure * 100) + ($precision * 36) + ($recall * 28) + $topicalBoost + $engagementBoost;
    $confidence = min(1.0, ($fMeasure * 0.62) + ($precision * 0.23) + ($recall * 0.15) + ($exact ? 0.12 : ($prefix ? 0.05 : 0.0)));
    $matchTier = ($exact && $fMeasure >= 0.7)
        ? 'exact'
        : ($fMeasure >= 0.72 ? 'high_precision' : ($fMeasure >= 0.42 ? 'strong_match' : 'good_match'));

    return [
        'score' => round($score, 6),
        'confidence' => round($confidence, 4),
        'matchTier' => $matchTier,
        'precision' => round($precision, 4),
        'recall' => round($recall, 4),
        'fMeasure' => round($fMeasure, 4),
    ];
}

function loadArticleMatches(PDO $cnx, string $query, array $tokens, int $limit): array
{
    if (!tableExists($cnx, 'article') || !tableExists($cnx, 'users')) {
        return [];
    }

    $hasUserProfile = tableExists($cnx, 'user_profile');
    $hasStatus = columnExists($cnx, 'article', 'status');
    $hasTags = columnExists($cnx, 'article', 'tags');
    $hasBody = columnExists($cnx, 'article', 'body');
    $hasCategory = columnExists($cnx, 'article', 'category');
    $hasReadingTime = columnExists($cnx, 'article', 'readingTime');
    $hasCoverImage = columnExists($cnx, 'article', 'coverImage');
    $hasViews = columnExists($cnx, 'article', 'views');
    $hasLikes = columnExists($cnx, 'article', 'likesCount');
    $hasUserAvatar = columnExists($cnx, 'users', 'avatar');

    $avatarExpr = $hasUserProfile
        ? 'COALESCE(up.avatar, ' . ($hasUserAvatar ? 'u.avatar' : '""') . ', "")'
        : ($hasUserAvatar ? 'COALESCE(u.avatar, "")' : '""');

    $sql = "SELECT
                a.id,
                a.userId,
                a.title,
                " . ($hasCategory ? 'COALESCE(a.category, "General")' : '"General"') . " AS category,
                " . ($hasTags ? 'COALESCE(a.tags, "")' : '""') . " AS tags,
                " . ($hasBody ? 'COALESCE(a.body, "")' : '""') . " AS body,
                " . ($hasReadingTime ? 'COALESCE(a.readingTime, "5 min")' : '"5 min"') . " AS readingTime,
                " . ($hasCoverImage ? 'COALESCE(a.coverImage, "")' : '""') . " AS coverImage,
                " . ($hasLikes ? 'COALESCE(a.likesCount, 0)' : '0') . " AS likesCount,
                " . ($hasViews ? 'COALESCE(a.views, 0)' : '0') . " AS views,
                u.name AS author,
                {$avatarExpr} AS authorAvatar
            FROM article a
            INNER JOIN users u ON u.id = a.userId
            " . ($hasUserProfile ? 'LEFT JOIN user_profile up ON up.userId = u.id' : '') . "
            WHERE COALESCE(u.isAdmin, 0) = 0";

    if ($hasStatus) {
        $sql .= " AND a.status = 'published'";
    }

    $sql .= " AND (
                a.title LIKE :titleQuery
                OR u.name LIKE :authorQuery
                " . ($hasCategory ? 'OR a.category LIKE :categoryQuery ' : '') . "
                " . ($hasTags ? 'OR a.tags LIKE :tagsQuery ' : '') . "
                " . ($hasBody ? 'OR a.body LIKE :bodyQuery ' : '') . "
            )
            ORDER BY " . ($hasViews ? 'COALESCE(a.views, 0)' : '0') . " DESC, " . ($hasLikes ? 'COALESCE(a.likesCount, 0)' : '0') . " DESC, a.id DESC
            LIMIT {$limit}";

    $stmt = $cnx->prepare($sql);
    $like = '%' . $query . '%';
    $params = [
        ':titleQuery' => $like,
        ':authorQuery' => $like,
    ];
    if ($hasCategory) {
        $params[':categoryQuery'] = $like;
    }
    if ($hasTags) {
        $params[':tagsQuery'] = $like;
    }
    if ($hasBody) {
        $params[':bodyQuery'] = $like;
    }
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $results = [];
    foreach ($rows as $row) {
        $engagementBoost = min(8.0, log(1 + max(0, (int) ($row['views'] ?? 0)) + max(0, (int) ($row['likesCount'] ?? 0))));
        $match = scoreTextMatch($query, $tokens, [
            (string) ($row['title'] ?? '') => ['weight' => 2.6, 'topic' => true],
            (string) ($row['author'] ?? '') => ['weight' => 0.9],
            (string) ($row['category'] ?? '') => ['weight' => 1.8, 'topic' => true],
            (string) ($row['tags'] ?? '') => ['weight' => 1.6, 'topic' => true],
            (string) ($row['body'] ?? '') => ['weight' => 0.25],
        ], $engagementBoost);

        if (($match['score'] ?? 0) <= 0) {
            continue;
        }

        $results[] = [
            'id' => (int) ($row['id'] ?? 0),
            'type' => 'article',
            'authorId' => (int) ($row['userId'] ?? 0),
            'title' => (string) ($row['title'] ?? ''),
            'author' => (string) ($row['author'] ?? 'Unknown'),
            'authorAvatar' => normalizeProfileAssetPath((string) ($row['authorAvatar'] ?? '')),
            'cat' => (string) ($row['category'] ?? 'General'),
            'tags' => (string) ($row['tags'] ?? ''),
            'img' => (string) ($row['coverImage'] ?? ''),
            'readTime' => (string) ($row['readingTime'] ?? '5 min'),
            'likes' => (int) ($row['likesCount'] ?? 0),
            'views' => (int) ($row['views'] ?? 0),
            'score' => $match['score'],
            'confidence' => $match['confidence'],
            'matchTier' => $match['matchTier'],
            'precision' => $match['precision'],
            'recall' => $match['recall'],
            'fMeasure' => $match['fMeasure'],
        ];
    }

    return $results;
}

function loadUserMatches(PDO $cnx, string $query, array $tokens, int $limit): array
{
    if (!tableExists($cnx, 'users')) {
        return [];
    }

    $hasUserProfile = tableExists($cnx, 'user_profile');
    $hasUserAvatar = columnExists($cnx, 'users', 'avatar');
    $hasUserCover = columnExists($cnx, 'users', 'cover');
    $hasUserBio = columnExists($cnx, 'users', 'bio');

    $avatarExpr = $hasUserProfile
        ? 'COALESCE(up.avatar, ' . ($hasUserAvatar ? 'u.avatar' : '""') . ', "")'
        : ($hasUserAvatar ? 'COALESCE(u.avatar, "")' : '""');
    $coverExpr = $hasUserProfile
        ? 'COALESCE(up.cover, ' . ($hasUserCover ? 'u.cover' : '""') . ', "")'
        : ($hasUserCover ? 'COALESCE(u.cover, "")' : '""');
    $bioExpr = $hasUserProfile
        ? 'COALESCE(up.bio, ' . ($hasUserBio ? 'u.bio' : '""') . ', "")'
        : ($hasUserBio ? 'COALESCE(u.bio, "")' : '""');

    $sql = "SELECT
                u.id,
                u.name,
                u.email,
                COALESCE(u.plan, 'free') AS plan,
                COALESCE(u.isPremium, 0) AS isPremium,
                {$avatarExpr} AS avatar,
                {$coverExpr} AS cover,
                {$bioExpr} AS bio
            FROM users u
            " . ($hasUserProfile ? 'LEFT JOIN user_profile up ON up.userId = u.id' : '') . "
            WHERE COALESCE(u.isAdmin, 0) = 0
              AND (
                  u.name LIKE :nameQuery
                  OR u.email LIKE :emailQuery
                  OR {$bioExpr} LIKE :bioQuery
              )
            ORDER BY COALESCE(u.isPremium, 0) DESC, u.name ASC
            LIMIT {$limit}";

    $stmt = $cnx->prepare($sql);
    $like = '%' . $query . '%';
    $stmt->execute([
        ':nameQuery' => $like,
        ':emailQuery' => $like,
        ':bioQuery' => $like,
    ]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $results = [];
    foreach ($rows as $row) {
        $match = scoreTextMatch($query, $tokens, [
            (string) ($row['name'] ?? '') => ['weight' => 2.4, 'topic' => true],
            (string) ($row['email'] ?? '') => ['weight' => 1.2],
            (string) ($row['bio'] ?? '') => ['weight' => 0.45],
            (string) ($row['plan'] ?? 'free') => ['weight' => 0.15],
        ]);

        if (($match['score'] ?? 0) <= 0) {
            continue;
        }

        $name = (string) ($row['name'] ?? 'Unknown');
        $results[] = [
            'id' => (int) ($row['id'] ?? 0),
            'type' => 'user',
            'name' => $name,
            'email' => (string) ($row['email'] ?? ''),
            'plan' => (string) ($row['plan'] ?? 'free'),
            'isPremium' => (bool) ($row['isPremium'] ?? 0),
            'avatar' => normalizeProfileAssetPath((string) ($row['avatar'] ?? '')),
            'cover' => normalizeProfileAssetPath((string) ($row['cover'] ?? '')),
            'bio' => (string) ($row['bio'] ?? ''),
            'initial' => strtoupper(mb_substr($name, 0, 1) ?: 'U'),
            'score' => $match['score'],
            'confidence' => $match['confidence'],
            'matchTier' => $match['matchTier'],
            'precision' => $match['precision'],
            'recall' => $match['recall'],
            'fMeasure' => $match['fMeasure'],
        ];
    }

    return $results;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonErr('Method not allowed', 405);
    }

    require_once __DIR__ . '/../../../config/database.php';
    if (!($cnx instanceof PDO)) {
        jsonOk([
            'query' => '',
            'results' => [],
            'articles' => [],
            'users' => [],
            'ranking' => [],
            'method' => 'db_like_ranked',
        ]);
    }

    $body = readBody();
    $query = trim((string) ($body['q'] ?? ''));
    $mode = trim((string) ($body['mode'] ?? 'all'));
    $limit = max(1, min((int) ($body['limit'] ?? 20), 50));

    if (mb_strlen($query, 'UTF-8') < 2) {
        jsonErr('Query too short');
    }

    $tokens = tokenize($query);
    $sourceLimit = max($limit * 4, 20);
    $articles = $mode === 'people' ? [] : loadArticleMatches($cnx, $query, $tokens, $sourceLimit);
    $users = $mode === 'articles' ? [] : loadUserMatches($cnx, $query, $tokens, $sourceLimit);

    $combined = array_merge($articles, $users);
    usort($combined, static function (array $a, array $b): int {
        $fMeasureDiff = ($b['fMeasure'] ?? 0) <=> ($a['fMeasure'] ?? 0);
        if ($fMeasureDiff !== 0) {
            return $fMeasureDiff;
        }

        $precisionDiff = ($b['precision'] ?? 0) <=> ($a['precision'] ?? 0);
        if ($precisionDiff !== 0) {
            return $precisionDiff;
        }

        $recallDiff = ($b['recall'] ?? 0) <=> ($a['recall'] ?? 0);
        if ($recallDiff !== 0) {
            return $recallDiff;
        }

        $confidenceDiff = ($b['confidence'] ?? 0) <=> ($a['confidence'] ?? 0);
        if ($confidenceDiff !== 0) {
            return $confidenceDiff;
        }

        $scoreDiff = ($b['score'] ?? 0) <=> ($a['score'] ?? 0);
        if ($scoreDiff !== 0) {
            return $scoreDiff;
        }

        $labelA = lowered((string) ($a['title'] ?? $a['name'] ?? ''));
        $labelB = lowered((string) ($b['title'] ?? $b['name'] ?? ''));
        return $labelA <=> $labelB;
    });

    $combined = array_slice($combined, 0, $limit);
    $results = [];
    $articlesOut = [];
    $usersOut = [];
    $ranking = [];

    foreach ($combined as $index => $item) {
        $payload = [
            'rank' => $index + 1,
            'doc_id' => $item['type'] . ':' . (int) ($item['id'] ?? 0),
            'type' => (string) $item['type'],
            'score' => (float) ($item['score'] ?? 0),
            'confidence' => (float) ($item['confidence'] ?? 0),
            'matchTier' => (string) ($item['matchTier'] ?? 'good_match'),
            'precision' => (float) ($item['precision'] ?? 0),
            'recall' => (float) ($item['recall'] ?? 0),
            'fMeasure' => (float) ($item['fMeasure'] ?? 0),
        ];

        unset($item['score'], $item['confidence'], $item['matchTier']);
        $results[] = $payload + $item;
        $ranking[] = $payload;

        if (($item['type'] ?? '') === 'article') {
            $articlesOut[] = $payload + $item;
        } else {
            $usersOut[] = $payload + $item;
        }
    }

    jsonOk([
        'query' => $query,
        'results' => $results,
        'articles' => $articlesOut,
        'users' => $usersOut,
        'ranking' => $ranking,
        'method' => 'db_like_ranked',
    ]);
} catch (Throwable $e) {
    error_log('[search-index] ' . $e->getMessage());
    jsonOk([
        'query' => $query ?? '',
        'results' => [],
        'articles' => [],
        'users' => [],
        'ranking' => [],
        'method' => 'db_like_ranked',
    ]);
}
