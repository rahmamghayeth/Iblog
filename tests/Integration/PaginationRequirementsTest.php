<?php
declare(strict_types=1);

namespace IBlog\Tests\Integration;

use IBlog\Tests\Support\EndpointTestCase;

final class PaginationRequirementsTest extends EndpointTestCase
{
    public function testFirstPageNavigationReturnsFirstSliceAndNextFlag(): void
    {
        $this->seedPublishedArticles(5);
        $response = $this->client->postJson('/backend/view/components/article/api-articles.php', [
            'action' => 'list',
            'page' => 1,
            'pageSize' => 3,
        ]);

        $this->assertSame(200, $response->status, $response->body);
        $json = $response->json();
        $this->assertCount(3, $json['articles'] ?? []);
        $this->assertSame('Paginated Article 5', $json['articles'][0]['title'] ?? null);
        $this->assertSame(1, $json['pagination']['page'] ?? null);
        $this->assertSame(3, $json['pagination']['pageSize'] ?? null);
        $this->assertSame(7, $json['pagination']['totalItems'] ?? null);
        $this->assertSame(3, $json['pagination']['totalPages'] ?? null);
        $this->assertFalse($json['pagination']['hasPrevious'] ?? true);
        $this->assertTrue($json['pagination']['hasNext'] ?? false);
    }
    public function testLastPageNavigationReturnsPartialRemainingItems(): void
    {
        $this->seedPublishedArticles(5);
        $response = $this->client->postJson('/backend/view/components/article/api-articles.php', [
            'action' => 'list',
            'page' => 3,
            'pageSize' => 3,
        ]);
        $this->assertSame(200, $response->status, $response->body);
        $json = $response->json();
        $this->assertCount(1, $json['articles'] ?? []);
        $this->assertSame(3, $json['pagination']['page'] ?? null);
        $this->assertSame(1, $json['pagination']['count'] ?? null);
        $this->assertFalse($json['pagination']['hasNext'] ?? true);
        $this->assertTrue($json['pagination']['hasPrevious'] ?? false);
    }

    public function testPageSizeVariationChangesReturnedCountAndTotalPages(): void
    {
        $this->seedPublishedArticles(5);

        $response = $this->client->postJson('/backend/view/components/article/api-articles.php', [
            'action' => 'list',
            'page' => 1,
            'pageSize' => 2,
        ]);

        $this->assertSame(200, $response->status, $response->body);
        $json = $response->json();

        $this->assertCount(2, $json['articles'] ?? []);
        $this->assertSame(2, $json['pagination']['pageSize'] ?? null);
        $this->assertSame(4, $json['pagination']['totalPages'] ?? null);
        $this->assertSame(7, $json['pagination']['totalItems'] ?? null);
    }

    public function testEmptySavedListReturnsEmptyPaginationPayload(): void
    {
        $this->signIn('free@example.com');

        $response = $this->client->postJson('/backend/view/components/article/api-articles.php', [
            'action' => 'saved_list',
            'page' => 1,
            'pageSize' => 5,
        ]);

        $this->assertSame(200, $response->status, $response->body);
        $json = $response->json();

        $this->assertSame([], $json['articles'] ?? null);
        $this->assertSame(0, $json['pagination']['totalItems'] ?? null);
        $this->assertSame(0, $json['pagination']['totalPages'] ?? null);
        $this->assertSame(0, $json['pagination']['count'] ?? null);
        $this->assertTrue($json['pagination']['isEmpty'] ?? false);
        $this->assertFalse($json['pagination']['hasNext'] ?? true);
        $this->assertFalse($json['pagination']['hasPrevious'] ?? true);
    }

    private function seedPublishedArticles(int $count): void
    {
        $stmt = $this->db()->prepare(
            'INSERT INTO article (userId, title, body, category, tags, status, coverImage, readingTime, likesCount, views, label, createdAt)
             VALUES (:userId, :title, :body, :category, :tags, :status, :coverImage, :readingTime, :likesCount, :views, :label, :createdAt)'
        );

        for ($index = 1; $index <= $count; $index++) {
            $stmt->execute([
                ':userId' => 4,
                ':title' => 'Paginated Article ' . $index,
                ':body' => 'Seeded article body ' . $index . ' for pagination testing.',
                ':category' => 'Testing',
                ':tags' => 'pagination,seeded',
                ':status' => 'published',
                ':coverImage' => '',
                ':readingTime' => '2 min',
                ':likesCount' => 0,
                ':views' => 0,
                ':label' => 'none',
                ':createdAt' => sprintf('2026-02-%02d 09:00:00', $index),
            ]);
        }
    }
}