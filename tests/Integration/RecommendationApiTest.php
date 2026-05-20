<?php
declare(strict_types=1);

namespace IBlog\Tests\Integration;

use IBlog\Tests\Support\EndpointTestCase;

final class RecommendationApiTest extends EndpointTestCase
{
    public function testRecommendationApiExpandsDirectMatchesWithDfs(): void
    {
        $stmt = $this->db()->prepare(
            'INSERT INTO article (id, userId, title, body, category, tags, status, coverImage, readingTime, likesCount, views, label, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );

        $stmt->execute([
            10,
            4,
            'Robotics Primer',
            'Direct match for robotics interest.',
            'Robotics',
            'automation,vision',
            'published',
            '',
            '4 min',
            0,
            0,
            'none',
            '2026-01-13 09:00:00',
        ]);
        $stmt->execute([
            11,
            4,
            'Computer Vision Field Notes',
            'Connected to robotics by a shared tag but not a direct interest match.',
            'Technology',
            'vision,cameras',
            'published',
            '',
            '5 min',
            0,
            0,
            'none',
            '2026-01-14 09:00:00',
        ]);
        $stmt->execute([
            12,
            4,
            'Camera Systems Deep Dive',
            'Reached through DFS at the next hop.',
            'Hardware',
            'cameras,optics',
            'published',
            '',
            '6 min',
            0,
            0,
            'none',
            '2026-01-15 09:00:00',
        ]);
        $stmt->execute([
            13,
            4,
            'Gardening Weekly',
            'Unrelated content should stay out of recommendations.',
            'Lifestyle',
            'plants,outdoors',
            'published',
            '',
            '3 min',
            0,
            0,
            'none',
            '2026-01-16 09:00:00',
        ]);

        $response = $this->client->get('/backend/controller/recommend_api.php', [
            'interests' => 'robotics',
        ]);

        $this->assertSame(200, $response->status, $response->body);
        $json = $response->json();

        $this->assertTrue($json['ok'] ?? false);
        $this->assertSame([10], $json['directMatchedIds'] ?? []);
        $this->assertSame([10, 11, 12], $json['recommendedIds'] ?? []);
    }
}
