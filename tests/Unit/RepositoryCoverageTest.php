<?php
declare(strict_types=1);

namespace IBlog\Tests\Unit;

use IBlog\Repository\ArticleRepository;
use IBlog\Repository\SavedArticleRepository;
use IBlog\Repository\UserRepository;
use IBlog\Tests\Support\TestApplication;
use PDO;
use PHPUnit\Framework\TestCase;

final class RepositoryCoverageTest extends TestCase
{
    public static function setUpBeforeClass(): void
    {
        require_once dirname(__DIR__, 2) . '/src/Database/Database.php';
    }

    public function testArticleRepositoryCoversMissingBranchesAndAlternateSchemas(): void
    {
        $pdoNoAvatar = $this->createArticleSchema(false, false);
        $repoNoAvatar = new ArticleRepository($pdoNoAvatar);
        $publishedNoAvatar = $repoNoAvatar->findPublished();
        $this->assertSame('', $publishedNoAvatar[0]->author_avatar ?? null);
        $this->assertFalse($repoNoAvatar->update(999, ['title' => 'Missing']));

        $pdoProfileOnly = $this->createArticleSchema(true, false);
        $repoProfileOnly = new ArticleRepository($pdoProfileOnly);
        $publishedProfileOnly = $repoProfileOnly->findPublished();
        $this->assertSame('profile-avatar.png', $publishedProfileOnly[0]->author_avatar ?? null);
    }

    public function testSavedArticleRepositoryCoversAlternateSchemas(): void
    {
        $pdoNoAvatar = $this->createSavedArticleSchema(false, false);
        $repoNoAvatar = new SavedArticleRepository($pdoNoAvatar);
        $rowsNoAvatar = $repoNoAvatar->findByUser(2);
        $this->assertSame('', $rowsNoAvatar[0]['author_avatar'] ?? null);

        $pdoProfileOnly = $this->createSavedArticleSchema(true, false);
        $repoProfileOnly = new SavedArticleRepository($pdoProfileOnly);
        $rowsProfileOnly = $repoProfileOnly->findByUser(2);
        $this->assertSame('profile-avatar.png', $rowsProfileOnly[0]['author_avatar'] ?? null);
    }

    public function testUserRepositoryCoversMissingUserAndSubscriptionFallbackBranches(): void
    {
        $pdo = TestApplication::createIsolatedDatabase('user_repo_fallback');
        $pdo->exec(
            "CREATE TABLE users (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(160) NOT NULL,
                email VARCHAR(190) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                plan VARCHAR(32) NOT NULL DEFAULT 'free',
                isPremium TINYINT(1) NOT NULL DEFAULT 0,
                isAdmin TINYINT(1) NOT NULL DEFAULT 0,
                status VARCHAR(32) NOT NULL DEFAULT 'active',
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $stmt = $pdo->prepare(
            'INSERT INTO users (id, name, email, password, plan, isPremium, isAdmin, status, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            1,
            'Sample User',
            'sample@example.com',
            password_hash('StrongPass1!', PASSWORD_DEFAULT),
            'free',
            0,
            0,
            'active',
            '2026-01-01 00:00:00',
        ]);

        $repo = new UserRepository($pdo);
        $this->assertFalse($repo->update(999, ['name' => 'Missing']));
        $this->assertTrue($repo->upgradeToPremium(1, 'card', 9.0));

        $updated = $repo->findById(1);
        $this->assertIsArray($updated);
        $this->assertSame('premium', $updated['plan'] ?? null);
        $this->assertSame(1, (int) ($updated['isPremium'] ?? 0));
    }

    public function testUserRepositoryCoversAllPublicMethodsDirectly(): void
    {
        $pdo = TestApplication::createIsolatedDatabase('user_repo_full');
        $pdo->exec(
            "CREATE TABLE users (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(160) NOT NULL,
                email VARCHAR(190) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                plan VARCHAR(32) NOT NULL DEFAULT 'free',
                isPremium TINYINT(1) NOT NULL DEFAULT 0,
                isAdmin TINYINT(1) NOT NULL DEFAULT 0,
                status VARCHAR(32) NOT NULL DEFAULT 'active',
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
        $pdo->exec(
            "CREATE TABLE subscription (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                userId INT UNSIGNED NOT NULL,
                plan VARCHAR(32) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(8) NOT NULL,
                status VARCHAR(32) NOT NULL,
                method VARCHAR(32) NOT NULL,
                startedAt DATETIME NOT NULL,
                expiresAt DATETIME NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $repo = new UserRepository($pdo);

        $this->assertTrue($repo->create([
            'name' => 'Direct Coverage',
            'email' => 'direct@example.com',
            'password' => 'StrongPass1!',
            'plan' => 'free',
            'isPremium' => 0,
            'isAdmin' => 0,
        ]));
        $this->assertTrue($repo->create([
            'name' => 'Second User',
            'email' => 'second@example.com',
            'password' => 'StrongPass1!',
            'plan' => 'free',
            'isPremium' => 0,
            'isAdmin' => 0,
        ]));

        $allUsers = $repo->findAll();
        $this->assertCount(2, $allUsers);

        $matches = $repo->search('Direct');
        $this->assertCount(1, $matches);
        $this->assertSame('direct@example.com', $matches[0]['email'] ?? null);

        $user = $repo->findByEmail('direct@example.com');
        $this->assertIsArray($user);
        $userId = (int) ($user['id'] ?? 0);
        $this->assertGreaterThan(0, $userId);
        $secondUser = $repo->findByEmail('second@example.com');
        $this->assertIsArray($secondUser);
        $secondUserId = (int) ($secondUser['id'] ?? 0);
        $this->assertGreaterThan(0, $secondUserId);

        $foundById = $repo->findById($userId);
        $this->assertIsArray($foundById);
        $this->assertSame('direct@example.com', $foundById['email'] ?? null);

        $this->assertTrue($repo->update($userId, [
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
            'password' => '',
            'plan' => 'free',
            'isPremium' => 0,
            'isAdmin' => 1,
        ]));

        $updated = $repo->findById($userId);
        $this->assertIsArray($updated);
        $this->assertSame('updated@example.com', $updated['email'] ?? null);
        $this->assertSame('Updated Name', $updated['name'] ?? null);
        $this->assertSame(1, (int) ($updated['isAdmin'] ?? 0));

        $this->assertTrue($repo->upgradeToPremium($userId, 'paypal', 14.5));
        $premium = $repo->findById($userId);
        $this->assertIsArray($premium);
        $this->assertSame('premium', $premium['plan'] ?? null);
        $this->assertSame(1, (int) ($premium['isPremium'] ?? 0));

        $subscriptionCount = (int) $pdo->query('SELECT COUNT(*) FROM subscription')->fetchColumn();
        $this->assertSame(1, $subscriptionCount);

        $this->assertTrue($repo->followUser($userId, $secondUserId));
        $this->assertTrue($repo->isFollowing($userId, $secondUserId));
        $this->assertSame(['followers' => 1, 'following' => 0], $repo->getFollowStats($secondUserId));
        $this->assertSame(['followers' => 0, 'following' => 1], $repo->getFollowStats($userId));
        $this->assertSame([$secondUserId], $repo->getFollowingIds($userId));
        $this->assertTrue($repo->unfollowUser($userId, $secondUserId));
        $this->assertFalse($repo->isFollowing($userId, $secondUserId));

        $this->assertTrue($repo->delete($userId));
        $this->assertFalse($repo->findById($userId));
    }

    public function testUserRepositoryCoversPremiumExpiryOnMysql(): void
    {
        $pdo = TestApplication::createIsolatedDatabase('user_repo_mysql');
        $pdo->exec(
            "CREATE TABLE users (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(160) NOT NULL,
                email VARCHAR(190) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                plan VARCHAR(32) NOT NULL DEFAULT 'free',
                isPremium TINYINT(1) NOT NULL DEFAULT 0,
                isAdmin TINYINT(1) NOT NULL DEFAULT 0,
                status VARCHAR(32) NOT NULL DEFAULT 'active',
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
        $pdo->exec(
            "CREATE TABLE subscription (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                userId INT UNSIGNED NOT NULL,
                plan VARCHAR(32) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(8) NOT NULL,
                status VARCHAR(32) NOT NULL,
                method VARCHAR(32) NOT NULL,
                startedAt DATETIME NOT NULL,
                expiresAt DATETIME NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $repo = new UserRepository($pdo);
        $this->assertTrue($repo->create([
            'name' => 'Mysql Branch',
            'email' => 'mysql-branch@example.com',
            'password' => 'StrongPass1!',
            'plan' => 'free',
            'isPremium' => 0,
            'isAdmin' => 0,
        ]));

        $user = $repo->findByEmail('mysql-branch@example.com');
        $this->assertIsArray($user);
        $this->assertTrue($repo->upgradeToPremium((int) $user['id'], 'card', 9.0));

        $updated = $repo->findById((int) $user['id']);
        $this->assertIsArray($updated);
        $this->assertSame('premium', $updated['plan'] ?? null);
        $this->assertSame(1, (int) ($updated['isPremium'] ?? 0));
    }

    private function createArticleSchema(bool $withProfileTable, bool $withUserAvatar): PDO
    {
        $pdo = TestApplication::createIsolatedDatabase('article_repo');
        $userColumns = $withUserAvatar
            ? 'id INT UNSIGNED PRIMARY KEY, name VARCHAR(160) NOT NULL, avatar VARCHAR(255) DEFAULT ""'
            : 'id INT UNSIGNED PRIMARY KEY, name VARCHAR(160) NOT NULL';
        $pdo->exec("CREATE TABLE users ({$userColumns}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $pdo->exec(
            "CREATE TABLE article (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                userId INT UNSIGNED NOT NULL,
                title VARCHAR(255) NOT NULL,
                body LONGTEXT NOT NULL,
                category VARCHAR(120) DEFAULT '',
                tags TEXT NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'published',
                coverImage VARCHAR(255) DEFAULT '',
                readingTime VARCHAR(32) DEFAULT '1 min',
                likesCount INT NOT NULL DEFAULT 0,
                views INT NOT NULL DEFAULT 0,
                label VARCHAR(64) NOT NULL DEFAULT 'none',
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
        if ($withProfileTable) {
            $pdo->exec(
                "CREATE TABLE user_profile (
                    userId INT UNSIGNED PRIMARY KEY,
                    avatar VARCHAR(255) DEFAULT ''
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            );
            $pdo->exec("INSERT INTO user_profile (userId, avatar) VALUES (1, 'profile-avatar.png')");
        }

        if ($withUserAvatar) {
            $pdo->exec("INSERT INTO users (id, name, avatar) VALUES (1, 'Author', 'user-avatar.png')");
        } else {
            $pdo->exec("INSERT INTO users (id, name) VALUES (1, 'Author')");
        }
        $pdo->exec(
            "INSERT INTO article (userId, title, body, category, tags, status, coverImage, readingTime, likesCount, views, label, createdAt)
             VALUES (1, 'Repo Article', 'Body', 'Testing', 'repo', 'published', '', '1 min', 0, 0, 'none', '2026-01-01 00:00:00')"
        );

        return $pdo;
    }

    private function createSavedArticleSchema(bool $withProfileTable, bool $withUserAvatar): PDO
    {
        $pdo = TestApplication::createIsolatedDatabase('saved_repo');
        $userColumns = $withUserAvatar
            ? 'id INT UNSIGNED PRIMARY KEY, name VARCHAR(160) NOT NULL, avatar VARCHAR(255) DEFAULT ""'
            : 'id INT UNSIGNED PRIMARY KEY, name VARCHAR(160) NOT NULL';
        $pdo->exec("CREATE TABLE users ({$userColumns}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $pdo->exec(
            "CREATE TABLE article (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                userId INT UNSIGNED NOT NULL,
                title VARCHAR(255) NOT NULL,
                body LONGTEXT NOT NULL,
                category VARCHAR(120) DEFAULT '',
                tags TEXT NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'published',
                coverImage VARCHAR(255) DEFAULT '',
                readingTime VARCHAR(32) DEFAULT '1 min',
                likesCount INT NOT NULL DEFAULT 0,
                views INT NOT NULL DEFAULT 0,
                label VARCHAR(64) NOT NULL DEFAULT 'none',
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
        $pdo->exec(
            "CREATE TABLE savedarticle (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                userId INT UNSIGNED NOT NULL,
                articleId INT UNSIGNED NOT NULL,
                savedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
        if ($withProfileTable) {
            $pdo->exec(
                "CREATE TABLE user_profile (
                    userId INT UNSIGNED PRIMARY KEY,
                    avatar VARCHAR(255) DEFAULT ''
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            );
            $pdo->exec("INSERT INTO user_profile (userId, avatar) VALUES (1, 'profile-avatar.png')");
        }

        if ($withUserAvatar) {
            $pdo->exec("INSERT INTO users (id, name, avatar) VALUES (1, 'Author', 'user-avatar.png')");
        } else {
            $pdo->exec("INSERT INTO users (id, name) VALUES (1, 'Author')");
        }
        $pdo->exec(
            "INSERT INTO article (id, userId, title, body, category, tags, status, coverImage, readingTime, likesCount, views, label, createdAt)
             VALUES (1, 1, 'Saved Repo Article', 'Body', 'Testing', 'repo', 'published', '', '1 min', 0, 0, 'none', '2026-01-01 00:00:00')"
        );
        $pdo->exec(
            "INSERT INTO savedarticle (userId, articleId, savedAt)
             VALUES (2, 1, '2026-01-02 00:00:00')"
        );

        return $pdo;
    }
}
