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

$allPublished = getPublishedArticles($cnx);
$allById = [];
$allRows = [];

foreach ($allPublished as $article) {
    $id = (int) ($article->id ?? 0);
    if ($id <= 0) {
        continue;
    }

    $allById[$id] = $article;
    $allRows[] = [
        'id' => $id,
        'category' => (string) ($article->category ?? ''),
        'tags' => (string) ($article->tags ?? ''),
    ];
}

$matched = get_articles_by_interests($cnx, $interestLabels);
$directMatchedIds = array_values(array_unique(array_map(
    static fn(array $row): int => (int) ($row['id'] ?? 0),
    $matched
)));

$graph = build_category_graph($allRows);
$recommendedIds = [];
$seen = [];

foreach ($directMatchedIds as $id) {
    if ($id > 0 && !isset($seen[$id])) {
        $seen[$id] = true;
        $recommendedIds[] = $id;
    }
}

foreach ($directMatchedIds as $startId) {
    foreach (dfs_recommend($graph, $startId, 3) as $id) {
        if ($id > 0 && !isset($seen[$id])) {
            $seen[$id] = true;
            $recommendedIds[] = $id;
        }
    }
}

$ordered = [];
foreach ($recommendedIds as $id) {
    if (isset($allById[$id])) {
        $ordered[] = $allById[$id];
    }
}

foreach ($allById as $id => $article) {
    if (!isset($seen[$id])) {
        $ordered[] = $article;
    }
}

$articles = [];
foreach ($ordered as $article) {
    $articles[] = [
        'id' => (int) ($article->id ?? 0),
        'title' => (string) ($article->title ?? ''),
        'category' => (string) ($article->category ?? ''),
        'tags' => (string) ($article->tags ?? ''),
    ];
}

echo json_encode([
    'ok' => true,
    'articles' => $articles,
    'recommendedIds' => $recommendedIds,
    'directMatchedIds' => $directMatchedIds,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;
