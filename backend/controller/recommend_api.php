<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/ArticleController.php';
require_once __DIR__ . '/dfs.php';

if (!($cnx instanceof PDO)) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => databaseConnectionError() ?? 'Database unavailable',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$rawInterests = trim((string) ($_GET['interests'] ?? ''));
$interestLabels = $rawInterests === ''
    ? []
    : array_values(array_filter(
        array_map('trim', explode(',', $rawInterests)),
        static fn(string $value): bool => $value !== ''
    ));

$matched = get_articles_by_interests($cnx, $interestLabels);
$directMatchedIds = array_values(array_unique(array_map(
    static fn(array $row): int => (int) ($row['id'] ?? 0),
    $matched
)));

$articles = [];
foreach ($matched as $article) {
    $id = (int) ($article['id'] ?? 0);
    if ($id <= 0) {
        continue;
    }

    $articles[] = [
        'id' => $id,
        'title' => (string) ($article['title'] ?? ''),
        'category' => (string) ($article['category'] ?? ''),
        'tags' => implode(', ', array_map('strval', $article['tags'] ?? [])),
    ];
}

echo json_encode([
    'ok' => true,
    'articles' => $articles,
    'recommendedIds' => $directMatchedIds,
    'directMatchedIds' => $directMatchedIds,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;
