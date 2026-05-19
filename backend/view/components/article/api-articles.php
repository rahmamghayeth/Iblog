<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../controller/ArticleController.php';
require_once __DIR__ . '/../../../controller/SavedArticleController.php';
require_once __DIR__ . '/../../../controller/UserController.php';

session_start();

if (!($cnx instanceof PDO)) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => databaseConnectionError() ?? 'Database connection failed.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function articleJsonOk(array $data = []): never
{
    echo json_encode(['ok' => true] + $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function articleJsonErr(string $message, int $code = 400): never
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readArticleBody(): array
{
    $raw = file_get_contents('php://input');
    if (($raw === false || $raw === '') && PHP_SAPI === 'cli') {
        $raw = (string) (getenv('IBLOG_TEST_REQUEST_BODY') ?: '');
    }
    $decoded = json_decode($raw ?: '{}', true);
    return is_array($decoded) ? $decoded : [];
}

function requestedPage(array $body): int
{
    return max(1, (int) ($body['page'] ?? 1));
}

function requestedPageSize(array $body, int $default = 12): int
{
    $raw = (int) ($body['pageSize'] ?? $body['limit'] ?? $default);
    return max(1, min($raw > 0 ? $raw : $default, 50));
}

function articlePlainText(string $body): string
{
    $text = trim(html_entity_decode(strip_tags($body), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    return preg_replace('/\s+/u', ' ', $text) ?: '';
}

function paginateItems(array $items, int $page, int $pageSize): array
{
    $totalItems = count($items);
    $totalPages = $totalItems > 0 ? (int) ceil($totalItems / $pageSize) : 0;
    $currentPage = $totalPages > 0 ? min($page, $totalPages) : 1;
    $offset = ($currentPage - 1) * $pageSize;
    $slice = array_slice($items, $offset, $pageSize);

    return [
        'items' => $slice,
        'pagination' => [
            'page' => $currentPage,
            'requestedPage' => $page,
            'pageSize' => $pageSize,
            'count' => count($slice),
            'totalItems' => $totalItems,
            'totalPages' => $totalPages,
            'hasPrevious' => $currentPage > 1,
            'hasNext' => $totalPages > 0 && $currentPage < $totalPages,
            'isEmpty' => $totalItems === 0,
        ],
    ];
}

function currentSessionUserId(): int
{
    return (int) ($_SESSION['user_id'] ?? 0);
}

function ensureArticleAuth(array $body = []): int
{
    $userId = currentSessionUserId();
    if ($userId > 0) {
        return $userId;
    }

    $email = trim((string) ($_SESSION['email'] ?? ''));
    global $cnx;
    if (!($cnx instanceof PDO)) {
        articleJsonErr('Please sign in first.', 401);
    }

    $user = $email !== '' ? getUserByEmail($cnx, $email) : false;
    if ($user === false) {
        $fallbackEmail = trim((string) ($body['authorEmail'] ?? ''));
        if ($fallbackEmail === '') {
            articleJsonErr('Please sign in first.', 401);
        }
        $user = getUserByEmail($cnx, $fallbackEmail);
        if ($user === false) {
            articleJsonErr('Please sign in first.', 401);
        }
    }

    $_SESSION['user_id'] = (int) $user['id'];
    $_SESSION['email'] = (string) ($user['email'] ?? '');
    $_SESSION['name'] = (string) ($user['name'] ?? '');
    $_SESSION['plan'] = (string) ($user['plan'] ?? 'free');
    $_SESSION['isPremium'] = (int) ($user['isPremium'] ?? 0);
    $_SESSION['isAdmin'] = (int) ($user['isAdmin'] ?? 0);
    return (int) $user['id'];
}

function normalizeArticleTags(string $tags): array
{
    $parts = preg_split('/\s*,\s*/', trim($tags)) ?: [];
    return array_values(array_filter(array_map(static fn($value) => trim((string) $value), $parts), static fn($value) => $value !== ''));
}

function articleDateLabel(?string $createdAt): string
{
    if (!$createdAt) {
        return 'Just now';
    }

    $normalized = trim($createdAt);
    if ($normalized === '' || str_starts_with($normalized, '0000-00-00')) {
        return 'Just now';
    }

    $timestamp = strtotime($normalized);
    if ($timestamp === false || $timestamp <= 0) {
        return 'Just now';
    }

    return date('M j, Y', $timestamp);
}

function uploadDirPath(): string
{
    return dirname(__DIR__, 4) . '/public/uploads/covers/';
}

function saveCoverImage(string $coverImage): string
{
    $coverImage = trim($coverImage);
    if ($coverImage === '') {
        return '';
    }

    if (preg_match('#^(?:backend/)?public/uploads/covers/[A-Za-z0-9._-]+$#', $coverImage) === 1) {
        return preg_replace('#^backend/#', '', $coverImage) ?: $coverImage;
    }

    if (preg_match('#^/blog/blog/public/uploads/covers/[A-Za-z0-9._-]+$#', $coverImage) === 1) {
        return preg_replace('#^/blog/blog/#', '', $coverImage) ?: $coverImage;
    }

    if (preg_match('#^https?://[^/]+/blog/blog/public/uploads/covers/[A-Za-z0-9._-]+$#', $coverImage) === 1) {
        return preg_replace('#^https?://[^/]+/blog/blog/#', '', $coverImage) ?: $coverImage;
    }

    if (preg_match('#^data:image/(png|jpe?g|webp|gif);base64,#i', $coverImage, $matches) !== 1) {
        return $coverImage;
    }

    $extension = strtolower($matches[1]);
    if ($extension === 'jpeg') {
        $extension = 'jpg';
    }

    $data = base64_decode(substr($coverImage, strpos($coverImage, ',') + 1), true);
    if ($data === false) {
        articleJsonErr('Invalid cover image data.');
    }

    $directory = uploadDirPath();
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        articleJsonErr('Could not create the upload folder.', 500);
    }

    $filename = 'cover_' . bin2hex(random_bytes(8)) . '.' . $extension;
    $target = $directory . $filename;
    if (file_put_contents($target, $data) === false) {
        articleJsonErr('Could not save the cover image.', 500);
    }

    return 'public/uploads/covers/' . $filename;
}

function normalizeCoverPath(string $cover): string
{
    $cover = trim($cover);
    if ($cover === '') {
        return '';
    }

    if (str_starts_with($cover, 'backend/public/uploads/covers/')) {
        return substr($cover, strlen('backend/'));
    }

    if (str_starts_with($cover, '/blog/blog/public/uploads/covers/')) {
        return substr($cover, strlen('/blog/blog/'));
    }

    if (preg_match('#^https?://[^/]+/blog/blog/public/uploads/covers/#', $cover) === 1) {
        return preg_replace('#^https?://[^/]+/blog/blog/#', '', $cover) ?: $cover;
    }

    return $cover;
}

function loadArticleComments(PDO $cnx, array $articleIds): array
{
    $articleIds = array_values(array_unique(array_filter(array_map('intval', $articleIds), static fn(int $id) => $id > 0)));
    if (!$articleIds) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($articleIds), '?'));
    $stmt = $cnx->prepare(
        "SELECT
            c.id,
            c.articleId,
            c.userId,
            c.body,
            c.createdAt,
            u.name AS authorName
         FROM comment c
         LEFT JOIN users u ON u.id = c.userId
         WHERE c.articleId IN ({$placeholders})
         ORDER BY c.createdAt ASC"
    );
    $stmt->execute($articleIds);

    $comments = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        $articleId = (int) ($row['articleId'] ?? 0);
        if (!isset($comments[$articleId])) {
            $comments[$articleId] = [];
        }
        $comments[$articleId][] = [
            'id' => (int) ($row['id'] ?? 0),
            'userId' => (int) ($row['userId'] ?? 0),
            'author' => (string) ($row['authorName'] ?? 'User'),
            'text' => (string) ($row['body'] ?? ''),
            'createdAt' => (string) ($row['createdAt'] ?? ''),
        ];
    }

    return $comments;
}

function loadSavedArticleIds(PDO $cnx, int $userId, array $articleIds = []): array
{
    if ($userId <= 0) {
        return [];
    }

    if ($articleIds) {
        $articleIds = array_values(array_unique(array_filter(array_map('intval', $articleIds), static fn(int $id) => $id > 0)));
        if (!$articleIds) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($articleIds), '?'));
        $params = array_merge([$userId], $articleIds);
        $stmt = $cnx->prepare(
            "SELECT articleId
             FROM savedarticle
             WHERE userId = ?
               AND articleId IN ({$placeholders})"
        );
        $stmt->execute($params);
    } else {
        $stmt = $cnx->prepare('SELECT articleId FROM savedarticle WHERE userId = ?');
        $stmt->execute([$userId]);
    }

    $saved = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        $saved[(int) ($row['articleId'] ?? 0)] = true;
    }
    return $saved;
}

function articleTableExists(PDO $cnx, string $table): bool
{
    return dbTableExists($cnx, $table);
}

function ensureArticleLikeTable(PDO $cnx): void
{
    if (articleTableExists($cnx, 'article_like')) {
        return;
    }

    try {
        $cnx->exec(
            "CREATE TABLE article_like (
                id INT AUTO_INCREMENT PRIMARY KEY,
                articleId INT NOT NULL,
                userId INT NOT NULL,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_article_like (articleId, userId)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
    } catch (Throwable) {
    }
}

function loadLikedArticleIds(PDO $cnx, int $userId, array $articleIds = []): array
{
    if ($userId <= 0) {
        return [];
    }

    ensureArticleLikeTable($cnx);

    if ($articleIds) {
        $articleIds = array_values(array_unique(array_filter(array_map('intval', $articleIds), static fn(int $id) => $id > 0)));
        if (!$articleIds) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($articleIds), '?'));
        $params = array_merge([$userId], $articleIds);
        $stmt = $cnx->prepare(
            "SELECT articleId
             FROM article_like
             WHERE userId = ?
               AND articleId IN ({$placeholders})"
        );
        $stmt->execute($params);
    } else {
        $stmt = $cnx->prepare('SELECT articleId FROM article_like WHERE userId = ?');
        $stmt->execute([$userId]);
    }

    $liked = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        $liked[(int) ($row['articleId'] ?? 0)] = true;
    }

    return $liked;
}

function refreshArticleLikesCount(PDO $cnx, int $articleId): int
{
    ensureArticleLikeTable($cnx);
    $countStmt = $cnx->prepare('SELECT COUNT(*) FROM article_like WHERE articleId = :articleId');
    $countStmt->execute([':articleId' => $articleId]);
    $count = (int) $countStmt->fetchColumn();

    try {
        $updateStmt = $cnx->prepare('UPDATE article SET likesCount = :count WHERE id = :articleId');
        $updateStmt->execute([
            ':count' => $count,
            ':articleId' => $articleId,
        ]);
    } catch (Throwable) {
    }

    return $count;
}

function serializeArticleForApp(object $article, array $commentsMap = [], array $savedMap = [], array $likedMap = []): array
{
    $author = (string) ($article->author_name ?? 'Anonymous');
    $body = (string) ($article->body ?? '');
    $plainBody = articlePlainText($body);
    $excerpt = trim(mb_substr($body, 0, 160));
    if (mb_strlen($body) > 160) {
        $excerpt .= '…';
    }

    $excerpt = trim(mb_substr($plainBody, 0, 160));
    if (mb_strlen($plainBody) > 160) {
        $excerpt .= '...';
    }

    $cover = normalizeCoverPath((string) ($article->coverImage ?? ''));
    $tags = normalizeArticleTags((string) ($article->tags ?? ''));
    $articleId = (int) ($article->id ?? 0);
    $comments = $commentsMap[$articleId] ?? [];
    $bookmarked = isset($savedMap[$articleId]);
    $liked = isset($likedMap[$articleId]);

    return [
        'id' => $articleId,
        'dbId' => $articleId,
        'authorId' => (int) ($article->authorId ?? 0),
        'author' => $author,
        'authorInitial' => strtoupper(mb_substr($author, 0, 1) ?: 'A'),
        'authorColor' => 'var(--accent)',
        'authorAvatar' => normalizeCoverPath((string) ($article->author_avatar ?? '')) ?: null,
        'cat' => (string) ($article->category ?? 'General'),
        'category' => (string) ($article->category ?? 'General'),
        'img' => $cover ?: null,
        'cover' => $cover ?: null,
        'title' => (string) ($article->title ?? ''),
        'excerpt' => $excerpt,
        'body' => $body,
        'templateId' => in_array((string) ($article->label ?? ''), ['newspaper', 'magazine', 'academic', 'thread', 'recipe'], true)
            ? (string) $article->label
            : null,
        'readTime' => (string) ($article->readingTime ?? '1 min'),
        'likes' => (int) ($article->likesCount ?? 0),
        'comments' => $comments,
        'reposts' => 0,
        'bookmarked' => $bookmarked,
        '_bookmarked' => $bookmarked,
        'liked' => $liked,
        '_liked' => $liked,
        'quality' => mb_strlen($plainBody) > 300 ? 'high' : 'med',
        'isPremiumAuthor' => false,
        'tags' => $tags,
        'date' => articleDateLabel($article->createdAt ?? null),
        'status' => (string) ($article->status ?? 'draft'),
        'createdAt' => $article->createdAt ?? null,
        'views' => (int) ($article->views ?? 0),
    ];
}

function serializeSavedRowForApp(array $row, array $commentsMap = [], array $likedMap = []): array
{
    $articleId = (int) ($row['articleId'] ?? 0);
    $body = (string) ($row['body'] ?? '');
    $plainBody = articlePlainText($body);
    $excerpt = trim(mb_substr($body, 0, 160));
    if (mb_strlen($body) > 160) {
        $excerpt .= '…';
    }
    $excerpt = trim(mb_substr($plainBody, 0, 160));
    if (mb_strlen($plainBody) > 160) {
        $excerpt .= '...';
    }
    $cover = normalizeCoverPath((string) ($row['coverImage'] ?? ''));
    $author = (string) ($row['author_name'] ?? 'Anonymous');
    $liked = isset($likedMap[$articleId]);

    return [
        'id' => $articleId,
        'dbId' => $articleId,
        'authorId' => (int) ($row['authorId'] ?? 0),
        'author' => $author,
        'authorInitial' => strtoupper(mb_substr($author, 0, 1) ?: 'A'),
        'authorColor' => 'var(--accent)',
        'authorAvatar' => normalizeCoverPath((string) ($row['author_avatar'] ?? '')) ?: null,
        'cat' => (string) ($row['category'] ?? 'General'),
        'category' => (string) ($row['category'] ?? 'General'),
        'img' => $cover ?: null,
        'cover' => $cover ?: null,
        'title' => (string) ($row['title'] ?? ''),
        'excerpt' => $excerpt,
        'body' => $body,
        'templateId' => in_array((string) ($row['label'] ?? ''), ['newspaper', 'magazine', 'academic', 'thread', 'recipe'], true)
            ? (string) $row['label']
            : null,
        'readTime' => (string) ($row['readingTime'] ?? '1 min'),
        'likes' => (int) ($row['likesCount'] ?? 0),
        'comments' => $commentsMap[$articleId] ?? [],
        'reposts' => 0,
        'bookmarked' => true,
        '_bookmarked' => true,
        'liked' => $liked,
        '_liked' => $liked,
        'quality' => mb_strlen($plainBody) > 300 ? 'high' : 'med',
        'isPremiumAuthor' => false,
        'tags' => normalizeArticleTags((string) ($row['tags'] ?? '')),
        'date' => articleDateLabel($row['articleCreatedAt'] ?? null),
        'savedAt' => (string) ($row['savedAt'] ?? ''),
        'status' => 'published',
        'createdAt' => $row['articleCreatedAt'] ?? null,
        'views' => (int) ($row['views'] ?? 0),
    ];
}

function serializeArticleList(array $articles, array $commentsMap = [], array $savedMap = [], array $likedMap = []): array
{
    return array_map(
        static fn(object $article): array => serializeArticleForApp($article, $commentsMap, $savedMap, $likedMap),
        $articles
    );
}

function mergedVisibleArticles(PDO $cnx): array
{
    $items = [];
    foreach (getPublishedArticles($cnx) as $article) {
        $items[(int) $article->id] = $article;
    }

    $userId = currentSessionUserId();
    if ($userId > 0) {
        foreach (getArticlesByAuthor($cnx, $userId) as $article) {
            $items[(int) $article->id] = $article;
        }
    }

    $articles = array_values($items);
    usort($articles, static function (object $a, object $b): int {
        $ad = strtotime((string) ($a->createdAt ?? '')) ?: 0;
        $bd = strtotime((string) ($b->createdAt ?? '')) ?: 0;
        return $bd <=> $ad;
    });

    return $articles;
}

function serializeVisibleArticles(PDO $cnx): array
{
    $articles = mergedVisibleArticles($cnx);
    $articleIds = array_map(static fn(object $article): int => (int) $article->id, $articles);
    $commentsMap = loadArticleComments($cnx, $articleIds);
    $savedMap = loadSavedArticleIds($cnx, currentSessionUserId(), $articleIds);
    $likedMap = loadLikedArticleIds($cnx, currentSessionUserId(), $articleIds);
    return serializeArticleList($articles, $commentsMap, $savedMap, $likedMap);
}

function serializeSavedArticlesForUser(PDO $cnx, int $userId): array
{
    $rows = getSavedArticlesByUser($cnx, $userId);
    $articleIds = array_map(static fn(array $row): int => (int) ($row['articleId'] ?? 0), $rows);
    $commentsMap = loadArticleComments($cnx, $articleIds);
    $likedMap = loadLikedArticleIds($cnx, $userId, $articleIds);
    return array_map(
        static fn(array $row): array => serializeSavedRowForApp($row, $commentsMap, $likedMap),
        $rows
    );
}

function loadCommentById(PDO $cnx, int $commentId): ?array
{
    $stmt = $cnx->prepare(
        "SELECT
            c.id,
            c.articleId,
            c.userId,
            c.body,
            c.createdAt,
            u.name AS authorName
         FROM comment c
         LEFT JOIN users u ON u.id = c.userId
         WHERE c.id = :id
         LIMIT 1"
    );
    $stmt->execute([':id' => $commentId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return null;
    }

    return [
        'id' => (int) ($row['id'] ?? 0),
        'userId' => (int) ($row['userId'] ?? 0),
        'author' => (string) ($row['authorName'] ?? 'User'),
        'text' => (string) ($row['body'] ?? ''),
        'createdAt' => (string) ($row['createdAt'] ?? ''),
    ];
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    articleJsonErr('Method not allowed.', 405);
}

$body = readArticleBody();
$action = (string) ($body['action'] ?? 'list');

if ($action === 'list') {
    $page = requestedPage($body);
    $pageSize = requestedPageSize($body);
    $paginated = paginateItems(serializeVisibleArticles($cnx), $page, $pageSize);
    articleJsonOk([
        'articles' => $paginated['items'],
        'pagination' => $paginated['pagination'],
    ]);
}

if ($action === 'saved_list') {
    $userId = ensureArticleAuth($body);
    $page = requestedPage($body);
    $pageSize = requestedPageSize($body);
    $paginated = paginateItems(serializeSavedArticlesForUser($cnx, $userId), $page, $pageSize);
    articleJsonOk([
        'articles' => $paginated['items'],
        'pagination' => $paginated['pagination'],
    ]);
}

if ($action === 'saved_toggle') {
    $userId = ensureArticleAuth($body);
    $articleId = (int) ($body['articleId'] ?? 0);
    if ($articleId <= 0) {
        articleJsonErr('Invalid article id.');
    }

    $article = getArticleById($cnx, $articleId);
    if (!$article || (string) ($article->status ?? '') !== 'published') {
        articleJsonErr('Article not found.', 404);
    }

    $shouldSave = array_key_exists('saved', $body)
        ? (bool) $body['saved']
        : !isArticleSaved($cnx, $userId, $articleId);

    if ($shouldSave && !isArticleSaved($cnx, $userId, $articleId)) {
        $result = saveArticle($cnx, $userId, $articleId);
        if (empty($result['success'])) {
            articleJsonErr((string) ($result['message'] ?? 'Could not save this article.'), 500);
        }
    }

    if (!$shouldSave && isArticleSaved($cnx, $userId, $articleId)) {
        $savedId = getSavedId($cnx, $userId, $articleId);
        if ($savedId !== null && !unsaveArticle($cnx, $savedId, $userId)) {
            articleJsonErr('Could not remove this saved article.', 500);
        }
    }

    articleJsonOk([
        'saved' => $shouldSave,
        'articleId' => $articleId,
        'articles' => serializeSavedArticlesForUser($cnx, $userId),
    ]);
}

if ($action === 'like_toggle') {
    $userId = ensureArticleAuth($body);
    $articleId = (int) ($body['articleId'] ?? 0);
    if ($articleId <= 0) {
        articleJsonErr('Invalid article id.');
    }

    $article = getArticleById($cnx, $articleId);
    if (!$article || (string) ($article->status ?? '') !== 'published') {
        articleJsonErr('Article not found.', 404);
    }

    ensureArticleLikeTable($cnx);

    $likedStmt = $cnx->prepare(
        'SELECT id
         FROM article_like
         WHERE articleId = :articleId
           AND userId = :userId
         LIMIT 1'
    );
    $likedStmt->execute([
        ':articleId' => $articleId,
        ':userId' => $userId,
    ]);
    $existingLikeId = (int) ($likedStmt->fetchColumn() ?: 0);

    $shouldLike = array_key_exists('liked', $body)
        ? (bool) $body['liked']
        : $existingLikeId <= 0;

    if ($shouldLike && $existingLikeId <= 0) {
        $insertStmt = $cnx->prepare(
            'INSERT INTO article_like (articleId, userId, createdAt)
             VALUES (:articleId, :userId, CURRENT_TIMESTAMP)'
        );
        $insertStmt->execute([
            ':articleId' => $articleId,
            ':userId' => $userId,
        ]);
    }

    if (!$shouldLike && $existingLikeId > 0) {
        $deleteStmt = $cnx->prepare('DELETE FROM article_like WHERE id = :id');
        $deleteStmt->execute([':id' => $existingLikeId]);
    }

    $likesCount = refreshArticleLikesCount($cnx, $articleId);

    articleJsonOk([
        'articleId' => $articleId,
        'liked' => $shouldLike,
        'likesCount' => $likesCount,
    ]);
}

if ($action === 'view_increment') {
    $articleId = (int) ($body['articleId'] ?? 0);
    if ($articleId <= 0) {
        articleJsonErr('Invalid article id.');
    }

    $article = getArticleById($cnx, $articleId);
    if (!$article) {
        articleJsonErr('Article not found.', 404);
    }

    try {
        $stmt = $cnx->prepare('UPDATE article SET views = COALESCE(views, 0) + 1 WHERE id = :articleId');
        $stmt->execute([':articleId' => $articleId]);
    } catch (Throwable) {
        articleJsonErr('Could not update article views.', 500);
    }

    $viewStmt = $cnx->prepare('SELECT COALESCE(views, 0) FROM article WHERE id = :articleId LIMIT 1');
    $viewStmt->execute([':articleId' => $articleId]);

    articleJsonOk([
        'articleId' => $articleId,
        'views' => (int) $viewStmt->fetchColumn(),
    ]);
}

if ($action === 'comment_add') {
    $userId = ensureArticleAuth($body);
    $articleId = (int) ($body['articleId'] ?? 0);
    $commentBody = trim((string) ($body['body'] ?? ''));
    if ($articleId <= 0 || $commentBody === '') {
        articleJsonErr('Article id and comment body are required.');
    }

    $article = getArticleById($cnx, $articleId);
    if (!$article || (string) ($article->status ?? '') !== 'published') {
        articleJsonErr('Article not found.', 404);
    }

    $stmt = $cnx->prepare(
        'INSERT INTO comment (articleId, userId, body, parentId, likesCount, isFlagged, createdAt)
         VALUES (:articleId, :userId, :body, NULL, 0, 0, CURRENT_TIMESTAMP)'
    );
    $ok = $stmt->execute([
        ':articleId' => $articleId,
        ':userId' => $userId,
        ':body' => $commentBody,
    ]);

    if (!$ok) {
        articleJsonErr('Could not save the comment.', 500);
    }

    $commentId = (int) $cnx->lastInsertId();
    $comment = loadCommentById($cnx, $commentId);
    if ($comment === null) {
        articleJsonErr('Comment saved but could not be reloaded.', 500);
    }

    $countStmt = $cnx->prepare('SELECT COUNT(*) FROM comment WHERE articleId = :articleId');
    $countStmt->execute([':articleId' => $articleId]);

    articleJsonOk([
        'comment' => $comment,
        'articleId' => $articleId,
        'commentsCount' => (int) $countStmt->fetchColumn(),
    ]);
}

if ($action === 'save') {
    $userId = ensureArticleAuth($body);
    $title = trim((string) ($body['title'] ?? ''));
    $articleBody = trim((string) ($body['body'] ?? ''));
    $status = trim((string) ($body['status'] ?? 'published')) ?: 'published';
    if ($status === 'published' && ($title === '' || $articleBody === '')) {
        articleJsonErr('Title and content are required.');
    }
    if ($status !== 'published' && $title === '' && $articleBody === '') {
        articleJsonErr('Add a title or some content before saving a draft.');
    }

    $readingTime = trim((string) ($body['readingTime'] ?? ''));
    if ($readingTime === '') {
        $readingTime = max(1, (int) ceil(str_word_count(articlePlainText($articleBody)) / 200)) . ' min';
    }

    $created = addArticle($cnx, [
        'authorId' => $userId,
        'title' => $title,
        'body' => $articleBody,
        'category' => trim((string) ($body['category'] ?? 'General')) ?: 'General',
        'tags' => trim((string) ($body['tags'] ?? '')),
        'status' => $status,
        'coverImage' => saveCoverImage((string) ($body['coverImage'] ?? '')),
        'readingTime' => $readingTime,
        'label' => trim((string) ($body['label'] ?? 'none')) ?: 'none',
    ]);

    if (!$created) {
        articleJsonErr('Could not save the article to the database.', 500);
    }

    $id = (int) $cnx->lastInsertId();
    $article = getArticleById($cnx, $id);
    if (!$article) {
        articleJsonErr('Article saved but could not be reloaded.', 500);
    }

    $commentsMap = loadArticleComments($cnx, [$id]);
    $savedMap = loadSavedArticleIds($cnx, $userId, [$id]);
    $likedMap = loadLikedArticleIds($cnx, $userId, [$id]);
    articleJsonOk(['article' => serializeArticleForApp($article, $commentsMap, $savedMap, $likedMap)]);
}

if ($action === 'update') {
    $userId = ensureArticleAuth($body);
    $id = (int) ($body['id'] ?? 0);
    if ($id <= 0) {
        articleJsonErr('Invalid article id.');
    }

    $article = getArticleById($cnx, $id);
    if (!$article) {
        articleJsonErr('Article not found.', 404);
    }

    if ((int) $article->authorId !== $userId) {
        articleJsonErr('You can only edit your own articles.', 403);
    }

    $title = trim((string) ($body['title'] ?? $article->title));
    $articleBody = trim((string) ($body['body'] ?? $article->body));
    $status = trim((string) ($body['status'] ?? $article->status)) ?: 'published';
    if ($status === 'published' && ($title === '' || $articleBody === '')) {
        articleJsonErr('Title and content are required.');
    }
    if ($status !== 'published' && $title === '' && $articleBody === '') {
        articleJsonErr('Add a title or some content before saving a draft.');
    }

    $coverInput = trim((string) ($body['coverImage'] ?? ''));
    $coverImage = $coverInput !== '' ? saveCoverImage($coverInput) : (string) ($article->coverImage ?? '');
    $readingTime = trim((string) ($body['readingTime'] ?? ''));
    if ($readingTime === '') {
        $readingTime = max(1, (int) ceil(str_word_count(articlePlainText($articleBody)) / 200)) . ' min';
    }

    $updated = updateArticle($cnx, $id, [
        'title' => $title,
        'body' => $articleBody,
        'category' => trim((string) ($body['category'] ?? $article->category)) ?: 'General',
        'tags' => trim((string) ($body['tags'] ?? $article->tags)),
        'status' => $status,
        'coverImage' => $coverImage,
        'readingTime' => $readingTime,
        'label' => trim((string) ($body['label'] ?? $article->label)) ?: 'none',
    ]);

    if (!$updated) {
        articleJsonErr('Could not update the article in the database.', 500);
    }

    $fresh = getArticleById($cnx, $id);
    if (!$fresh) {
        articleJsonErr('Article updated but could not be reloaded.', 500);
    }

    $commentsMap = loadArticleComments($cnx, [$id]);
    $savedMap = loadSavedArticleIds($cnx, $userId, [$id]);
    $likedMap = loadLikedArticleIds($cnx, $userId, [$id]);
    articleJsonOk(['article' => serializeArticleForApp($fresh, $commentsMap, $savedMap, $likedMap)]);
}

if ($action === 'delete') {
    $userId = ensureArticleAuth($body);
    $id = (int) ($body['id'] ?? 0);
    if ($id <= 0) {
        articleJsonErr('Invalid article id.');
    }

    $article = getArticleById($cnx, $id);
    if (!$article) {
        articleJsonErr('Article not found.', 404);
    }

    if ((int) $article->authorId !== $userId) {
        articleJsonErr('You can only delete your own articles.', 403);
    }

    if (!deleteArticle($cnx, $id)) {
        articleJsonErr('Could not delete the article.', 500);
    }

    articleJsonOk(['deleted' => true, 'id' => $id]);
}

articleJsonErr('Unknown action.');
