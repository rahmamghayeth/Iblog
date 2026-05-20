<?php
declare(strict_types=1);

function canonical_interest_text(string $value): string
{
    $value = mb_strtolower(trim($value));
    $value = preg_replace('/[\s_\-\/]+/u', ' ', $value) ?? $value;
    return trim($value);
}

/**
 * @return string[]
 */
function normalize_interest_tokens(mixed $value): array
{
    if (is_array($value)) {
        $parts = $value;
    } else {
        $parts = preg_split('/\s*,\s*/u', (string) $value) ?: [];
    }

    $tokens = [];
    foreach ($parts as $part) {
        $token = canonical_interest_text((string) $part);
        if ($token !== '') {
            $tokens[$token] = true;
        }
    }

    return array_keys($tokens);
}

/**
 * @return string[]
 */
function interest_aliases(string $interest): array
{
    $value = canonical_interest_text($interest);
    $aliases = [$value];
    $map = [
        'ai' => ['artificial intelligence', 'machine learning', 'ml', 'technology'],
        'artificial intelligence' => ['ai', 'machine learning', 'ml'],
        'ml' => ['machine learning', 'artificial intelligence', 'ai'],
        'machine learning' => ['ml', 'ai', 'artificial intelligence'],
        'technology' => ['tech', 'software', 'ai'],
        'design' => ['ux ui', 'ux', 'ui', 'product'],
        'ux ui' => ['ux', 'ui', 'user experience', 'user interface', 'ux/ui', 'design', 'product'],
        'ux' => ['ux ui', 'design', 'product'],
        'ui' => ['ux ui', 'design', 'product'],
        'startups' => ['startup', 'business', 'entrepreneurship', 'product'],
        'business' => ['startups', 'finance', 'economics'],
        'finance' => ['business', 'economics'],
        'economics' => ['finance', 'business'],
        'culture' => ['community', 'creators', 'media'],
        'media' => ['culture', 'writing', 'creators'],
        'writing' => ['editorial', 'storytelling', 'media'],
        'travel' => ['culture', 'storytelling'],
        'environment' => ['climate', 'climate tech', 'science'],
        'climate tech' => ['climate', 'environment', 'science'],
        'crypto' => ['web3', 'blockchain', 'finance'],
        'web3' => ['blockchain', 'crypto'],
        'cybersecurity' => ['technology', 'security'],
        'robotics' => ['ai', 'technology', 'machine learning'],
        'data science' => ['ai', 'machine learning', 'analytics'],
        'health' => ['biotech', 'neuroscience', 'science'],
        'biotech' => ['health', 'science'],
        'neuroscience' => ['health', 'science'],
        'psychology' => ['health', 'science'],
        'geopolitics' => ['politics', 'world'],
        'politics' => ['geopolitics', 'policy'],
        'architecture' => ['design'],
        'gaming' => ['technology', 'culture'],
        'leadership' => ['business', 'productivity'],
        'marketing' => ['business', 'media'],
        'literature' => ['writing', 'culture'],
        'music' => ['culture'],
        'food' => ['culture'],
        'space' => ['science', 'technology'],
    ];

    if (isset($map[$value])) {
        $aliases = array_merge($aliases, $map[$value]);
    }

    $normalized = [];
    foreach ($aliases as $alias) {
        $token = canonical_interest_text((string) $alias);
        if ($token !== '') {
            $normalized[$token] = true;
        }
    }

    return array_keys($normalized);
}

function token_matches_interest(array $tokens, string $interest): bool
{
    $interestValue = canonical_interest_text($interest);
    if ($interestValue === '') {
        return false;
    }

    foreach ($tokens as $token) {
        $tokenValue = canonical_interest_text((string) $token);
        if ($tokenValue === '') {
            continue;
        }

        if ($tokenValue === $interestValue) {
            return true;
        }
    }

    return false;
}

/**
 * @param array<int, array<string, mixed>> $articles
 * @return array<int, int[]>
 */
function build_category_graph(array $articles): array
{
    $graph = [];
    $index = [];

    foreach ($articles as $article) {
        $id = (int) ($article['id'] ?? 0);
        if ($id <= 0) {
            continue;
        }

        $graph[$id] = $graph[$id] ?? [];
        $tokens = array_merge(
            normalize_interest_tokens($article['category'] ?? ''),
            normalize_interest_tokens($article['tags'] ?? [])
        );
        $index[$id] = array_values(array_unique($tokens));
    }

    $ids = array_keys($index);
    $count = count($ids);
    for ($i = 0; $i < $count; $i++) {
        for ($j = $i + 1; $j < $count; $j++) {
            $a = $ids[$i];
            $b = $ids[$j];
            if (array_intersect($index[$a], $index[$b])) {
                $graph[$a][] = $b;
                $graph[$b][] = $a;
            }
        }
    }

    foreach ($graph as $id => $neighbors) {
        $graph[$id] = array_values(array_unique(array_map('intval', $neighbors)));
    }

    return $graph;
}

/**
 * @param array<int, int[]> $graph
 * @return int[]
 */
function dfs_recommend(array $graph, int $startId, int $depth = 3): array
{
    if (!isset($graph[$startId])) {
        return [];
    }

    $visited = [];
    $result = [];
    $stack = [[$startId, 0]];

    while ($stack) {
        [$node, $level] = array_pop($stack);
        if (isset($visited[$node])) {
            continue;
        }

        $visited[$node] = true;
        $result[] = (int) $node;

        if ($level >= $depth) {
            continue;
        }

        $neighbors = $graph[$node] ?? [];
        rsort($neighbors);
        foreach ($neighbors as $neighbor) {
            if (!isset($visited[$neighbor])) {
                $stack[] = [(int) $neighbor, $level + 1];
            }
        }
    }

    return $result;
}

/**
 * @param string[] $interestLabels
 * @return array<int, array<string, mixed>>
 */
function get_articles_by_interests(PDO $cnx, array $interestLabels): array
{
    $interests = array_values(array_filter(array_map(
        static fn(string $item): string => canonical_interest_text($item),
        $interestLabels
    ), static fn(string $item): bool => $item !== ''));

    $all = getPublishedArticles($cnx);
    $rows = [];

    foreach ($all as $article) {
        $id = (int) ($article->id ?? 0);
        if ($id <= 0) {
            continue;
        }

        $row = [
            'id' => $id,
            'title' => (string) ($article->title ?? ''),
            'category' => (string) ($article->category ?? ''),
            'tags' => normalize_interest_tokens((string) ($article->tags ?? '')),
        ];

        if ($interests === []) {
            continue;
        }

        $tokens = array_merge(
            normalize_interest_tokens($row['category']),
            normalize_interest_tokens($row['tags'])
        );

        foreach ($interests as $interest) {
            if (token_matches_interest($tokens, $interest)) {
                $rows[] = $row;
                break;
            }
        }
    }

    return $rows;
}

/**
 * @return array<int, array<string, mixed>>
 */
function published_article_graph_rows(PDO $cnx): array
{
    $rows = [];
    foreach (getPublishedArticles($cnx) as $article) {
        $id = (int) ($article->id ?? 0);
        if ($id <= 0) {
            continue;
        }

        $rows[] = [
            'id' => $id,
            'title' => (string) ($article->title ?? ''),
            'category' => (string) ($article->category ?? ''),
            'tags' => (string) ($article->tags ?? ''),
        ];
    }

    return $rows;
}

/**
 * @param int[] $seedArticleIds
 * @return int[]
 */
function expand_recommended_article_ids(PDO $cnx, array $seedArticleIds, int $depth = 3): array
{
    $seeds = array_values(array_unique(array_filter(array_map(
        static fn(mixed $id): int => (int) $id,
        $seedArticleIds
    ), static fn(int $id): bool => $id > 0)));

    if ($seeds === []) {
        return [];
    }

    $graph = build_category_graph(published_article_graph_rows($cnx));
    $orderedIds = [];

    foreach ($seeds as $seedId) {
        foreach (dfs_recommend($graph, $seedId, $depth) as $recommendedId) {
            $recommendedId = (int) $recommendedId;
            if ($recommendedId > 0) {
                $orderedIds[$recommendedId] = true;
            }
        }
    }

    return array_map('intval', array_keys($orderedIds));
}
